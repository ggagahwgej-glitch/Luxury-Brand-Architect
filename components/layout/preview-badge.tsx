import { isPreviewProvider } from "@/lib/data";

/** Shown only when the development preview provider is active. */
export function PreviewBadge() {
  let preview = false;
  try {
    preview = isPreviewProvider();
  } catch {
    preview = false;
  }
  if (!preview) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 max-w-[240px]">
      <div className="pointer-events-auto border border-gold/30 bg-imperial/90 px-3 py-2 text-[0.6rem] uppercase leading-relaxed tracking-[0.16em] text-gold/80 backdrop-blur">
        Preview environment
        <span className="mt-1 block text-[0.58rem] normal-case tracking-normal text-silver/60">
          Demonstration listings. Connect Supabase to publish real records.
        </span>
      </div>
    </div>
  );
}
