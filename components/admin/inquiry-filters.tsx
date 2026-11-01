"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { INQUIRY_STATUSES } from "@/lib/types";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";

export function InquiryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");

  useEffect(() => setTerm(searchParams.get("q") ?? ""), [searchParams]);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    params.delete("focus");
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-2 border border-white/[0.07] bg-[#0d1017] p-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          update("q", term.trim());
        }}
        className="relative"
      >
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-silver/40" />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search name, phone, email, property…"
          aria-label="Search inquiries"
          className="w-full border border-white/10 bg-imperial/60 py-2.5 pl-9 pr-3 text-[0.8rem] text-ivory placeholder:text-silver/35 focus:border-gold/50 focus:outline-none"
        />
      </form>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => update("status", "")}
          className={`tabs-pill border border-white/10 ${!searchParams.get("status") ? "bg-gold text-imperial" : "text-silver hover:text-ivory"}`}
        >
          All
        </button>
        {INQUIRY_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => update("status", value)}
            className={`tabs-pill border border-white/10 ${searchParams.get("status") === value ? "bg-gold text-imperial" : "text-silver hover:text-ivory"}`}
          >
            {INQUIRY_STATUS_LABELS[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
