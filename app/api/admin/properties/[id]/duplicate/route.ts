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
    return jsonError(error instanceof Error ? error.message : "The property could not be duplicated.", 500);
  }
}
