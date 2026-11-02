"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ImagePlus, Loader2, Plus, Save, Star, Trash2, Upload, X } from "lucide-react";
import { ACCENT_PRESETS, DISPLAY_FONT_PRESETS } from "@/lib/constants";
import type { AccentPreset, DisplayFontPreset, SiteSettings, Testimonial } from "@/lib/types";
import { uuid } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-client";

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "contact", label: "Contact" },
  { id: "social", label: "Social" },
  { id: "website", label: "Website" },
  { id: "seo", label: "SEO" },
  { id: "design", label: "Design" },
  { id: "testimonials", label: "Testimonials" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ImageField({
  label,
  value,
  onChange,
  hint,
  aspect = "aspect-[16/9]",
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
  aspect?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className={cn("relative w-full max-w-[280px] overflow-hidden border border-white/10 bg-imperial/60", aspect)}>
          {value ? (
            <Image src={value} alt={label} fill sizes="280px" className="object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[0.62rem] uppercase tracking-[0.16em] text-silver/35">
              Not set
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn-dark btn-sm cursor-pointer">
            {uploading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />}
            {uploading ? "Uploading" : value ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setUploading(true);
                setError("");
                try {
                  const uploaded = await uploadFile(file, "brand");
                  onChange(uploaded.url);
                } catch (uploadError) {
                  setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          {value ? (
            <button type="button" onClick={() => onChange(null)} className="btn-dark btn-sm">
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : null}
          {hint ? <p className="text-[0.62rem] text-silver/40">{hint}</p> : null}
          {error ? <p className="text-[0.62rem] text-danger">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("branding");
  const [form, setForm] = useState<SiteSettings>(settings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function patch<K extends keyof SiteSettings>(section: K, value: Partial<SiteSettings[K]>) {
    setForm((current) => ({ ...current, [section]: { ...(current[section] as object), ...(value as object) } }) as SiteSettings);
    setStatus("idle");
  }

  const [notice, setNotice] = useState("");

  async function save() {
    setStatus("saving");
    setError("");
    setNotice("");
    setFieldErrors({});

    // Half-written testimonial cards must not block the rest of the settings:
    // empty drafts are dropped instead of failing validation for every tab.
    const completeTestimonials = form.testimonials.filter(
      (item) => item.quote.trim().length >= 10 && item.author.trim().length >= 2,
    );
    const droppedTestimonials = form.testimonials.length - completeTestimonials.length;
    if (droppedTestimonials > 0) {
      setForm((current) => ({ ...current, testimonials: completeTestimonials }));
    }

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: form.branding,
          contact: form.contact,
          social: form.social,
          website: form.website,
          seo: form.seo,
          design: form.design,
          testimonials: completeTestimonials,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; settings?: SiteSettings }
        | null;
      if (!response.ok || !payload?.ok) {
        setStatus("error");
        setError(payload?.error ?? "Settings could not be saved.");
        const errors = payload?.fieldErrors ?? {};
        setFieldErrors(errors);
        // Jump to the tab that owns the first invalid field, otherwise the
        // highlighted input is hidden behind another tab.
        const section = Object.keys(errors)[0]?.split(".")[0];
        if (section && TABS.some((tabItem) => tabItem.id === section)) {
          setTab(section as TabId);
        }
        return;
      }
      if (payload.settings) setForm(payload.settings);
      if (droppedTestimonials > 0) {
        setNotice(
          `${droppedTestimonials} incomplete testimonial${droppedTestimonials === 1 ? " was" : "s were"} skipped — a quote needs 10+ characters and an author name.`,
        );
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
      setError("The server could not be reached. Your changes have not been saved.");
    }
  }

  function addTestimonial() {
    const testimonial: Testimonial = { id: uuid(), quote: "", author: "", role: "", isDemo: false };
    setForm((current) => ({ ...current, testimonials: [...current.testimonials, testimonial] }));
  }

  function updateTestimonial(id: string, patchValue: Partial<Testimonial>) {
    setForm((current) => ({
      ...current,
      testimonials: current.testimonials.map((item) => (item.id === id ? { ...item, ...patchValue } : item)),
    }));
    setStatus("idle");
  }

  function removeTestimonial(id: string) {
    setForm((current) => ({ ...current, testimonials: current.testimonials.filter((item) => item.id !== id) }));
    setStatus("idle");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.58rem] uppercase tracking-[0.26em] text-gold/80">Configuration</p>
          <h1 className="mt-2 font-display text-3xl text-ivory">Website settings</h1>
          <p className="mt-1.5 text-[0.74rem] text-silver/50">
            Changes apply to the public website immediately after saving.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/" target="_blank" className="btn-dark btn-sm">
            View website
          </Link>
          <button type="button" onClick={save} disabled={status === "saving"} className="btn-gold btn-sm">
            {status === "saving" ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Save aria-hidden="true" className="h-3.5 w-3.5" />}
            Save settings
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
          {notice || "Settings saved — the public website now reflects these changes."}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.28fr_1fr]">
        <nav aria-label="Settings sections" className="flex gap-1.5 overflow-x-auto xl:flex-col xl:overflow-visible">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "true" : undefined}
              className={cn(
                "shrink-0 border-l-2 px-3.5 py-2.5 text-left text-[0.76rem] transition-colors xl:w-full",
                tab === item.id
                  ? "border-gold bg-gold/[0.06] text-ivory"
                  : "border-transparent text-silver/60 hover:bg-white/[0.02] hover:text-ivory",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="studio-panel p-5 sm:p-6">
          {tab === "branding" ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="set-business" className="field-label">Business name</label>
                  <input
                    id="set-business"
                    value={form.branding.businessName}
                    onChange={(event) => patch("branding", { businessName: event.target.value })}
                    className={cn("field", fieldErrors["branding.businessName"] && "field-error")}
                  />
                  {fieldErrors["branding.businessName"] ? <p className="field-error-text">{fieldErrors["branding.businessName"]}</p> : null}
                </div>
                <div>
                  <label htmlFor="set-website-name" className="field-label">Website name</label>
                  <input
                    id="set-website-name"
                    value={form.branding.websiteName}
                    onChange={(event) => patch("branding", { websiteName: event.target.value })}
                    className="field"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="set-tagline" className="field-label">Tagline</label>
                <input
                  id="set-tagline"
                  value={form.branding.tagline}
                  onChange={(event) => patch("branding", { tagline: event.target.value })}
                  className="field"
                  placeholder="Private Real Estate Atelier"
                />
              </div>
              <div>
                <label htmlFor="set-description" className="field-label">Brand description</label>
                <textarea
                  id="set-description"
                  rows={4}
                  value={form.branding.description}
                  onChange={(event) => patch("branding", { description: event.target.value })}
                  className="field resize-y"
                />
              </div>
              <ImageField label="Logo" value={form.branding.logoUrl} onChange={(value) => patch("branding", { logoUrl: value })} hint="SVG or PNG, transparent, under 2 MB. Replaces the built-in monogram." aspect="aspect-square" />
              <ImageField label="Favicon" value={form.branding.faviconUrl} onChange={(value) => patch("branding", { faviconUrl: value })} hint="Square PNG, at least 64×64." aspect="aspect-square" />
            </div>
          ) : null}

          {tab === "contact" ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="set-phone" className="field-label">Phone</label>
                  <input id="set-phone" value={form.contact.phone} onChange={(event) => patch("contact", { phone: event.target.value })} className={cn("field", fieldErrors["contact.phone"] && "field-error")} />
                </div>
                <div>
                  <label htmlFor="set-whatsapp" className="field-label">WhatsApp</label>
                  <input id="set-whatsapp" value={form.contact.whatsapp} onChange={(event) => patch("contact", { whatsapp: event.target.value })} className="field" placeholder="+91 00000 00000" />
                </div>
                <div>
                  <label htmlFor="set-email" className="field-label">Email</label>
                  <input id="set-email" type="email" value={form.contact.email} onChange={(event) => patch("contact", { email: event.target.value })} className={cn("field", fieldErrors["contact.email"] && "field-error")} />
                  {fieldErrors["contact.email"] ? <p className="field-error-text">{fieldErrors["contact.email"]}</p> : null}
                </div>
                <div>
                  <label htmlFor="set-hours" className="field-label">Office hours</label>
                  <input id="set-hours" value={form.contact.hours} onChange={(event) => patch("contact", { hours: event.target.value })} className="field" />
                </div>
              </div>
              <div>
                <label htmlFor="set-address" className="field-label">Business address</label>
                <textarea id="set-address" rows={3} value={form.contact.address} onChange={(event) => patch("contact", { address: event.target.value })} className="field resize-y" />
              </div>
              <div>
                <label htmlFor="set-map" className="field-label">Map link (optional)</label>
                <input id="set-map" value={form.contact.mapUrl ?? ""} onChange={(event) => patch("contact", { mapUrl: event.target.value || null })} className="field" placeholder="https://…" />
                <p className="field-hint">Used for the “open map” link on the contact page.</p>
              </div>
            </div>
          ) : null}

          {tab === "social" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["linkedin", "LinkedIn"],
                  ["youtube", "YouTube"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`set-social-${key}`} className="field-label">{label}</label>
                  <input
                    id={`set-social-${key}`}
                    value={form.social[key]}
                    onChange={(event) => patch("social", { [key]: event.target.value })}
                    className="field"
                    placeholder={`https://${key}.com/…`}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {tab === "website" ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="set-hero-eyebrow" className="field-label">Hero eyebrow</label>
                <input id="set-hero-eyebrow" value={form.website.heroEyebrow} onChange={(event) => patch("website", { heroEyebrow: event.target.value })} className="field" />
              </div>
              <div>
                <label htmlFor="set-hero-heading" className="field-label">Hero heading</label>
                <input id="set-hero-heading" value={form.website.heroHeading} onChange={(event) => patch("website", { heroHeading: event.target.value })} className={cn("field", fieldErrors["website.heroHeading"] && "field-error")} />
                <p className="field-hint">Rendered across two balanced lines, with the second line in italic gold.</p>
              </div>
              <div>
                <label htmlFor="set-hero-description" className="field-label">Hero description</label>
                <textarea id="set-hero-description" rows={3} value={form.website.heroDescription} onChange={(event) => patch("website", { heroDescription: event.target.value })} className="field resize-y" />
              </div>
              <ImageField label="Hero image" value={form.website.heroImageUrl} onChange={(value) => patch("website", { heroImageUrl: value })} hint="Wide architectural photograph, at least 1920px wide." />
              <div>
                <label htmlFor="set-hero-alt" className="field-label">Hero image description (alt text)</label>
                <input id="set-hero-alt" value={form.website.heroImageAlt} onChange={(event) => patch("website", { heroImageAlt: event.target.value })} className="field" />
              </div>

              <div className="border-t border-white/[0.07] pt-5">
                <p className="field-label">Homepage sections</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["showCollections", "Property collections"],
                      ["showDestinations", "Featured destinations"],
                      ["showWhyUs", "Why choose us"],
                      ["showExperience", "Brand story"],
                      ["showTestimonials", "Client testimonials"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-3 border border-white/10 bg-imperial/40 px-3 py-2.5">
                      <span className="text-[0.76rem] text-ivory/85">{label}</span>
                      <input
                        type="checkbox"
                        checked={form.website[key]}
                        onChange={(event) => patch("website", { [key]: event.target.checked })}
                        className="checkbox-luxe"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 border-t border-white/[0.07] pt-5">
                <div>
                  <label htmlFor="set-cta-heading" className="field-label">Closing call-to-action heading</label>
                  <input id="set-cta-heading" value={form.website.ctaHeading} onChange={(event) => patch("website", { ctaHeading: event.target.value })} className="field" />
                </div>
                <div>
                  <label htmlFor="set-cta-description" className="field-label">Call-to-action description</label>
                  <textarea id="set-cta-description" rows={2} value={form.website.ctaDescription} onChange={(event) => patch("website", { ctaDescription: event.target.value })} className="field resize-y" />
                </div>
                <div>
                  <label htmlFor="set-footer-note" className="field-label">Footer note</label>
                  <textarea id="set-footer-note" rows={2} value={form.website.footerNote} onChange={(event) => patch("website", { footerNote: event.target.value })} className="field resize-y" />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "seo" ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="set-seo-title" className="field-label">SEO title</label>
                <input id="set-seo-title" value={form.seo.title} onChange={(event) => patch("seo", { title: event.target.value })} className="field" maxLength={160} />
                <p className="field-hint">{form.seo.title.length}/160 characters</p>
              </div>
              <div>
                <label htmlFor="set-seo-description" className="field-label">Meta description</label>
                <textarea id="set-seo-description" rows={3} value={form.seo.description} onChange={(event) => patch("seo", { description: event.target.value })} className="field resize-y" maxLength={320} />
                <p className="field-hint">{form.seo.description.length}/320 characters (aim for 150–160)</p>
              </div>
              <ImageField label="Social sharing image" value={form.seo.ogImageUrl} onChange={(value) => patch("seo", { ogImageUrl: value })} hint="1200×630 recommended. Falls back to the hero image." />
            </div>
          ) : null}

          {tab === "design" ? (
            <div className="space-y-7">
              <div>
                <p className="field-label">Accent palette</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(ACCENT_PRESETS) as AccentPreset[]).map((key) => {
                    const preset = ACCENT_PRESETS[key];
                    const active = form.design.accent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => patch("design", { accent: key })}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-3 border px-3.5 py-3 text-left transition-colors",
                          active ? "border-gold/50 bg-gold/[0.06]" : "border-white/10 hover:border-white/25",
                        )}
                      >
                        <span className="h-7 w-7 shrink-0 border border-white/20" style={{ backgroundColor: preset.swatch }} />
                        <span className="flex-1 text-[0.78rem] text-ivory/90">{preset.label}</span>
                        {active ? <Check aria-hidden="true" className="h-4 w-4 text-gold" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="field-label">Display typeface</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(DISPLAY_FONT_PRESETS) as DisplayFontPreset[]).map((key) => {
                    const preset = DISPLAY_FONT_PRESETS[key];
                    const active = form.design.displayFont === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => patch("design", { displayFont: key })}
                        aria-pressed={active}
                        className={cn(
                          "border px-4 py-4 text-left transition-colors",
                          active ? "border-gold/50 bg-gold/[0.06]" : "border-white/10 hover:border-white/25",
                        )}
                      >
                        <span className="block text-xl text-ivory" style={{ fontFamily: preset.stack }}>
                          Exceptional Living
                        </span>
                        <span className="mt-2 flex items-center justify-between text-[0.66rem] text-silver/50">
                          {preset.label}
                          {active ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-gold" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="border border-white/[0.08] bg-imperial/40 px-4 py-3 text-[0.7rem] leading-relaxed text-silver/50">
                Design presets are applied through CSS custom properties on the server-rendered page, so they take
                effect for every visitor immediately — no rebuild required.
              </p>
            </div>
          ) : null}

          {tab === "testimonials" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.74rem] leading-relaxed text-silver/55">
                  Only add testimonials you have permission to publish. The section is hidden automatically when empty.
                </p>
                <button type="button" onClick={addTestimonial} className="btn-dark btn-sm">
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  Add testimonial
                </button>
              </div>

              {form.testimonials.length ? (
                <ul className="space-y-3">
                  {form.testimonials.map((testimonial) => (
                    <li key={testimonial.id} className="border border-white/10 bg-imperial/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.16em] text-gold/60">
                          <Star aria-hidden="true" className="h-3 w-3" />
                          {testimonial.isDemo ? "Preview sample — replace before launch" : "Owner-approved"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTestimonial(testimonial.id)}
                          aria-label="Remove testimonial"
                          className="grid h-7 w-7 place-items-center border border-white/10 text-silver/50 transition-colors hover:border-danger/40 hover:text-danger"
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={testimonial.quote}
                        onChange={(event) => updateTestimonial(testimonial.id, { quote: event.target.value })}
                        placeholder="What did the client say?"
                        className="field mt-3 resize-y"
                        aria-label="Testimonial quote"
                      />
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input
                          value={testimonial.author}
                          onChange={(event) => updateTestimonial(testimonial.id, { author: event.target.value })}
                          placeholder="Client name or attribution"
                          aria-label="Testimonial author"
                          className="field"
                        />
                        <input
                          value={testimonial.role}
                          onChange={(event) => updateTestimonial(testimonial.id, { role: event.target.value })}
                          placeholder="e.g. Riverside residence purchase"
                          aria-label="Testimonial context"
                          className="field"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="border border-dashed border-white/12 px-6 py-10 text-center">
                  <p className="text-[0.8rem] text-silver/55">No testimonials yet — the homepage section is hidden.</p>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
            <p className="text-[0.64rem] text-silver/35">
              Last saved{" "}
              {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
                new Date(form.updatedAt),
              )}
            </p>
            <button type="button" onClick={save} disabled={status === "saving"} className="btn-gold btn-sm">
              {status === "saving" ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Save aria-hidden="true" className="h-3.5 w-3.5" />}
              Save settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
