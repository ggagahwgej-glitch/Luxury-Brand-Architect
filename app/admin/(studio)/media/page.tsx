import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata: Metadata = { title: "Media Library" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const items = await getRepository().listAllMedia();

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 border-b border-white/[0.07] pb-5">
        <p className="text-[0.58rem] uppercase tracking-[0.26em] text-gold/80">Assets</p>
        <h1 className="font-display text-3xl text-ivory">Media Library</h1>
        <p className="text-[0.74rem] text-silver/50">
          Every uploaded image and video, with its parent listing. Deleting here removes the stored file.
        </p>
      </header>

      <MediaLibrary items={items} />
    </div>
  );
}
