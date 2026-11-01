import { PropertyCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function PropertiesLoading() {
  return (
    <div className="shell pb-20 pt-36">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-6 h-12 w-2/3 max-w-xl" />
      <Skeleton className="mt-4 h-3 w-full max-w-2xl" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
