import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Eye,
  Images,
  MailOpen,
  MessagesSquare,
  Plus,
  Settings2,
  Sparkles,
  Star,
} from "lucide-react";
import { getRepository, isPreviewProvider } from "@/lib/data";
import { getAdminSession } from "@/lib/auth/admin";
import { StatCard } from "@/components/admin/stat-card";
import { formatDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, stats, activity] = await Promise.all([
    getAdminSession(),
    getRepository().getDashboardStats(),
    getRepository().getRecentActivity(7),
  ]);

  let preview = false;
  try {
    preview = isPreviewProvider();
  } catch {
    preview = false;
  }

  const maxInquiries = Math.max(1, ...stats.inquiriesLast14Days.map((day) => day.count));
  const firstName = (session?.name ?? "Owner").split(" ")[0] ?? "Owner";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quickActions = [
    { href: "/admin/properties/new", label: "Add new property", icon: Plus, note: "Publish a new residence" },
    { href: "/admin/properties", label: "Manage properties", icon: Building2, note: `${stats.totalProperties} in the register` },
    { href: "/admin/inquiries", label: "Manage inquiries", icon: MessagesSquare, note: `${stats.unreadInquiries} unread` },
    { href: "/admin/settings", label: "Website settings", icon: Settings2, note: "Branding, hero, SEO" },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.58rem] uppercase tracking-[0.26em] text-gold/80">{greeting}</p>
          <h1 className="mt-2 font-display text-3xl text-ivory">{firstName}</h1>
          <p className="mt-1.5 flex items-center gap-2 text-[0.74rem] text-silver/50">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
            {formatDate(new Date(), { weekday: "long" })} · live figures from the database
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/properties/new" className="btn-gold btn-sm">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Add property
          </Link>
          <Link href="/" target="_blank" className="btn-dark btn-sm">
            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            View website
          </Link>
        </div>
      </header>

      {preview ? (
        <div className="flex flex-col gap-2 border border-gold/25 bg-gold/[0.05] px-4 py-3 text-[0.74rem] text-gold-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">Preview provider active.</span> Records are stored in a local development
            database. Connect Supabase and set <code className="text-ivory/80">DATA_PROVIDER=supabase</code> for production.
          </p>
          <span className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/50">Not production data</span>
        </div>
      ) : null}

      <section aria-label="Register summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total properties" value={stats.totalProperties} icon={Building2} href="/admin/properties" hint={`${stats.publishedProperties} published`} emphasis />
        <StatCard label="Available" value={stats.availableProperties} icon={Sparkles} href="/admin/properties?status=available" />
        <StatCard label="Sold" value={stats.soldProperties} icon={CircleDollarSign} href="/admin/properties?status=sold" />
        <StatCard label="Rental listings" value={stats.rentedProperties} icon={Building2} href="/admin/properties?purpose=rent" />
        <StatCard label="Featured" value={stats.featuredProperties} icon={Star} href="/admin/properties" />
        <StatCard label="Total inquiries" value={stats.totalInquiries} icon={MessagesSquare} href="/admin/inquiries" />
        <StatCard label="Unread inquiries" value={stats.unreadInquiries} icon={MailOpen} href="/admin/inquiries?status=new" emphasis={stats.unreadInquiries > 0} />
        <StatCard label="Media assets" value={stats.mediaCount} icon={Images} href="/admin/media" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section className="studio-panel p-5" aria-label="Inquiry activity">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl text-ivory">Inquiry activity</h2>
              <p className="mt-1 text-[0.68rem] text-silver/45">Last 14 days</p>
            </div>
            <span className="badge border-white/10 text-silver/60">
              {stats.inquiriesLast14Days.reduce((sum, day) => sum + day.count, 0)} received
            </span>
          </div>

          <div className="mt-6 flex h-36 items-end gap-1.5" role="img" aria-label={`Inquiry volume for the last 14 days, ${stats.inquiriesLast14Days.map((day) => `${day.date}: ${day.count}`).join(", ")}`}>
            {stats.inquiriesLast14Days.map((day) => (
              <div key={day.date} className="group relative flex-1">
                <div
                  className="w-full bg-gradient-to-t from-gold/25 to-gold/70 transition-all duration-500 hover:from-gold/40 hover:to-gold"
                  style={{ height: `${Math.max(4, (day.count / maxInquiries) * 132)}px` }}
                  title={`${formatDate(day.date)}: ${day.count}`}
                />
                <span className="mt-2 block text-center text-[0.5rem] text-silver/30">
                  {day.date.slice(8)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.66rem] text-silver/40">
            Counts update as enquiries are submitted through the public website.
          </p>
        </section>

        <section className="studio-panel p-5" aria-label="Quick actions">
          <h2 className="font-display text-xl text-ivory">Quick actions</h2>
          <div className="mt-4 space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 border border-white/[0.07] px-3.5 py-3 transition-colors hover:border-gold/30 hover:bg-white/[0.02]"
              >
                <span className="grid h-8 w-8 place-items-center border border-white/10 text-gold/70 group-hover:border-gold/30">
                  <action.icon aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.78rem] text-ivory/90">{action.label}</span>
                  <span className="block text-[0.64rem] text-silver/45">{action.note}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-silver/25 transition-colors group-hover:text-gold" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="studio-panel" aria-label="Recent activity">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="font-display text-xl text-ivory">Recent activity</h2>
          <Link href="/admin/inquiries" className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/50 transition-colors hover:text-gold">
            All inquiries
          </Link>
        </div>
        {activity.length ? (
          <ul className="divide-y divide-white/[0.06]">
            {activity.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={entry.href ?? "#"}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  <span
                    className={
                      entry.kind === "inquiry_received"
                        ? "grid h-8 w-8 shrink-0 place-items-center border border-gold/25 text-gold"
                        : "grid h-8 w-8 shrink-0 place-items-center border border-white/10 text-silver/60"
                    }
                  >
                    {entry.kind === "inquiry_received" ? (
                      <MessagesSquare aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8rem] text-ivory/90">{entry.title}</span>
                    <span className="block truncate text-[0.66rem] text-silver/45">{entry.detail}</span>
                  </span>
                  <span className="shrink-0 text-[0.62rem] text-silver/35">{timeAgo(entry.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[0.8rem] text-silver/60">No activity yet. Add your first property to begin.</p>
          </div>
        )}
      </section>
    </div>
  );
}
