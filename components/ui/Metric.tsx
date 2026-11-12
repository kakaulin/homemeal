import { formatMacro } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className ?? "rounded-xl bg-default px-3 py-2"}>
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </div>
      <div className="tnum mt-0.5 text-sm font-semibold">{value}</div>
      {hint ? <div className="text-[11px] text-muted">{hint}</div> : null}
    </div>
  );
}

/** Компактная строка БЖУ. Двоеточие после буквы нужно, чтобы «Б 56,1» не читалось как число. */
export function Macros({
  protein,
  fat,
  carbs,
  className,
}: {
  protein: number;
  fat: number;
  carbs: number;
  className?: string;
}) {
  const rows = [
    { label: "Б", value: protein },
    { label: "Ж", value: fat },
    { label: "У", value: carbs },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs",
        className,
      )}
    >
      {rows.map((row) => (
        <span key={row.label} className="tnum whitespace-nowrap">
          <span className="text-muted">{row.label}:</span>{" "}
          <span className="font-medium text-foreground">
            {formatMacro(row.value)}
          </span>
        </span>
      ))}
    </div>
  );
}

