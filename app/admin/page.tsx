import { redirect } from "next/navigation";

/** /admin is the discreet entry point — middleware sends visitors to login. */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
