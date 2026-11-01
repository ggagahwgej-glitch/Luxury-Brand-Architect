import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";
import { INQUIRY_STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({ status: z.enum(INQUIRY_STATUSES) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Unknown inquiry status.", 422);

  try {
    const repository = getRepository();
    const inquiry = await repository.getInquiry(id);
    if (!inquiry) return jsonError("That inquiry no longer exists.", 404);
    await repository.updateInquiryStatus(id, parsed.data.status);
    revalidatePath("/admin/inquiries");
    revalidatePath("/admin/dashboard");
    return jsonOk({ status: parsed.data.status });
  } catch (error) {
    console.error("[admin/inquiries] update failed:", error);
    return jsonError("The inquiry could not be updated right now. Please try again.", 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const { id } = await context.params;
  try {
    const repository = getRepository();
    const inquiry = await repository.getInquiry(id);
    if (!inquiry) return jsonError("That inquiry no longer exists.", 404);
    await repository.deleteInquiry(id);
    revalidatePath("/admin/inquiries");
    revalidatePath("/admin/dashboard");
    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[admin/inquiries] delete failed:", error);
    return jsonError("The inquiry could not be deleted right now. Please try again.", 500);
  }
}
