import { Card } from "@heroui/react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border border-dashed border-border bg-surface">
      <Card.Content className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-base font-semibold">{title}</p>
        <p className="max-w-md text-sm text-muted">{description}</p>
        {action}
      </Card.Content>
    </Card>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загрузка данных…</span>
      <div className="h-9 w-full animate-pulse rounded-xl bg-default" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-14 w-full animate-pulse rounded-xl bg-default"
        />
      ))}
    </div>
  );
}
