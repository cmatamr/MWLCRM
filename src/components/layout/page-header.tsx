type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
        Workspace
      </p>
      <div className="space-y-2">
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
