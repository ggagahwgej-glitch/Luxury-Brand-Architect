"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Owner sign-in: three factors (email, password, 12-digit code).
 * Verification happens entirely server-side at /api/admin/login.
 */
export function OwnerLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, code: code.replace(/\D/g, "") }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; redirectTo?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Sign-in could not be completed. Please try again.");
        setFieldErrors(payload?.fieldErrors ?? {});
        setPending(false);
        return;
      }

      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin/dashboard");
      router.refresh();
    } catch {
      setError("The server could not be reached. Check your connection and try again.");
      setPending(false);
    }
  }

  const codeDigits = code.replace(/\D/g, "").slice(0, 12);

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="admin-email" className="field-label">
          Owner email
        </label>
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-silver/40" />
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            className={cn("field pl-10", fieldErrors.email && "field-error")}
            placeholder="owner@example.com"
          />
        </div>
        {fieldErrors.email ? <p className="field-error-text">{fieldErrors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="admin-password" className="field-label">
          Password
        </label>
        <div className="relative">
          <Lock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-silver/40" />
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            className={cn("field pl-10 pr-11", fieldErrors.password && "field-error")}
            placeholder="Your account password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-silver/50 transition-colors hover:text-gold"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.password ? <p className="field-error-text">{fieldErrors.password}</p> : null}
      </div>

      <div>
        <label htmlFor="admin-code" className="field-label">
          Permanent 12-digit access code
        </label>
        <input
          id="admin-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{12}"
          maxLength={12}
          required
          value={codeDigits}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 12))}
          aria-invalid={Boolean(fieldErrors.code)}
          aria-describedby="admin-code-hint"
          className={cn(
            "field text-center font-sans text-lg tracking-[0.4em] tabular-nums",
            fieldErrors.code && "field-error",
          )}
          placeholder="•••• •••• ••••"
        />
        <p id="admin-code-hint" className="field-hint flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="h-3 w-3 text-gold/60" />
          The 12-digit code is separate from your password and is never stored in the browser.
        </p>
        {fieldErrors.code ? <p className="field-error-text">{fieldErrors.code}</p> : null}
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-2 border border-danger/30 bg-danger/[0.07] px-3.5 py-3 text-[0.78rem] text-[#e6a3a3]">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button type="submit" disabled={pending} className="btn-gold w-full">
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Verifying access
          </>
        ) : (
          <>
            Enter the studio
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
