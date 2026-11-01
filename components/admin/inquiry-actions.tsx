"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MailCheck, MailOpen, MessageSquareCheck, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/types";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<InquiryStatus, typeof Check> = {
  new: MailOpen,
  read: Check,
  contacted: MessageSquareCheck,
  resolved: MailCheck,
};

export function InquiryActions({ id, status }: { id: string; status: InquiryStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function update(next: InquiryStatus) {
    setBusy(next);
    setError("");
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "The inquiry could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError("");
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "The inquiry could not be deleted.");
        return;
      }
      setConfirming(false);
      router.replace("/admin/inquiries");
      router.refresh();
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {INQUIRY_STATUSES.map((value) => {
          const Icon = ICONS[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => update(value)}
              disabled={busy !== null || status === value}
              className={cn(
                "inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[0.64rem] uppercase tracking-[0.12em] transition-colors disabled:opacity-45",
                status === value
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-white/12 text-silver/70 hover:border-gold/40 hover:text-gold",
              )}
            >
              <Icon aria-hidden="true" className="h-3 w-3" />
              {INQUIRY_STATUS_LABELS[value]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 border border-white/12 px-2.5 py-1.5 text-[0.64rem] uppercase tracking-[0.12em] text-silver/60 transition-colors hover:border-danger/40 hover:text-danger"
        >
          <Trash2 aria-hidden="true" className="h-3 w-3" />
          Delete
        </button>
      </div>
      {error ? <p role="alert" className="text-[0.72rem] text-danger">{error}</p> : null}

      <ConfirmDialog
        open={confirming}
        title="Delete this inquiry?"
        description="The enquiry will be permanently removed. This cannot be undone."
        confirmLabel="Delete inquiry"
        pending={busy === "delete"}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
