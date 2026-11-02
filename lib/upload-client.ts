"use client";

import { MAX_PROXY_UPLOAD_BYTES } from "@/lib/constants";

/**
 * Browser upload helper.
 *
 * Production (Supabase): the API returns a signed Storage URL and the file is
 * PUT straight from the browser, so large photos and videos never pass through
 * a Vercel function (which caps request bodies at ~4.5 MB).
 *
 * Local preview: the API answers `strategy: "proxy"` and the file is posted to
 * the app's own upload route, which writes it to `.data/uploads`.
 *
 * If the direct PUT fails (CORS misconfiguration, expired token) the helper
 * falls back to the proxy route for files that fit within its limit, so an
 * upload never dies silently.
 */

export type UploadKind = "image" | "video" | "brand";

export interface UploadedFile {
  url: string;
  storagePath: string | null;
  mediaType: "image" | "video";
}

interface UploadPlan {
  ok?: boolean;
  strategy?: "direct" | "proxy";
  error?: string;
  maxBytes?: number;
  upload?: {
    signedUrl: string;
    token: string;
    storagePath: string;
    publicUrl: string;
    mediaType: "image" | "video";
    contentType: string;
  };
}

function postJson(url: string, body: unknown): Promise<{ status: number; payload: UploadPlan }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      let payload: UploadPlan = {};
      try {
        payload = JSON.parse(xhr.responseText) as UploadPlan;
      } catch {
        payload = { ok: false, error: "The server returned an unexpected response." };
      }
      resolve({ status: xhr.status, payload });
    };
    xhr.onerror = () => reject(new Error("The upload could not reach the server."));
    xhr.send(JSON.stringify(body));
  });
}

function proxyUpload(file: File, kind: UploadKind, onProgress: (percent: number) => void): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("kind", kind);
    body.append("files", file);

    xhr.open("POST", "/api/admin/media/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          ok?: boolean;
          error?: string;
          files?: UploadedFile[];
        };
        if (xhr.status >= 200 && xhr.status < 300 && payload.ok && payload.files?.[0]) {
          resolve(payload.files[0]);
          return;
        }
        reject(new Error(payload.error ?? "The upload failed."));
      } catch {
        reject(new Error("The upload returned an unexpected response."));
      }
    };
    xhr.onerror = () => reject(new Error("The upload could not reach the server."));
    xhr.send(body);
  });
}

function putToSignedUrl(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage rejected the file (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("The file could not be sent to storage. Check the bucket's CORS policy."));
    xhr.send(file);
  });
}

class UploadFailure extends Error {}

export async function uploadFile(
  file: File,
  kind: UploadKind,
  onProgress: (percent: number) => void = () => undefined,
): Promise<UploadedFile> {
  let plan: UploadPlan = {};

  try {
    const response = await postJson("/api/admin/media/upload-url", {
      name: file.name,
      type: file.type,
      size: file.size,
      kind,
    });

    // Hard failures the owner must see (auth, rate limit, invalid file).
    if ([400, 401, 403, 413, 422, 429].includes(response.status)) {
      throw new UploadFailure(response.payload.error ?? "The upload was rejected.");
    }

    plan = response.payload;
  } catch (error) {
    if (error instanceof UploadFailure) throw error;
    // Signing is unavailable (local preview or transient error) — use the proxy.
    plan = { strategy: "proxy" };
  }

  if (plan.strategy === "direct" && plan.upload) {
    try {
      await putToSignedUrl(plan.upload.signedUrl, file, plan.upload.contentType || file.type, onProgress);
      return {
        url: plan.upload.publicUrl,
        storagePath: plan.upload.storagePath,
        mediaType: plan.upload.mediaType,
      };
    } catch (error) {
      // Fall back to the proxy only when the file fits within its limit.
      if (file.size > MAX_PROXY_UPLOAD_BYTES) throw error;
    }
  }

  if (file.size > MAX_PROXY_UPLOAD_BYTES) {
    throw new Error(
      `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB; this deployment can only stream files up to ${Math.floor(
        MAX_PROXY_UPLOAD_BYTES / (1024 * 1024),
      )} MB through the server. Connect Supabase Storage to upload larger files.`,
    );
  }

  return proxyUpload(file, kind, onProgress);
}
