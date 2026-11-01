import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { removeStoredObject } from "@/lib/storage";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  try {
    const result = await getRepository().deleteMedia(id);
    if (!result) return jsonError("That media item no longer exists.", 404);
    await removeStoredObject(result.storagePath);
    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath("/admin/media");
    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[admin/media] delete failed:", error);
    return jsonError(error instanceof Error ? error.message : "The media item could not be deleted.", 500);
  }
}
