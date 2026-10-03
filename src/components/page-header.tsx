// Phones: the action sits on its own line under the title. Larger screens: it stays top right and the
// description wraps beside it, however long it is.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
      <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
