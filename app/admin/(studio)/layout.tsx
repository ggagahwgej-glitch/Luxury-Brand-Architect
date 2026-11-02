import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getSiteSettings } from "@/lib/data";
import { StudioShell } from "@/components/admin/studio-shell";
import { resolveDataProvider } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Owner Studio", template: "%s · Owner Studio" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  const settings = await getSiteSettings();
  let provider: "supabase" | "local" = "supabase";
  try {
    provider = resolveDataProvider();
  } catch {
    provider = "supabase";
  }

  return (
    <StudioShell
      ownerName={session.name}
      ownerEmail={session.email}
      businessName={settings.branding.businessName}
      provider={provider}
    >
      {children}
    </StudioShell>
  );
}
