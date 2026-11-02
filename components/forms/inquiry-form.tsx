"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { INQUIRY_INTENT_LABELS } from "@/lib/constants";
import { INQUIRY_INTENTS, type InquiryIntent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InquiryFormProps {
  propertyId?: string | null;
  propertyTitle?: string | null;
  properties?: { id: string; title: string }[];
  defaultIntent?: InquiryIntent;
  compact?: boolean;
  title?: string;
  description?: string;
}

type FieldErrors = Record<string, string>;

const emptyForm = { name: "", phone: "", email: "", message: "", intent: "information" as InquiryIntent, propertyId: "" };

/**
 * Enquiry form. Posts to the server endpoint which re-validates everything,
 * applies rate limiting and stores the enquiry against the property.
 */
export function InquiryForm({
  propertyId = null,
  propertyTitle = null,
  properties,
  defaultIntent = "information",
  compact = false,
  title = "Request a private viewing",
  description,
}: InquiryFormProps) {
  const [form, setForm] = useState({ ...emptyForm, intent: defaultIntent, propertyId: propertyId ?? "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const startedAt = useRef<number>(Date.now());
  const honeypot = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm({ ...emptyForm, intent: defaultIntent, propertyId: propertyId ?? "" });
    startedAt.current = Date.now();
  }, [propertyId, defaultIntent]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrors({});
    setMessage("");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propertyId: form.propertyId || null,
          company: honeypot.current?.value ?? "",
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; error?: string; fieldErrors?: FieldErrors }
        | null;

      if (!response.ok || !payload?.ok) {
        setStatus("error");
        setErrors(payload?.fieldErrors ?? {});
        setMessage(payload?.error ?? "Your enquiry could not be sent. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(payload.message ?? "Thank you — your enquiry has been received.");
      setForm({ ...emptyForm, intent: defaultIntent, propertyId: propertyId ?? "" });
    } catch {
      setStatus("error");
      setMessage("We could not reach the server. Please check your connection or contact us on WhatsApp.");
    }
  }

  if (status === "success") {
    return (
      <div className="border border-success/30 bg-success/[0.06] p-6" role="status" aria-live="polite">
        <CheckCircle2 aria-hidden="true" className="h-7 w-7 text-success" />
        <h3 className="mt-4 font-display text-2xl text-ivory">Thank you — your enquiry is with us.</h3>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-silver/85">{message}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("");
            startedAt.current = Date.now();
          }}
          className="btn-ivory btn-sm mt-5"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {title ? (
        <div className={compact ? "sr-only" : ""}>
          <h3 className="font-display text-2xl text-ivory">{title}</h3>
          {propertyTitle ? (
            <p className="mt-1 text-[0.75rem] text-silver/70">
              Regarding <span className="text-gold/90">{propertyTitle}</span>
            </p>
          ) : null}
          {description ? <p className="mt-2 text-[0.82rem] leading-relaxed text-silver/75">{description}</p> : null}
        </div>
      ) : null}

      <fieldset>
        <legend className="field-label">How can we assist?</legend>
        <div className="flex flex-wrap gap-2">
          {INQUIRY_INTENTS.map((intent) => (
            <button
              key={intent}
              type="button"
              onClick={() => update("intent", intent)}
              aria-pressed={form.intent === intent}
              className={cn(
                "border px-3 py-2 text-[0.66rem] transition-colors",
                form.intent === intent
                  ? "border-gold/60 bg-gold/10 text-gold-soft"
                  : "border-white/12 text-silver/75 hover:border-white/30 hover:text-ivory",
              )}
            >
              {INQUIRY_INTENT_LABELS[intent]}
            </button>
          ))}
        </div>
      </fieldset>

      {properties && properties.length ? (
        <div>
          <label htmlFor="inq-property" className="field-label">
            Interested property
          </label>
          <select
            id="inq-property"
            value={form.propertyId}
            onChange={(event) => update("propertyId", event.target.value)}
            className="field"
          >
            <option value="">General enquiry</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inq-name" className="field-label">
            Full name <span className="text-gold/70">*</span>
          </label>
          <input
            id="inq-name"
            name="name"
            autoComplete="name"
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "inq-name-error" : undefined}
            className={cn("field", errors.name && "field-error")}
            placeholder="Your name"
          />
          {errors.name ? (
            <p id="inq-name-error" className="field-error-text">
              <AlertCircle aria-hidden="true" className="h-3 w-3" /> {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="inq-phone" className="field-label">
            Phone <span className="text-gold/70">*</span>
          </label>
          <input
            id="inq-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "inq-phone-error" : undefined}
            className={cn("field", errors.phone && "field-error")}
            placeholder="+91 00000 00000"
          />
          {errors.phone ? (
            <p id="inq-phone-error" className="field-error-text">
              <AlertCircle aria-hidden="true" className="h-3 w-3" /> {errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="inq-email" className="field-label">
          Email <span className="text-gold/70">*</span>
        </label>
        <input
          id="inq-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "inq-email-error" : undefined}
          className={cn("field", errors.email && "field-error")}
          placeholder="you@example.com"
        />
        {errors.email ? (
          <p id="inq-email-error" className="field-error-text">
            <AlertCircle aria-hidden="true" className="h-3 w-3" /> {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="inq-message" className="field-label">
          Message <span className="text-gold/70">*</span>
        </label>
        <textarea
          id="inq-message"
          name="message"
          rows={compact ? 3 : 4}
          required
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "inq-message-error" : undefined}
          className={cn("field resize-none", errors.message && "field-error")}
          placeholder="Tell us what you are looking for, and when you would like to view."
        />
        {errors.message ? (
          <p id="inq-message-error" className="field-error-text">
            <AlertCircle aria-hidden="true" className="h-3 w-3" /> {errors.message}
          </p>
        ) : null}
      </div>

      {/* Honeypot — visually hidden, never focusable */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="inq-company">Company</label>
        <input ref={honeypot} id="inq-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && message ? (
        <div role="alert" className="flex items-start gap-2 border border-danger/30 bg-danger/[0.07] px-3.5 py-3 text-[0.78rem] text-[#e6a3a3]">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      <button type="submit" disabled={status === "submitting"} className="btn-gold w-full">
        {status === "submitting" ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Sending enquiry
          </>
        ) : (
          <>
            <Send aria-hidden="true" className="h-3.5 w-3.5" />
            Send enquiry
          </>
        )}
      </button>

      <p className="text-[0.66rem] leading-relaxed text-silver/45">
        Your details are used only to respond to this enquiry and are never shared with third parties.
      </p>
    </form>
  );
}
