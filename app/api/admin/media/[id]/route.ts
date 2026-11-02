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
    const repository = getRepository();
    const result = await repository.deleteMedia(id);
    if (!result) return jsonError("That media item no longer exists.", 404);

    // Duplicated listings share the same stored object, so the file is only
    // removed once no remaining media row references it.
    if (result.storagePath) {
      const stillReferenced = await repository.findReferencedStoragePaths([result.storagePath]);
      if (!stillReferenced.has(result.storagePath)) await removeStoredObject(result.storagePath);
    }
    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath("/admin/media");
    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[admin/media] delete failed:", error);
    return jsonError("The media item could not be deleted right now. Please try again.", 500);
  }
}
