import { revalidatePath } from "next/cache";
import { propertyInputSchema, flattenIssues } from "@/lib/validation/property";
import { getRepository } from "@/lib/data";
import { removeStoredObject } from "@/lib/storage";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  const parsed = propertyInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("Please correct the highlighted fields.", 422, { fieldErrors: flattenIssues(parsed.error) });
  }

  try {
    const repository = getRepository();
    const existing = await repository.getPropertyById(id);
    if (!existing) return jsonError("That property no longer exists.", 404);

    const property = await repository.updateProperty(id, parsed.data);
    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath(`/properties/${existing.slug}`);
    revalidatePath(`/properties/${property.slug}`);
    return jsonOk({ property });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[admin/properties] update failed:", error);
    const duplicate = /duplicate key|unique/i.test(message);
    return jsonError(
      duplicate
        ? "A property with that web address (slug) already exists."
        : "Your changes could not be saved. Please review the form and try again.",
      duplicate ? 409 : 500,
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  try {
    const repository = getRepository();
    const existing = await repository.getPropertyById(id);
    if (!existing) return jsonError("That property no longer exists.", 404);

    // Capture stored object paths before the rows disappear, then remove the
    // database record and finally the files so nothing is orphaned.
    const storagePaths = await repository.getStoragePathsForProperty(id);
    await repository.deleteProperty(id);
    // Duplicated listings share stored objects — only delete files that no
    // surviving media row still references.
    if (storagePaths.length) {
      const stillReferenced = await repository.findReferencedStoragePaths(storagePaths);
      for (const storagePath of storagePaths) {
        if (!stillReferenced.has(storagePath)) await removeStoredObject(storagePath);
      }
    }
    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath(`/properties/${existing.slug}`);
    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[admin/properties] delete failed:", error);
    return jsonError("The property could not be deleted right now. Please try again.", 500);
  }
}
