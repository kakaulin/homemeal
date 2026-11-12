/**
 * Разбор чисел из русскоязычного ввода: «1 234,56» → 1234.56.
 * Возвращает null для пустого или некорректного значения.
 */
export function parseNumber(input: string): number | null {
  const normalized = input.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Число из ввода, где пустая строка означает 0. */
export function parseNumberOrZero(input: string): number {
  return parseNumber(input) ?? 0;
}

/** Число для поля ввода — с запятой и без хвостовых нулей. */
export function toInputValue(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}
