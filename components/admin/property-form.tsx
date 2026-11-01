"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  GripVertical,
  ImagePlus,
  Loader2,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  AMENITY_SUGGESTIONS,
  AREA_UNIT_LABELS,
  FEATURE_SUGGESTIONS,
  MAX_IMAGES_PER_PROPERTY,
  PROPERTY_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";
import { AREA_UNITS, PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/types";
import type { AreaUnit, Property, PropertyStatus, PropertyType, Purpose } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MediaItem {
  key: string;
  url: string;
  storagePath: string | null;
  mediaType: "image" | "video";
  alt: string;
  isCover: boolean;
}

interface FormState {
  title: string;
  slug: string;
  description: string;
  propertyType: PropertyType;
  purpose: Purpose;
  price: string;
  currency: string;
  location: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  builtUpArea: string;
  carpetArea: string;
  plotArea: string;
  areaUnit: AreaUnit;
  amenities: string[];
  features: string[];
  status: PropertyStatus;
  isFeatured: boolean;
  isPublished: boolean;
  latitude: string;
  longitude: string;
  media: MediaItem[];
}

function initialState(property?: Property): FormState {
  return {
    title: property?.title ?? "",
    slug: property?.slug ?? "",
    description: property?.description ?? "",
    propertyType: property?.propertyType ?? "villa",
    purpose: property?.purpose ?? "sale",
    price: property ? String(property.price) : "",
    currency: property?.currency ?? "INR",
    location: property?.location ?? "",
    address: property?.address ?? "",
    bedrooms: property?.bedrooms !== null && property?.bedrooms !== undefined ? String(property.bedrooms) : "",
    bathrooms: property?.bathrooms !== null && property?.bathrooms !== undefined ? String(property.bathrooms) : "",
    balconies: property?.balconies !== null && property?.balconies !== undefined ? String(property.balconies) : "",
    builtUpArea: property?.builtUpArea ? String(property.builtUpArea) : "",
    carpetArea: property?.carpetArea ? String(property.carpetArea) : "",
    plotArea: property?.plotArea ? String(property.plotArea) : "",
    areaUnit: property?.areaUnit ?? "sqft",
    amenities: property?.amenities ?? [],
    features: property?.features ?? [],
    status: property?.status ?? "available",
    isFeatured: property?.isFeatured ?? false,
    isPublished: property?.isPublished ?? false,
    latitude: property?.latitude !== null && property?.latitude !== undefined ? String(property.latitude) : "",
    longitude: property?.longitude !== null && property?.longitude !== undefined ? String(property.longitude) : "",
    media: (property?.media ?? []).map((media) => ({
      key: media.id,
      url: media.url,
      storagePath: media.storagePath,
      mediaType: media.mediaType,
      alt: media.alt ?? "",
      isCover: media.isCover,
    })),
  };
}

function uploadFile(
  file: File,
  kind: "image" | "video",
  onProgress: (percent: number) => void,
): Promise<{ url: string; storagePath: string | null; mediaType: "image" | "video" }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("kind", kind);
    body.append("files", file);

    xhr.open("POST", "/api/admin/media/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          ok?: boolean;
          error?: string;
          files?: { url: string; storagePath: string | null; mediaType: "image" | "video" }[];
        };
        if (xhr.status >= 200 && xhr.status < 300 && payload.ok && payload.files?.[0]) {
          resolve(payload.files[0]);
        } else {
          reject(new Error(payload.error ?? "Upload failed."));
        }
      } catch {
        reject(new Error("The upload returned an unexpected response."));
      }
    };
    xhr.onerror = () => reject(new Error("The upload could not reach the server."));
    xhr.send(body);
  });
}

export function PropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(property));
  const [slugLocked, setSlugLocked] = useState(Boolean(property));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState<{ label: string; percent: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const images = form.media.filter((media) => media.mediaType === "image");
  const video = form.media.find((media) => media.mediaType === "video") ?? null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
    setStatus("idle");
  }

  function autofillSlug(title: string) {
    if (slugLocked) return;
    setForm((current) => ({ ...current, title, slug: slugify(title) }));
  }

  async function handleFiles(files: FileList | null, kind: "image" | "video") {
    if (!files || !files.length) return;
    const array = Array.from(files).slice(0, kind === "image" ? MAX_IMAGES_PER_PROPERTY : 1);
    const uploads: MediaItem[] = [];

    for (const [index, file] of array.entries()) {
      setUpload({ label: `Uploading ${file.name} (${index + 1}/${array.length})`, percent: 0 });
      try {
        const stored = await uploadFile(file, kind, (percent) =>
          setUpload({ label: `Uploading ${file.name} (${index + 1}/${array.length})`, percent }),
        );
        uploads.push({
          key: `${stored.url}-${index}`,
          url: stored.url,
          storagePath: stored.storagePath,
          mediaType: stored.mediaType,
          alt: "",
          isCover: false,
        });
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "The upload failed.");
        setStatus("error");
        break;
      }
    }

    setUpload(null);
    if (!uploads.length) return;

    setForm((current) => {
      if (kind === "video") {
        return {
          ...current,
          media: [...current.media.filter((media) => media.mediaType === "image"), ...uploads],
        };
      }
      const existingImages = current.media.filter((media) => media.mediaType === "image");
      const nextImages = [...existingImages, ...uploads].slice(0, MAX_IMAGES_PER_PROPERTY).map((media, index) => ({
        ...media,
        isCover: existingImages.length === 0 ? index === 0 : media.isCover,
      }));
      const videos = current.media.filter((media) => media.mediaType === "video");
      return { ...current, media: [...nextImages, ...videos] };
    });
  }

  function removeMedia(key: string) {
    setForm((current) => {
      const remaining = current.media.filter((media) => media.key !== key);
      if (!remaining.some((media) => media.mediaType === "image" && media.isCover)) {
        const firstImage = remaining.find((media) => media.mediaType === "image");
        return {
          ...current,
          media: remaining.map((media) => ({ ...media, isCover: firstImage ? media.key === firstImage.key : false })),
        };
      }
      return { ...current, media: remaining };
    });
  }

  function setCover(key: string) {
    setForm((current) => ({
      ...current,
      media: current.media.map((media) => ({ ...media, isCover: media.mediaType === "image" && media.key === key })),
    }));
  }

  function moveMedia(key: string, direction: -1 | 1) {
    setForm((current) => {
      const list = [...current.media];
      const index = list.findIndex((media) => media.key === key);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= list.length) return current;
      const [item] = list.splice(index, 1);
      if (!item) return current;
      list.splice(target, 0, item);
      return { ...current, media: list };
    });
  }

  function reorder(from: number, to: number) {
    setForm((current) => {
      if (from === to) return current;
      const list = [...current.media];
      const [item] = list.splice(from, 1);
      if (!item) return current;
      list.splice(to, 0, item);
      return { ...current, media: list };
    });
  }

  function setAlt(key: string, alt: string) {
    setForm((current) => ({
      ...current,
      media: current.media.map((media) => (media.key === key ? { ...media, alt } : media)),
    }));
  }

  const payload = useMemo(
    () => ({
      ...form,
      price: Number(form.price.replace(/,/g, "")),
      bedrooms: form.bedrooms || null,
      bathrooms: form.bathrooms || null,
      balconies: form.balconies || null,
      builtUpArea: form.builtUpArea || null,
      carpetArea: form.carpetArea || null,
      plotArea: form.plotArea || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      address: form.address || null,
      media: form.media.map((media, index) => ({
        url: media.url,
        storagePath: media.storagePath,
        mediaType: media.mediaType,
        alt: media.alt || null,
        isCover: media.isCover,
        sortOrder: index,
      })),
    }),
    [form],
  );

  async function save(options: { publish?: boolean } = {}) {
    setStatus("saving");
    setError("");
    setFieldErrors({});

    const isPublished = options.publish ?? form.isPublished;
    const body = { ...payload, isPublished };

    try {
      const response = await fetch(
        property ? `/api/admin/properties/${property.id}` : "/api/admin/properties",
        {
          method: property ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; property?: { id: string; slug: string } }
        | null;

      if (!response.ok || !result?.ok || !result.property) {
        setStatus("error");
        setError(result?.error ?? "The property could not be saved.");
        setFieldErrors(result?.fieldErrors ?? {});
        if (result?.fieldErrors) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      setForm((current) => ({ ...current, isPublished }));
      setStatus("saved");
      router.push(`/admin/properties/${result.property.id}/edit?saved=1`);
      router.refresh();
    } catch {
      setStatus("error");
      setError("The server could not be reached. Your changes have not been saved.");
    }
  }

  const publishingBlocked =
    !form.media.some((media) => media.mediaType === "image") && (form.isPublished || false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-5"
    >
      <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/properties"
            className="mb-3 inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.18em] text-silver/50 transition-colors hover:text-gold"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            All properties
          </Link>
          <h1 className="font-display text-3xl text-ivory">
            {property ? property.title : "Add a property"}
          </h1>
          <p className="mt-1.5 text-[0.74rem] text-silver/50">
            {property
              ? `Last updated ${new Date(property.updatedAt).toLocaleString("en-GB")}`
              : "Complete the required fields, add imagery, then publish."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={() => save({ publish: false })} disabled={status === "saving"} className="btn-dark btn-sm">
            <Save aria-hidden="true" className="h-3.5 w-3.5" />
            Save draft
          </button>
          <button type="button" onClick={() => save({ publish: true })} disabled={status === "saving"} className="btn-gold btn-sm">
            {status === "saving" ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
            {form.isPublished ? "Update listing" : "Publish listing"}
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex items-start gap-2 border border-danger/30 bg-danger/[0.07] px-4 py-3 text-[0.8rem] text-[#e6a3a3]">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {status === "saved" ? (
        <div role="status" className="flex items-center gap-2 border border-success/30 bg-success/[0.07] px-4 py-3 text-[0.8rem] text-[#8fd4b8]">
          <Check aria-hidden="true" className="h-4 w-4" />
          Property saved successfully.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          {/* Basics */}
          <section className="studio-panel p-5">
            <h2 className="mb-4 font-display text-xl text-ivory">Essentials</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-title" className="field-label">
                  Property title <span className="text-gold/70">*</span>
                </label>
                <input
                  id="pf-title"
                  value={form.title}
                  onChange={(event) => autofillSlug(event.target.value)}
                  className={cn("field", fieldErrors.title && "field-error")}
                  placeholder="e.g. Aurum Riverside Residence"
                  required
                />
                {fieldErrors.title ? <p className="field-error-text">{fieldErrors.title}</p> : null}
              </div>

              <div>
                <label htmlFor="pf-slug" className="field-label">
                  Web address (slug) <span className="text-gold/70">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[0.7rem] text-silver/40">/properties/</span>
                  <input
                    id="pf-slug"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugLocked(true);
                      set("slug", slugify(event.target.value));
                    }}
                    className={cn("field", fieldErrors.slug && "field-error")}
                    placeholder="aurum-riverside-residence"
                    required
                  />
                </div>
                <p className="field-hint">
                  Generated from the title. Duplicates are suffixed automatically when saved.
                </p>
                {fieldErrors.slug ? <p className="field-error-text">{fieldErrors.slug}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pf-type" className="field-label">
                    Property type <span className="text-gold/70">*</span>
                  </label>
                  <select
                    id="pf-type"
                    value={form.propertyType}
                    onChange={(event) => set("propertyType", event.target.value as PropertyType)}
                    className="field"
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pf-purpose" className="field-label">
                    Purpose <span className="text-gold/70">*</span>
                  </label>
                  <select
                    id="pf-purpose"
                    value={form.purpose}
                    onChange={(event) => set("purpose", event.target.value as Purpose)}
                    className="field"
                  >
                    <option value="sale">For sale</option>
                    <option value="rent">For rent</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.6fr_0.6fr]">
                <div>
                  <label htmlFor="pf-price" className="field-label">
                    {form.purpose === "rent" ? "Monthly rent" : "Guide price"} <span className="text-gold/70">*</span>
                  </label>
                  <input
                    id="pf-price"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(event) => set("price", event.target.value.replace(/[^\d.]/g, ""))}
                    className={cn("field", fieldErrors.price && "field-error")}
                    placeholder="42500000"
                    required
                  />
                  {fieldErrors.price ? <p className="field-error-text">{fieldErrors.price}</p> : null}
                </div>
                <div>
                  <label htmlFor="pf-currency" className="field-label">
                    Currency
                  </label>
                  <select
                    id="pf-currency"
                    value={form.currency}
                    onChange={(event) => set("currency", event.target.value)}
                    className="field"
                  >
                    {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Media */}
          <section className="studio-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ivory">Media</h2>
                <p className="mt-1 text-[0.68rem] text-silver/45">
                  First image is used as the cover unless you choose otherwise. {images.length}/{MAX_IMAGES_PER_PROPERTY} images.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-dark btn-sm" disabled={Boolean(upload)}>
                  <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />
                  Add images
                </button>
                <button type="button" onClick={() => videoInputRef.current?.click()} className="btn-dark btn-sm" disabled={Boolean(upload)}>
                  <Film aria-hidden="true" className="h-3.5 w-3.5" />
                  {video ? "Replace video" : "Add video"}
                </button>
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              onChange={(event) => {
                void handleFiles(event.target.files, "image");
                event.target.value = "";
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="sr-only"
              onChange={(event) => {
                void handleFiles(event.target.files, "video");
                event.target.value = "";
              }}
            />

            {upload ? (
              <div className="mt-4 border border-gold/25 bg-gold/[0.04] p-3">
                <div className="flex items-center justify-between text-[0.72rem] text-gold-soft">
                  <span className="flex items-center gap-2">
                    <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                    {upload.label}
                  </span>
                  <span>{upload.percent}%</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/10">
                  <div className="h-full bg-gold transition-all" style={{ width: `${upload.percent}%` }} />
                </div>
              </div>
            ) : null}

            {fieldErrors.media ? (
              <p className="mt-3 flex items-center gap-1.5 text-[0.74rem] text-danger">
                <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
                {fieldErrors.media}
              </p>
            ) : null}

            {images.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {form.media.map((media, index) =>
                  media.mediaType === "image" ? (
                    <li
                      key={media.key}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragIndex !== null) reorder(dragIndex, index);
                        setDragIndex(null);
                      }}
                      className={cn(
                        "group border border-white/10 bg-imperial/40",
                        dragIndex === index && "opacity-50",
                      )}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-charcoal">
                        <Image src={media.url} alt={media.alt || "Property image"} fill sizes="320px" className="object-cover" />
                        {media.isCover ? (
                          <span className="absolute left-2 top-2 badge border-gold/50 bg-imperial/80 text-gold-soft backdrop-blur">
                            Cover
                          </span>
                        ) : null}
                        <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setCover(media.key)}
                            title="Set as cover"
                            aria-label="Set as cover image"
                            className="grid h-7 w-7 place-items-center border border-white/20 bg-imperial/80 text-ivory hover:border-gold hover:text-gold"
                          >
                            <Star aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedia(media.key)}
                            title="Remove image"
                            aria-label="Remove image"
                            className="grid h-7 w-7 place-items-center border border-white/20 bg-imperial/80 text-ivory hover:border-danger hover:text-danger"
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[0.55rem] uppercase tracking-[0.14em] text-ivory/50">
                          <GripVertical aria-hidden="true" className="h-3 w-3" />
                          Drag to reorder
                        </span>
                      </div>
                      <div className="space-y-2 p-2.5">
                        <input
                          value={media.alt}
                          onChange={(event) => setAlt(media.key, event.target.value)}
                          placeholder="Alt text (accessibility)"
                          aria-label="Image alternative text"
                          className="w-full border border-white/10 bg-imperial/60 px-2 py-1.5 text-[0.7rem] text-ivory placeholder:text-silver/35 focus:border-gold/50 focus:outline-none"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => moveMedia(media.key, -1)}
                            aria-label="Move image earlier"
                            className="grid h-7 w-7 place-items-center border border-white/10 text-silver/60 hover:border-gold/40 hover:text-gold"
                          >
                            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMedia(media.key, 1)}
                            aria-label="Move image later"
                            className="grid h-7 w-7 place-items-center border border-white/10 text-silver/60 hover:border-gold/40 hover:text-gold"
                          >
                            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ) : null,
                )}
              </ul>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="mt-4 flex w-full flex-col items-center gap-2 border border-dashed border-white/12 px-4 py-10 text-center transition-colors hover:border-gold/40"
              >
                <ImagePlus aria-hidden="true" className="h-6 w-6 text-gold/60" />
                <span className="text-[0.8rem] text-ivory/80">Upload property images</span>
                <span className="text-[0.66rem] text-silver/40">
                  JPG, PNG, WebP or AVIF · up to 8 MB each · at least one image required to publish
                </span>
              </button>
            )}

            {video ? (
              <div className="mt-4 flex items-center justify-between gap-3 border border-white/10 bg-imperial/40 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Film aria-hidden="true" className="h-4 w-4 shrink-0 text-gold/70" />
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="truncate text-[0.76rem] text-ivory/85 hover:text-gold">
                    Property video
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => removeMedia(video.key)}
                  aria-label="Remove video"
                  className="grid h-7 w-7 shrink-0 place-items-center border border-white/10 text-silver/60 hover:border-danger/50 hover:text-danger"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </section>

          {/* Location & specs */}
          <section className="studio-panel p-5">
            <h2 className="mb-4 font-display text-xl text-ivory">Location & specification</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pf-location" className="field-label">
                  Location <span className="text-gold/70">*</span>
                </label>
                <input
                  id="pf-location"
                  value={form.location}
                  onChange={(event) => set("location", event.target.value)}
                  className={cn("field", fieldErrors.location && "field-error")}
                  placeholder="Guwahati, Assam"
                  required
                />
                {fieldErrors.location ? <p className="field-error-text">{fieldErrors.location}</p> : null}
              </div>
              <div>
                <label htmlFor="pf-address" className="field-label">
                  Full address
                </label>
                <input
                  id="pf-address"
                  value={form.address}
                  onChange={(event) => set("address", event.target.value)}
                  className="field"
                  placeholder="Street, area, pin code"
                />
              </div>
              <div>
                <label htmlFor="pf-lat" className="field-label">
                  Latitude
                </label>
                <input
                  id="pf-lat"
                  value={form.latitude}
                  onChange={(event) => set("latitude", event.target.value)}
                  className="field"
                  placeholder="26.2006"
                />
              </div>
              <div>
                <label htmlFor="pf-lng" className="field-label">
                  Longitude
                </label>
                <input
                  id="pf-lng"
                  value={form.longitude}
                  onChange={(event) => set("longitude", event.target.value)}
                  className="field"
                  placeholder="91.7504"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              {(
                [
                  ["bedrooms", "Bedrooms"],
                  ["bathrooms", "Bathrooms"],
                  ["balconies", "Balconies"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`pf-${key}`} className="field-label">
                    {label}
                  </label>
                  <input
                    id={`pf-${key}`}
                    inputMode="numeric"
                    value={form[key]}
                    onChange={(event) => set(key, event.target.value.replace(/[^\d]/g, ""))}
                    className="field"
                    placeholder="0"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="pf-unit" className="field-label">
                  Area unit
                </label>
                <select
                  id="pf-unit"
                  value={form.areaUnit}
                  onChange={(event) => set("areaUnit", event.target.value as AreaUnit)}
                  className="field"
                >
                  {AREA_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {AREA_UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["builtUpArea", "Built-up area"],
                  ["carpetArea", "Carpet area"],
                  ["plotArea", "Plot area"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`pf-${key}`} className="field-label">
                    {label}
                  </label>
                  <input
                    id={`pf-${key}`}
                    inputMode="decimal"
                    value={form[key]}
                    onChange={(event) => set(key, event.target.value.replace(/[^\d.]/g, ""))}
                    className="field"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Description & features */}
          <section className="studio-panel p-5">
            <h2 className="mb-4 font-display text-xl text-ivory">Description & detail</h2>
            <div>
              <label htmlFor="pf-description" className="field-label">
                Description <span className="text-gold/70">*</span>
              </label>
              <textarea
                id="pf-description"
                rows={7}
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                className={cn("field resize-y", fieldErrors.description && "field-error")}
                placeholder="Describe the residence, its architecture, surroundings and what makes it exceptional. Separate paragraphs with a blank line."
                required
              />
              <p className="field-hint">{form.description.length} characters · minimum 40</p>
              {fieldErrors.description ? <p className="field-error-text">{fieldErrors.description}</p> : null}
            </div>

            <TagEditor
              label="Amenities"
              values={form.amenities}
              onChange={(values) => set("amenities", values)}
              suggestions={AMENITY_SUGGESTIONS}
            />
            <TagEditor
              label="Property features"
              values={form.features}
              onChange={(values) => set("features", values)}
              suggestions={FEATURE_SUGGESTIONS}
            />
          </section>
        </div>

        {/* Rail */}
        <div className="space-y-5">
          <section className="studio-panel p-5 xl:sticky xl:top-24">
            <h2 className="mb-4 font-display text-xl text-ivory">Publication</h2>

            <div className="space-y-3">
              <label className="flex items-start justify-between gap-3 border border-white/10 bg-imperial/40 p-3">
                <span>
                  <span className="block text-[0.78rem] text-ivory">Published</span>
                  <span className="mt-0.5 block text-[0.64rem] text-silver/45">
                    Visible on the public website
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) => set("isPublished", event.target.checked)}
                  className="checkbox-luxe mt-1"
                  aria-label="Published"
                />
              </label>

              <label className="flex items-start justify-between gap-3 border border-white/10 bg-imperial/40 p-3">
                <span>
                  <span className="block text-[0.78rem] text-ivory">Signature listing</span>
                  <span className="mt-0.5 block text-[0.64rem] text-silver/45">
                    Featured on the homepage
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => set("isFeatured", event.target.checked)}
                  className="checkbox-luxe mt-1"
                  aria-label="Featured"
                />
              </label>

              <div>
                <label htmlFor="pf-status" className="field-label">
                  Availability
                </label>
                <select
                  id="pf-status"
                  value={form.status}
                  onChange={(event) => set("status", event.target.value as PropertyStatus)}
                  className="field"
                >
                  {PROPERTY_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {publishingBlocked ? (
              <p className="mt-4 flex items-start gap-1.5 text-[0.7rem] text-gold/80">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Add at least one image before publishing this listing.
              </p>
            ) : null}

            <div className="mt-5 space-y-2 border-t border-white/[0.07] pt-4">
              <button type="submit" disabled={status === "saving"} className="btn-gold btn-sm w-full">
                {status === "saving" ? (
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                Save changes
              </button>
              <button type="button" onClick={() => save({ publish: true })} disabled={status === "saving"} className="btn-dark btn-sm w-full">
                Save & publish
              </button>
            </div>

            <p className="mt-4 text-[0.64rem] leading-relaxed text-silver/40">
              Unsaved media uploads are stored but only attached to the listing when you save. Removing an image here
              deletes its record on save; deleted properties also remove their stored files.
            </p>
          </section>
        </div>
      </div>
    </form>
  );
}

function TagEditor({
  label,
  values,
  onChange,
  suggestions,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = `suggestions-${label.replace(/\s+/g, "-").toLowerCase()}`;

  function add(value: string) {
    const clean = value.trim();
    if (!clean) return;
    if (values.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, clean]);
    setDraft("");
  }

  return (
    <div className="mt-5">
      <span className="field-label">{label}</span>
      <div className="flex gap-2">
        <input
          value={draft}
          list={listId}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
          placeholder={`Add ${label.toLowerCase()} and press Enter`}
          className="field"
        />
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <button type="button" onClick={() => add(draft)} className="btn-dark btn-sm shrink-0">
          Add
        </button>
      </div>
      {values.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value} className="flex items-center gap-1.5 border border-gold/25 bg-gold/[0.05] px-2.5 py-1 text-[0.68rem] text-gold-soft">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                aria-label={`Remove ${value}`}
                className="text-gold/60 transition-colors hover:text-danger"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
