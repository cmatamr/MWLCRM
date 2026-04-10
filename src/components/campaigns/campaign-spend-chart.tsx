import { formatCurrencyCRC } from "@/lib/formatters";
import type { CampaignSpendPoint } from "@/server/services/campaigns";

type CampaignSpendChartProps = {
  data: CampaignSpendPoint[];
};

function getChartPath(data: CampaignSpendPoint[]) {
  if (data.length === 0) {
    return {
      line: "",
      area: "",
      max: 0,
      total: 0,
    };
  }

  const max = Math.max(...data.map((point) => point.spendCrc), 0);
  const safeMax = max > 0 ? max : 1;

  const points = data.map((point, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - (point.spendCrc / safeMax) * 100;

    return `${x},${y}`;
  });

  return {
    line: points.join(" "),
    area: [`0,100`, ...points, `100,100`].join(" "),
    max,
    total: data.reduce((sum, point) => sum + point.spendCrc, 0),
  };
}

export function CampaignSpendChart({ data }: CampaignSpendChartProps) {
  const { line, area, max, total } = getChartPath(data);

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Spend
            </p>
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                Evolución de gasto
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Serie diaria agregada desde `campaign_spend`, lista para extenderse a ROI y pacing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Spend total</p>
              <p className="mt-2 text-lg font-semibold">{formatCurrencyCRC(total)}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
              <p className="text-xs uppercase tracking-[0.18em]">Pico diario</p>
              <p className="mt-2 text-lg font-semibold">{formatCurrencyCRC(max)}</p>
            </div>
          </div>
        </div>

        {data.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px]">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(14,116,144,0.10),rgba(255,255,255,0.7))] p-4">
              <div className="h-72">
                <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="campaignSpendArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>

                  {[25, 50, 75].map((linePosition) => (
                    <line
                      key={linePosition}
                      x1="0"
                      x2="100"
                      y1={linePosition}
                      y2={linePosition}
                      stroke="rgba(100,116,139,0.18)"
                      strokeDasharray="1.5 2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  <polygon fill="url(#campaignSpendArea)" points={area} />
                  <polyline
                    fill="none"
                    points={line}
                    stroke="hsl(var(--chart-2))"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground md:grid-cols-6">
                {data.map((point) => (
                  <div key={point.date} className="space-y-1">
                    <p className="font-medium text-slate-700">{point.label}</p>
                    <p>{formatCurrencyCRC(point.spendCrc)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Días con gasto</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{data.length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lectura</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  La curva muestra cómo se distribuye la inversión en el tiempo y sirve como base para pacing y ROI.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-4 py-10 text-sm text-muted-foreground">
            Esta campaña todavía no tiene registros en `campaign_spend`.
          </div>
        )}
      </div>
    </section>
  );
}
