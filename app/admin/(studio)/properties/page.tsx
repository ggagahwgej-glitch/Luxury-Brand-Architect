import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { getRepository } from "@/lib/data";
import { PropertiesTable } from "@/components/admin/properties-table";
import { PropertiesToolbar } from "@/components/admin/properties-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { filtersToSearchParams } from "@/lib/search-params";
import { PROPERTY_SERVICES } from "@/lib/admin-filters";

export const metadata: Metadata = { title: "Properties" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; purpose?: string; visibility?: string; page?: string }>;

export default async function AdminPropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 10;

  // The visibility filter is applied in the query, not after pagination —
  // filtering the current page produced "records" counts that ignored the
  // drafts sitting on later pages.
  const published =
    params.visibility === "published" ? true : params.visibility === "draft" ? false : undefined;

  const result = await getRepository().listProperties({
    q: params.q?.trim() || undefined,
    status: PROPERTY_SERVICES.status(params.status),
    purpose: PROPERTY_SERVICES.purpose(params.purpose),
    published,
    includeUnpublished: true,
    availabilityOnly: false,
    sort: "newest",
    page,
    pageSize,
  });

  const visible = result.items;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.58rem] uppercase tracking-[0.26em] text-gold/80">Register</p>
          <h1 className="mt-2 font-display text-3xl text-ivory">Properties</h1>
          <p className="mt-1.5 text-[0.74rem] text-silver/50">
            {result.total} {result.total === 1 ? "record" : "records"} · create, edit, publish and feature residences
          </p>
        </div>
        <Link href="/admin/properties/new" className="btn-gold btn-sm">
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Add property
        </Link>
      </header>

      <Suspense fallback={<div className="h-16 border border-white/[0.07]" aria-hidden="true" />}>
        <PropertiesToolbar />
      </Suspense>

      <PropertiesTable properties={visible} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(targetPage) => {
          const query = filtersToSearchParams({
            q: params.q ?? "",
            status: PROPERTY_SERVICES.status(params.status) ?? "",
            purpose: PROPERTY_SERVICES.purpose(params.purpose) ?? "",
            page: targetPage,
          });
          const search = new URLSearchParams(query);
          if (params.visibility) search.set("visibility", params.visibility);
          const qs = search.toString();
          return `/admin/properties${qs ? `?${qs}` : ""}`;
        }}
      />
    </div>
  );
}
