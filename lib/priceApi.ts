/** Канонический формат КБЖУ на 100 г, который отдают адаптеры бэкенда. */
export type ApiNutrition = {
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
};

export type ApiItem = {
  store: string;
  name: string;
  price: number;
  priceRegular?: number | null;
  discountPercent?: number | null;
  weightGrams?: number | null;
  pricePer100?: number | null;
  isWeighted?: boolean;
  nutrition?: ApiNutrition | null;
};

export type ApiResponse = {
  product: string;
  price: number;
  pricePer100?: number | null;
  weightGrams?: number | null;
  store: string;
  items?: ApiItem[];
  errors?: unknown[];
};

export const STORE_OPTIONS = [
  { id: "magnit", label: "Магнит" },
  { id: "lenta", label: "Лента" },
  { id: "all", label: "Оба" },
] as const;

const STORE_LABELS: Record<string, string> = { magnit: "Магнит", lenta: "Лента" };

export const storeLabel = (store: string) => STORE_LABELS[store] ?? store;

const rawUrl = process.env.NEXT_PUBLIC_API_URL;

/** null, если URL не задан или это заглушка вида https://<...> — виджеты просто не показываем. */
export const priceApiBase = (() => {
  try {
    return rawUrl ? new URL(rawUrl) : null;
  } catch {
    return null;
  }
})();

/** URL запроса с параметрами store и q (базовые параметры из env сохраняются). */
export function buildPriceUrl(params: { store?: string; q?: string }): string | null {
  if (!priceApiBase) return null;

  const url = new URL(priceApiBase);
  if (params.store) url.searchParams.set("store", params.store);
  if (params.q) url.searchParams.set("q", params.q);
  return url.toString();
}

/** КБЖУ приходит уже в каноническом виде { kcal, protein, fat, carbs }. */
export function readNutrition(nutrition: ApiItem["nutrition"]) {
  return {
    kcal: nutrition?.kcal ?? null,
    protein: nutrition?.protein ?? null,
    fat: nutrition?.fat ?? null,
    carbs: nutrition?.carbs ?? null,
  };
}
