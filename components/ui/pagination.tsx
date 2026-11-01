import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const push = (value: number | "ellipsis") => {
    if (!pages.includes(value) || value === "ellipsis") pages.push(value);
  };
  push(1);
  if (page > 3) push("ellipsis");
  for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i += 1) push(i);
  if (page < pageCount - 2) push("ellipsis");
  if (pageCount > 1) push(pageCount);

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          "grid h-10 w-10 place-items-center border border-white/12 text-silver transition-colors hover:border-gold/40 hover:text-gold",
          page === 1 && "pointer-events-none opacity-30",
        )}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </Link>

      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`e-${index}`} className="px-1 text-silver/40">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "grid h-10 min-w-10 place-items-center border px-3 text-[0.75rem] transition-colors",
              item === page
                ? "border-gold bg-gold/10 text-gold"
                : "border-white/12 text-silver hover:border-gold/40 hover:text-gold",
            )}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={hrefFor(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className={cn(
          "grid h-10 w-10 place-items-center border border-white/12 text-silver transition-colors hover:border-gold/40 hover:text-gold",
          page === pageCount && "pointer-events-none opacity-30",
        )}
        aria-label="Next page"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </nav>
  );
}
