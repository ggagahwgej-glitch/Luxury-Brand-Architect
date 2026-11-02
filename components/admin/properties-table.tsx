"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, Pencil, Star, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { coverImage, imageAlt } from "@/lib/presentation";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

type Action = "publish" | "feature" | "duplicate" | "delete";

export function PropertiesTable({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<{ property: Property; action: Action } | null>(null);

  async function run(property: Property, action: Action) {
    setBusy(`${property.id}:${action}`);
    setError("");
    setNotice("");
    try {
      let response: Response;
      if (action === "delete") {
        response = await fetch(`/api/admin/properties/${property.id}`, { method: "DELETE" });
      } else if (action === "duplicate") {
        response = await fetch(`/api/admin/properties/${property.id}/duplicate`, { method: "POST" });
      } else {
        response = await fetch(`/api/admin/properties/${property.id}/flags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "publish" ? { isPublished: !property.isPublished } : { isFeatured: !property.isFeatured },
          ),
        });
      }

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "That action could not be completed.");
        return;
      }

      setNotice(
        action === "delete"
          ? "Property deleted."
          : action === "duplicate"
            ? "Property duplicated as a draft."
            : action === "publish"
              ? property.isPublished
                ? "Property unpublished — it is now hidden from the website."
                : "Property published to the website."
              : property.isFeatured
                ? "Removed from the signature collection."
                : "Added to the signature collection.",
      );
      setTarget(null);
      router.refresh();
    } catch {
      setError("The server could not be reached. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!properties.length) {
    return (
      <div className="studio-panel px-6 py-14 text-center">
        <p className="font-display text-2xl text-ivory">No properties match this view</p>
        <p className="mx-auto mt-3 max-w-sm text-[0.8rem] leading-relaxed text-silver/55">
          Adjust the filters, or add a new residence to the register.
        </p>
        <Link href="/admin/properties/new" className="btn-gold btn-sm mt-6">
          Add property
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div role="alert" className="border border-danger/30 bg-danger/[0.07] px-4 py-3 text-[0.78rem] text-[#e6a3a3]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="border border-success/30 bg-success/[0.07] px-4 py-2.5 text-[0.76rem] text-[#8fd4b8]">
          {notice}
        </div>
      ) : null}

      <div className="studio-panel hidden overflow-x-auto md:block">
        <table className="studio-table w-full">
          <thead className="bg-white/[0.02]">
            <tr>
              <th scope="col">Residence</th>
              <th scope="col">Type</th>
              <th scope="col">Price</th>
              <th scope="col">Status</th>
              <th scope="col">Visibility</th>
              <th scope="col">Updated</th>
              <th scope="col" className="text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => {
              const cover = coverImage(property);
              const rowBusy = busy?.startsWith(property.id);
              return (
                <tr key={property.id} className={cn(rowBusy && "opacity-60")}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-14 shrink-0 overflow-hidden border border-white/10 bg-charcoal">
                        {cover ? (
                          <Image src={cover.url} alt={imageAlt(cover, property)} fill sizes="56px" className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[0.5rem] text-silver/40">No image</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/properties/${property.id}/edit`}
                          className="block truncate text-[0.82rem] text-ivory hover:text-gold"
                        >
                          {property.title}
                        </Link>
                        <p className="truncate text-[0.64rem] text-silver/40">
                          {property.location} · {property.media.length} media
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-[0.72rem] text-silver/70">
                    {PROPERTY_TYPE_LABELS[property.propertyType]}
                    <span className="ml-1 text-silver/35">· {property.purpose === "sale" ? "Sale" : "Rent"}</span>
                  </td>
                  <td className="whitespace-nowrap font-display text-[0.9rem] text-ivory/90">
                    {formatCurrency(property.price, property.currency)}
                  </td>
                  <td>
                    <StatusBadge status={property.status} />
                  </td>
                  <td>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[0.66rem]",
                        property.isPublished ? "text-[#8fd4b8]" : "text-silver/45",
                      )}
                    >
                      {property.isPublished ? <Eye aria-hidden="true" className="h-3 w-3" /> : <EyeOff aria-hidden="true" className="h-3 w-3" />}
                      {property.isPublished ? "Published" : "Draft"}
                      {property.isFeatured ? (
                        <Star aria-hidden="true" className="ml-1 h-3 w-3 fill-gold/60 text-gold/70" />
                      ) : null}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[0.68rem] text-silver/45">{formatDate(property.updatedAt)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <IconAction
                        label={property.isPublished ? "Unpublish" : "Publish"}
                        onClick={() => run(property, "publish")}
                        disabled={Boolean(rowBusy)}
                        icon={property.isPublished ? EyeOff : Eye}
                      />
                      <IconAction
                        label={property.isFeatured ? "Unfeature" : "Feature"}
                        onClick={() => run(property, "feature")}
                        disabled={Boolean(rowBusy)}
                        icon={Star}
                        active={property.isFeatured}
                      />
                      <IconAction
                        label="Duplicate"
                        onClick={() => run(property, "duplicate")}
                        disabled={Boolean(rowBusy)}
                        icon={Copy}
                      />
                      <Link
                        href={`/admin/properties/${property.id}/edit`}
                        aria-label={`Edit ${property.title}`}
                        className="grid h-8 w-8 place-items-center border border-white/10 text-silver/60 transition-colors hover:border-gold/40 hover:text-gold"
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                      <IconAction
                        label="Delete"
                        onClick={() => setTarget({ property, action: "delete" })}
                        disabled={Boolean(rowBusy)}
                        icon={Trash2}
                        danger
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {properties.map((property) => {
          const cover = coverImage(property);
          return (
            <div key={property.id} className="studio-panel p-4">
              <div className="flex gap-3">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden border border-white/10 bg-charcoal">
                  {cover ? <Image src={cover.url} alt={imageAlt(cover, property)} fill sizes="80px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/properties/${property.id}/edit`} className="block truncate text-[0.84rem] text-ivory">
                    {property.title}
                  </Link>
                  <p className="truncate text-[0.66rem] text-silver/45">{property.location}</p>
                  <p className="mt-1 font-display text-[0.9rem] text-ivory/85">{formatCurrency(property.price, property.currency)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={property.status} />
                <span className={cn("badge border-white/10", property.isPublished ? "text-[#8fd4b8]" : "text-silver/50")}>
                  {property.isPublished ? "Published" : "Draft"}
                </span>
                {property.isFeatured ? <span className="badge border-gold/40 text-gold">Signature</span> : null}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <IconAction label={property.isPublished ? "Unpublish" : "Publish"} onClick={() => run(property, "publish")} disabled={Boolean(busy?.startsWith(property.id))} icon={property.isPublished ? EyeOff : Eye} full />
                <IconAction label="Feature" onClick={() => run(property, "feature")} disabled={Boolean(busy?.startsWith(property.id))} icon={Star} full active={property.isFeatured} />
                <IconAction label="Duplicate" onClick={() => run(property, "duplicate")} disabled={Boolean(busy?.startsWith(property.id))} icon={Copy} full />
                <IconAction label="Delete" onClick={() => setTarget({ property, action: "delete" })} disabled={Boolean(busy?.startsWith(property.id))} icon={Trash2} full danger />
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.action === "delete" ? "Delete this property?" : "Confirm action"}
        description={
          target?.action === "delete"
            ? `“${target.property.title}” and its media will be permanently removed from the database, and its uploaded images will be deleted from storage. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        pending={Boolean(busy?.endsWith("delete"))}
        onConfirm={() => target && run(target.property, target.action)}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  icon: Icon,
  danger = false,
  active = false,
  full = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: typeof Eye;
  danger?: boolean;
  active?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-8 place-items-center border border-white/10 transition-colors disabled:opacity-40",
        full ? "w-full" : "w-8",
        danger
          ? "text-silver/60 hover:border-danger/40 hover:text-danger"
          : active
            ? "text-gold/80 hover:border-gold/40 hover:text-gold"
            : "text-silver/60 hover:border-gold/40 hover:text-gold",
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}
