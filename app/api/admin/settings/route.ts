import { revalidatePath } from "next/cache";
import { settingsPatchSchema } from "@/lib/validation/settings";
import { flattenIssues } from "@/lib/validation/property";
import { getRepository } from "@/lib/data";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const parsed = settingsPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("Some settings could not be saved. Please review the highlighted fields.", 422, {
      fieldErrors: flattenIssues(parsed.error),
    });
  }

  try {
    const settings = await getRepository().updateSiteSettings(parsed.data);
    revalidatePath("/", "layout");
    return jsonOk({ settings });
  } catch (error) {
    console.error("[admin/settings] save failed:", error);
    return jsonError("Settings could not be saved right now. Please try again.", 500);
  }
}
