import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/data/local/store";
import { resolveDataProvider } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".svg": "image/svg+xml",
};

/**
 * Serves uploads created by the development preview provider.
 * In Supabase mode media is served directly from Supabase Storage and this
 * route returns 404.
 */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (resolveDataProvider() !== "local") return new NextResponse("Not found", { status: 404 });

  const { path: segments } = await context.params;
  const requested = segments.join("/");
  // Path-traversal guard: only a single flat filename inside the uploads folder.
  if (!requested || requested.includes("..") || requested.includes("/") || requested.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(uploadsDir(), path.basename(requested));
  try {
    const file = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
