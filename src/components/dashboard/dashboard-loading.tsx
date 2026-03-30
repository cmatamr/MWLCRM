import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-full max-w-3xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-[28px]" />
        ))}
      </div>

      <Skeleton className="h-[420px] rounded-[32px]" />

      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[360px] rounded-[32px] xl:col-span-2" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <Skeleton className="h-[220px] rounded-[32px]" />
          <Skeleton className="h-[220px] rounded-[32px]" />
        </div>
      </div>

      <Skeleton className="h-[520px] rounded-[32px]" />

      <Skeleton className="h-[420px] rounded-[32px]" />
    </div>
  );
}
