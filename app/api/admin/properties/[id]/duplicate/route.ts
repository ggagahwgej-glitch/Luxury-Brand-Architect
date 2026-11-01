import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  try {
    const copy = await getRepository().duplicateProperty(id);
    revalidatePath("/admin/properties");
    return jsonOk({ property: copy });
  } catch (error) {
    console.error("[admin/properties] duplicate failed:", error);
    const message = error instanceof Error ? error.message : "";
    return jsonError(
      /not found/i.test(message)
        ? "That property no longer exists."
        : "The property could not be duplicated right now. Please try again.",
      /not found/i.test(message) ? 404 : 500,
    );
  }
}
