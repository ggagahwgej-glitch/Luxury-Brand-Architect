import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk } from "@/lib/api";
import { storeUpload, UploadError, type UploadKind } from "@/lib/storage";
import { checkRateLimit, UPLOAD_RATE_LIMIT } from "@/lib/auth/rate-limit";
import { MAX_IMAGES_PER_PROPERTY } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Studio upload endpoint. Files are validated server-side (type + size), then
 * written to Supabase Storage (or the local preview folder). The returned URL
 * and storage path are only persisted when the property form is saved.
 */
export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const limit = checkRateLimit(`upload:${session.sub}`, UPLOAD_RATE_LIMIT.limit, UPLOAD_RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return jsonError(`Upload limit reached. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`, 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("The upload could not be read. Files must be sent as multipart/form-data.", 400);
  }

  const kindValue = String(form.get("kind") ?? "image");
  const kind: UploadKind = kindValue === "video" ? "video" : kindValue === "brand" ? "brand" : "image";
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) return jsonError("No file was received.", 400);
  if (files.length > MAX_IMAGES_PER_PROPERTY) {
    return jsonError(`Upload up to ${MAX_IMAGES_PER_PROPERTY} files at a time.`, 400);
  }

  const uploaded = [];
  for (const file of files) {
    try {
      const stored = await storeUpload(file, kind);
      uploaded.push({
        url: stored.url,
        storagePath: stored.storagePath,
        mediaType: stored.mediaType,
        size: stored.size,
        originalName: file.name,
      });
    } catch (error) {
      const message =
        error instanceof UploadError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The file could not be uploaded.";
      console.error("[upload] failed:", error);
      return jsonError(
        uploaded.length ? `${message} (${uploaded.length} file(s) uploaded before the error.)` : message,
        400,
        { fieldErrors: {} },
      );
    }
  }

  return jsonOk({ files: uploaded });
}
