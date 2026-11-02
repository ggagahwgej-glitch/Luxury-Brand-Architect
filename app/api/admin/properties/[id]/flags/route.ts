import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || (parsed.data.isPublished === undefined && parsed.data.isFeatured === undefined)) {
    return jsonError("Nothing to update.", 422);
  }

  try {
    const repository = getRepository();
    const property = await repository.getPropertyById(id);
    if (!property) return jsonError("That property no longer exists.", 404);

    if (parsed.data.isPublished !== undefined) {
      if (parsed.data.isPublished && !property.media.some((m) => m.mediaType === "image")) {
        return jsonError("Add at least one image before publishing this property.", 422);
      }
      await repository.setPublished(id, parsed.data.isPublished);
    }
    if (parsed.data.isFeatured !== undefined) {
      await repository.setFeatured(id, parsed.data.isFeatured);
    }

    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath(`/properties/${property.slug}`);
    revalidatePath("/admin/properties");
    revalidatePath("/admin/dashboard");
    return jsonOk({ updated: true });
  } catch (error) {
    console.error("[admin/properties] flag update failed:", error);
    return jsonError(error instanceof Error ? error.message : "The listing could not be updated.", 500);
  }
}
