import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { OwnerLoginForm } from "@/components/admin/login-form";
import { getSiteSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Owner Sign In",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, settings] = await Promise.all([searchParams, getSiteSettings()]);
  const nextPath = next && next.startsWith("/admin") ? next : "/admin/dashboard";

  return (
    <main id="main-content" className="relative grid min-h-dvh bg-imperial lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/seed/hero-residence.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(8,9,13,0.85),rgba(16,24,39,0.55)_45%,rgba(8,9,13,0.95))]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <BrandMark businessName={settings.branding.businessName} tagline={settings.branding.tagline} size="md" />
          <div className="max-w-md">
            <p className="eyebrow mb-5">Owner Studio</p>
            <h1 className="text-display-md text-ivory">
              The private control room behind every <span className="italic text-gold-soft">residence</span>.
            </h1>
            <p className="mt-5 text-[0.88rem] leading-relaxed text-silver/70">
              Manage listings, media, enquiries and the public site — from any device, securely.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-[0.62rem] uppercase tracking-[0.18em] text-silver/45">
              <span>Server-verified access</span>
              <span>Encrypted 12-digit code</span>
              <span>Session expiry · 8 hours</span>
              <span>Attempt logging</span>
            </div>
          </div>
          <p className="text-[0.6rem] uppercase tracking-[0.22em] text-silver/30">
            Authorised personnel only
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_400px_at_80%_0%,rgba(198,164,90,0.08),transparent_70%)]" />
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <BrandMark businessName={settings.branding.businessName} tagline={settings.branding.tagline} size="sm" />
          </div>

          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center border border-gold/30 text-gold">
              <LockKeyhole aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.58rem] uppercase tracking-[0.24em] text-gold/80">Restricted area</p>
              <h2 className="font-display text-2xl text-ivory">Owner sign in</h2>
            </div>
          </div>

          <OwnerLoginForm nextPath={nextPath} />

          <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[0.7rem] text-silver/50">
            <p>
              Lost your access code? The 12-digit code can only be reset by a developer with database access — it is
              stored as a bcrypt hash and cannot be recovered.
            </p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-silver/70 transition-colors hover:text-gold">
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Return to website
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
