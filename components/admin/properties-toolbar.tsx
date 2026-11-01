"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function PropertiesToolbar() {
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
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-3 border border-white/[0.07] bg-[#0d1017] p-3.5 sm:flex-row sm:items-center">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          update("q", term.trim());
        }}
        className="relative flex-1"
      >
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-silver/40" />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search title, location, address…"
          aria-label="Search properties"
          className="w-full border border-white/10 bg-imperial/60 py-2.5 pl-9 pr-3 text-[0.8rem] text-ivory placeholder:text-silver/35 focus:border-gold/50 focus:outline-none"
        />
      </form>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(event) => update("status", event.target.value)}
          aria-label="Filter by status"
          className="border border-white/10 bg-imperial/60 px-3 py-2.5 text-[0.74rem] text-ivory focus:border-gold/50 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="under_offer">Under offer</option>
          <option value="sold">Sold</option>
          <option value="rented">Rented</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select
          value={searchParams.get("purpose") ?? ""}
          onChange={(event) => update("purpose", event.target.value)}
          aria-label="Filter by purpose"
          className="border border-white/10 bg-imperial/60 px-3 py-2.5 text-[0.74rem] text-ivory focus:border-gold/50 focus:outline-none"
        >
          <option value="">Sale & rent</option>
          <option value="sale">For sale</option>
          <option value="rent">For rent</option>
        </select>
        <select
          value={searchParams.get("visibility") ?? ""}
          onChange={(event) => update("visibility", event.target.value)}
          aria-label="Filter by visibility"
          className="border border-white/10 bg-imperial/60 px-3 py-2.5 text-[0.74rem] text-ivory focus:border-gold/50 focus:outline-none"
        >
          <option value="">All visibility</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>
    </div>
  );
}
