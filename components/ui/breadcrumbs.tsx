import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.2em] text-silver/50">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="transition-colors hover:text-gold">
                {item.label}
              </Link>
            ) : (
              <span className={index === items.length - 1 ? "text-gold/80" : undefined} aria-current={index === items.length - 1 ? "page" : undefined}>
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? <ChevronRight aria-hidden="true" className="h-3 w-3 text-silver/30" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
