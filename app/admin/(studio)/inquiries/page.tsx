import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Building2, Clock, ExternalLink, Mail, MessageCircle, Phone, User } from "lucide-react";
import { getRepository, getSiteSettings } from "@/lib/data";
import { InquiryActions } from "@/components/admin/inquiry-actions";
import { InquiryFilters } from "@/components/admin/inquiry-filters";
import { Pagination } from "@/components/ui/pagination";
import { INQUIRY_INTENT_LABELS, INQUIRY_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, telLink, timeAgo, whatsappLink } from "@/lib/format";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inquiries" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; focus?: string }>;

export default async function AdminInquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const status = params.status && (INQUIRY_STATUSES as readonly string[]).includes(params.status)
    ? (params.status as InquiryStatus)
    : undefined;

  const repository = getRepository();
  const [result, settings, unread] = await Promise.all([
    repository.listInquiries({ q: params.q?.trim() || undefined, status, page, pageSize: 8 }),
    getSiteSettings(),
    repository.getDashboardStats(),
  ]);

  const selected = params.focus
    ? await repository.getInquiry(params.focus)
    : result.items[0] ?? null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.58rem] uppercase tracking-[0.26em] text-gold/80">Client Enquiries</p>
          <h1 className="mt-2 font-display text-3xl text-ivory">Inquiries</h1>
          <p className="mt-1.5 text-[0.74rem] text-silver/50">
            {result.total} in this view · {unread.unreadInquiries} unread across the register
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <Suspense fallback={<div className="h-28 border border-white/[0.07]" aria-hidden="true" />}>
            <InquiryFilters />
          </Suspense>

          <ul className="divide-y divide-white/[0.06] border border-white/[0.07] bg-[#0d1017]">
            {result.items.length ? (
              result.items.map((inquiry) => {
                const active = selected?.id === inquiry.id;
                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/admin/inquiries?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(status ? { status } : {}), ...(page > 1 ? { page: String(page) } : {}), focus: inquiry.id }).toString()}`}
                      className={cn(
                        "block px-4 py-3.5 transition-colors",
                        active ? "bg-gold/[0.06] shadow-[inset_2px_0_0_rgb(var(--accent))]" : "hover:bg-white/[0.02]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={cn("truncate text-[0.82rem]", inquiry.status === "new" ? "text-ivory" : "text-ivory/80")}>
                            {inquiry.name}
                            {inquiry.status === "new" ? (
                              <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" aria-label="Unread" />
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-[0.68rem] text-silver/45">
                            {inquiry.propertyTitle ?? "General enquiry"}
                          </p>
                        </div>
                        <span className="shrink-0 text-[0.6rem] text-silver/35">{timeAgo(inquiry.createdAt)}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[0.72rem] leading-relaxed text-silver/55">{inquiry.message}</p>
                      <span className="mt-2 inline-block text-[0.58rem] uppercase tracking-[0.14em] text-gold/60">
                        {INQUIRY_STATUS_LABELS[inquiry.status]}
                      </span>
                    </Link>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-12 text-center">
                <p className="text-[0.82rem] text-silver/55">No enquiries match this view.</p>
              </li>
            )}
          </ul>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={(targetPage) => {
              const query = new URLSearchParams();
              if (params.q) query.set("q", params.q);
              if (status) query.set("status", status);
              if (targetPage > 1) query.set("page", String(targetPage));
              return `/admin/inquiries${query.size ? `?${query.toString()}` : ""}`;
            }}
          />
        </div>

        <div className="border border-white/[0.07] bg-[#0d1017]">
          {selected ? (
            <article>
              <header className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.56rem] uppercase tracking-[0.22em] text-gold/70">
                      {INQUIRY_INTENT_LABELS[selected.intent]}
                    </p>
                    <h2 className="mt-1.5 font-display text-2xl text-ivory">{selected.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-silver/40">
                      <Clock aria-hidden="true" className="h-3 w-3" />
                      {formatDateTime(selected.createdAt)} · updated {timeAgo(selected.updatedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "badge",
                      selected.status === "new"
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-white/12 text-silver/60",
                    )}
                  >
                    {INQUIRY_STATUS_LABELS[selected.status]}
                  </span>
                </div>
              </header>

              <div className="grid gap-5 px-5 py-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={telLink(selected.phone) ?? "#"}
                    className="flex items-center gap-2.5 border border-white/10 px-3 py-2.5 text-[0.78rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    <Phone aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" />
                    <span className="truncate">{selected.phone}</span>
                  </a>
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center gap-2.5 border border-white/10 px-3 py-2.5 text-[0.78rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    <Mail aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" />
                    <span className="truncate">{selected.email}</span>
                  </a>
                  {whatsappLink(selected.phone, `Hello ${selected.name.split(" ")[0]}, thank you for your enquiry with ${settings.branding.businessName}.`) ? (
                    <a
                      href={whatsappLink(selected.phone, `Hello ${selected.name.split(" ")[0]}, thank you for your enquiry with ${settings.branding.businessName}.`)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 border border-white/10 px-3 py-2.5 text-[0.78rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      <MessageCircle aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" />
                      WhatsApp reply
                    </a>
                  ) : null}
                  {selected.propertyId ? (
                    <Link
                      href={`/admin/properties/${selected.propertyId}/edit`}
                      className="flex items-center gap-2.5 border border-white/10 px-3 py-2.5 text-[0.78rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      <Building2 aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" />
                      <span className="truncate">{selected.propertyTitle ?? "Property"}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2.5 border border-white/10 px-3 py-2.5 text-[0.78rem] text-silver/50">
                      <User aria-hidden="true" className="h-3.5 w-3.5 text-gold/50" />
                      General enquiry
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[0.56rem] uppercase tracking-[0.2em] text-silver/40">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-[0.84rem] leading-relaxed text-ivory/85">
                    {selected.message}
                  </p>
                </div>

                <div className="border-t border-white/[0.07] pt-4">
                  <InquiryActions id={selected.id} status={selected.status} />
                </div>

                {selected.propertyId ? (
                  <Link
                    href={`/properties`}
                    className="inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-silver/45 transition-colors hover:text-gold"
                  >
                    <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    Enquiries are linked to the public listing record
                  </Link>
                ) : null}
              </div>
            </article>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-14 text-center">
              <MessageCircle aria-hidden="true" className="h-7 w-7 text-gold/40" />
              <p className="mt-4 font-display text-xl text-ivory">Select an enquiry</p>
              <p className="mt-2 max-w-xs text-[0.76rem] leading-relaxed text-silver/45">
                Enquiries submitted through the website appear here with the client&apos;s contact details and the
                property they enquired about.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
