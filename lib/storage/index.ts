import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveDataProvider, supabaseBucket } from "@/lib/env";
import { getServiceClient } from "@/lib/data/supabase/client";
import { ensureDataDir, uploadsDir } from "@/lib/data/local/store";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/constants";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export type UploadKind = "image" | "video" | "brand";

export interface StoredObject {
  url: string;
  storagePath: string | null;
  mediaType: "image" | "video";
  size: number;
  contentType: string;
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function safeBaseName(name: string) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "asset";
}

export interface UploadTarget {
  name: string;
  type: string;
  size: number;
}

export function validateUpload(file: { type: string; size: number }, kind: UploadKind) {
  const isImage = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);
  const isVideo = (ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type);

  if (kind === "video") {
    if (!isVideo) throw new UploadError("Unsupported video format. Use MP4, WebM or MOV.");
    if (file.size > MAX_VIDEO_BYTES) throw new UploadError("Video exceeds the 64 MB limit.");
    return "video" as const;
  }

  if (kind === "image" || kind === "brand") {
    if (!isImage) throw new UploadError("Unsupported image format. Use JPG, PNG, WebP or AVIF.");
    if (kind === "image" && file.size > MAX_IMAGE_BYTES) throw new UploadError("Image exceeds the 8 MB limit.");
    if (kind === "brand" && file.size > 2 * 1024 * 1024) throw new UploadError("Brand assets must be under 2 MB.");
    return "image" as const;
  }

  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) throw new UploadError("Video exceeds the 64 MB limit.");
    return "video" as const;
  }
  if (isImage) {
    if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Image exceeds the 8 MB limit.");
    return "image" as const;
  }
  throw new UploadError("Unsupported file type.");
}

function buildObjectName(target: UploadTarget, kind: UploadKind) {
  const mediaType = validateUpload(target, kind);
  const extension = EXTENSIONS[target.type] ?? (mediaType === "image" ? "jpg" : "mp4");
  const fileName = `${Date.now()}-${safeBaseName(target.name)}-${randomUUID().slice(0, 8)}.${extension}`;
  const folder = kind === "brand" ? "brand" : "properties";
  return {
    mediaType,
    fileName,
    storagePath: `${folder}/${new Date().getUTCFullYear()}/${fileName}`,
  };
}

export interface SignedUpload {
  strategy: "direct";
  /** URL the browser PUTs the file to. */
  signedUrl: string;
  token: string;
  /** Path inside the bucket — stored on the media row for later deletion. */
  storagePath: string;
  /** Public URL to save once the upload completes. */
  publicUrl: string;
  mediaType: "image" | "video";
  contentType: string;
}

/**
 * Creates a Supabase signed upload URL so the browser can send large files
 * (videos, high-resolution photography) directly to Storage. Streaming them
 * through a Vercel function would hit the platform's ~4.5 MB body limit.
 *
 * Returns null for the local preview provider, whose uploads go through the
 * app's own route instead.
 */
export async function createSignedUpload(target: UploadTarget, kind: UploadKind = "image"): Promise<SignedUpload | null> {
  const { mediaType, storagePath } = buildObjectName(target, kind);
  if (resolveDataProvider() === "local") return null;

  const admin = getServiceClient();
  const { data, error } = await admin.storage.from(supabaseBucket).createSignedUploadUrl(storagePath, {
    upsert: false,
  });
  if (error || !data?.signedUrl) {
    throw new UploadError(`Could not prepare the upload: ${error?.message ?? "no signed URL returned"}`);
  }

  const { data: urlData } = admin.storage.from(supabaseBucket).getPublicUrl(data.path ?? storagePath);
  if (!urlData?.publicUrl) {
    throw new UploadError("Upload URL created but no public URL was returned. Check the bucket's public access setting.");
  }

  return {
    strategy: "direct",
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath: data.path ?? storagePath,
    publicUrl: urlData.publicUrl,
    mediaType,
    contentType: target.type,
  };
}

/**
 * Persists an uploaded file either to Supabase Storage (production) or to the
 * local preview uploads folder (development). Returns the public URL plus the
 * storage path so records can be cleaned up later.
 */
export async function storeUpload(file: File, kind: UploadKind = "image"): Promise<StoredObject> {
  const { mediaType, fileName, storagePath } = buildObjectName(file, kind);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (resolveDataProvider() === "local") {
    await ensureDataDir();
    await fs.writeFile(path.join(uploadsDir(), fileName), buffer);
    return {
      url: `/api/media/${fileName}`,
      storagePath: fileName,
      mediaType,
      size: buffer.byteLength,
      contentType: file.type,
    };
  }

  const admin = getServiceClient();
  const { error } = await admin.storage.from(supabaseBucket).upload(storagePath, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    throw new UploadError(`Upload failed: ${error.message}`);
  }

  const { data } = admin.storage.from(supabaseBucket).getPublicUrl(storagePath);
  if (!data?.publicUrl) {
    throw new UploadError("Upload succeeded but no public URL was returned. Check the bucket's public access setting.");
  }

  return {
    url: data.publicUrl,
    storagePath,
    mediaType,
    size: buffer.byteLength,
    contentType: file.type,
  };
}

export async function removeStoredObject(storagePath: string | null | undefined) {
  if (!storagePath) return;
  if (resolveDataProvider() === "local") {
    const safe = path.basename(storagePath);
    await fs.rm(path.join(uploadsDir(), safe), { force: true });
    return;
  }
  const admin = getServiceClient();
  const { error } = await admin.storage.from(supabaseBucket).remove([storagePath]);
  if (error) console.error("[storage] could not remove object", storagePath, error.message);
}
