import { revalidatePath } from "next/cache";
import { propertyInputSchema, flattenIssues } from "@/lib/validation/property";
import { getRepository } from "@/lib/data";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const parsed = propertyInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("Please correct the highlighted fields.", 422, { fieldErrors: flattenIssues(parsed.error) });
  }

  try {
    const property = await getRepository().createProperty(parsed.data);
    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath(`/properties/${property.slug}`);
    return jsonOk({ property });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The property could not be saved.";
    console.error("[admin/properties] create failed:", error);
    const duplicate = /duplicate key|unique/i.test(message);
    return jsonError(duplicate ? "A property with that web address (slug) already exists." : message, 500);
  }
}
