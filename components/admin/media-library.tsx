"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, ImageIcon, Images, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { formatDate } from "@/lib/format";
import type { MediaLibraryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MediaLibrary({ items }: { items: MediaLibraryItem[] }) {
  const router = useRouter();
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [target, setTarget] = useState<MediaLibraryItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const properties = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.propertyId, item.propertyTitle);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const filtered = items.filter((item) => {
    if (propertyFilter !== "all" && item.propertyId !== propertyFilter) return false;
    if (typeFilter !== "all" && item.mediaType !== typeFilter) return false;
    return true;
  });

  const imageCount = items.filter((item) => item.mediaType === "image").length;
  const videoCount = items.filter((item) => item.mediaType === "video").length;

  async function remove() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/media/${target.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "The media item could not be deleted.");
        return;
      }
      setTarget(null);
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-white/[0.07] bg-[#0d1017] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "image", "video"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={cn(
                "tabs-pill border border-white/10",
                typeFilter === value ? "bg-gold text-imperial" : "text-silver hover:text-ivory",
              )}
            >
              {value === "all" ? `All (${items.length})` : value === "image" ? `Images (${imageCount})` : `Videos (${videoCount})`}
            </button>
          ))}
        </div>
        <select
          value={propertyFilter}
          onChange={(event) => setPropertyFilter(event.target.value)}
          aria-label="Filter by property"
          className="border border-white/10 bg-imperial/60 px-3 py-2 text-[0.74rem] text-ivory focus:border-gold/50 focus:outline-none"
        >
          <option value="all">All properties</option>
          {properties.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div role="alert" className="border border-danger/30 bg-danger/[0.07] px-4 py-3 text-[0.78rem] text-[#e6a3a3]">
          {error}
        </div>
      ) : null}

      {filtered.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <li key={item.id} className="group border border-white/[0.07] bg-[#0d1017]">
              <div className="relative aspect-[4/3] overflow-hidden bg-charcoal">
                {item.mediaType === "image" ? (
                  <Image src={item.url} alt={item.alt ?? item.propertyTitle} fill sizes="(min-width: 1280px) 22vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                )}
                <div className="absolute left-2 top-2 flex gap-1">
                  {item.isCover ? (
                    <span className="badge border-gold/50 bg-imperial/80 text-gold-soft backdrop-blur">Cover</span>
                  ) : null}
                  <span className="badge border-white/15 bg-imperial/70 text-ivory/70 backdrop-blur">
                    {item.mediaType === "image" ? (
                      <ImageIcon aria-hidden="true" className="h-2.5 w-2.5" />
                    ) : (
                      <Film aria-hidden="true" className="h-2.5 w-2.5" />
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTarget(item)}
                  aria-label={`Delete media for ${item.propertyTitle}`}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center border border-white/20 bg-imperial/80 text-ivory opacity-0 transition-all hover:border-danger hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-2.5">
                <Link
                  href={`/admin/properties/${item.propertyId}/edit`}
                  className="block truncate text-[0.72rem] text-ivory/85 hover:text-gold"
                >
                  {item.propertyTitle}
                </Link>
                <p className="mt-0.5 text-[0.6rem] text-silver/35">{formatDate(item.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="studio-panel flex flex-col items-center px-6 py-14 text-center">
          <Images aria-hidden="true" className="h-7 w-7 text-gold/40" />
          <p className="mt-4 font-display text-xl text-ivory">No media in this view</p>
          <p className="mt-2 max-w-sm text-[0.78rem] leading-relaxed text-silver/45">
            Upload imagery from a property&apos;s edit screen. All uploaded files appear here with their parent listing.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title="Delete this media file?"
        description={
          target
            ? `This removes the ${target.mediaType} from “${target.propertyTitle}” and deletes the stored file. If it was the cover, the next image becomes the cover.`
            : ""
        }
        confirmLabel="Delete file"
        pending={busy}
        onConfirm={remove}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
