import { Skeleton } from "@/components/ui/skeleton";

type PageLoadingProps = {
  summaryCards?: number;
  detailSidebar?: boolean;
  tables?: number;
};

export function PageLoading({
  summaryCards = 0,
  detailSidebar = false,
  tables = 1,
}: PageLoadingProps) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-full max-w-3xl" />
        </div>
        <Skeleton className="h-12 w-full max-w-56 rounded-2xl" />
      </div>

      <Skeleton className="h-[120px] rounded-[28px]" />

      {summaryCards > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: summaryCards }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[28px]" />
          ))}
        </div>
      ) : null}

      {detailSidebar ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
          <Skeleton className="h-[420px] rounded-[28px]" />
          <div className="space-y-6">
            <Skeleton className="h-[240px] rounded-[28px]" />
            <Skeleton className="h-[240px] rounded-[28px]" />
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        {Array.from({ length: tables }).map((_, index) => (
          <Skeleton key={index} className="h-[360px] rounded-[32px]" />
        ))}
      </div>
    </div>
  );
}
