import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { getRepository } from "@/lib/data";
import { PropertyForm } from "@/components/admin/property-form";

export const metadata: Metadata = { title: "Edit Property" };
export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);

  let property;
  try {
    property = await getRepository().getPropertyById(id);
  } catch (error) {
    console.error("[studio] could not load property:", error);
    throw new Error("The property could not be loaded. Please try again.");
  }

  if (!property) notFound();

  return (
    <div className="space-y-5">
      {saved ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border border-success/30 bg-success/[0.07] px-4 py-3 text-[0.8rem] text-[#8fd4b8]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Changes saved{property.isPublished ? " and published to the website." : " as a draft."}
          </span>
          <Link
            href={`/properties/${property.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-ivory/80 transition-colors hover:text-gold"
          >
            View on website
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      <PropertyForm property={property} />
    </div>
  );
}
