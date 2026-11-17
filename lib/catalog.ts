import type { Product } from "./types";

export type PreferredStore = "min" | "magnit" | "lenta";
export type CatalogStoreKey = "magnit" | "lenta";

export type NutritionPer100 = {
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
};

export type CatalogStorePrice = {
  price: number | null;
  pricePer100: number | null;
  priceRegular: number | null;
  inStock: boolean;
  lastSuccessAt: string | null;
  lastStatus: string | null;
  url: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  category: string | null;
  unit: "g" | "ml" | "piece";
  packWeightGrams: number | null;
  nutritionPer100: NutritionPer100 | null;
  stores: Partial<Record<CatalogStoreKey, CatalogStorePrice>>;
};

export type Catalog = {
  city: string;
  storesMeta: Partial<Record<CatalogStoreKey, string>>;
  updatedAt: string;
  products: CatalogProduct[];
};

export const STORE_LABELS: Record<CatalogStoreKey, string> = {
  magnit: "Магнит",
  lenta: "Лента",
};

export const PREFERRED_OPTIONS: { id: PreferredStore; label: string }[] = [
  { id: "min", label: "Выгоднее" },
  { id: "magnit", label: "Магнит" },
  { id: "lenta", label: "Лента" },
];

export const STALE_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Novosibirsk",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Novosibirsk",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

/** «1 декабря в 4:00» в таймзоне Новосибирска (GMT+7). */
export function formatUpdatedAt(iso?: string | null): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return `${dateFormatter.format(date)} в ${timeFormatter.format(date)}`;
}

export function formatUpdatedLabel(iso?: string | null): string {
  const formatted = formatUpdatedAt(iso);
  return formatted ? `обновлено ${formatted} (GMT+7)` : "нет данных об обновлении";
}

/** Цена не обновлялась 15 дней и дольше. */
export function isStale(iso?: string | null, days = STALE_DAYS): boolean {
  if (!iso) return false;

  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return false;

  return Date.now() - parsed >= days * DAY_MS;
}

function usable(store?: CatalogStorePrice): CatalogStorePrice | null {
  if (!store || store.price == null || store.price <= 0) return null;
  return store;
}

export type PickedStore = { key: CatalogStoreKey; price: CatalogStorePrice };

/** Цена магазина для расчёта блюд: «Выгоднее» — минимальная из доступных. */
export function pickStore(
  product: CatalogProduct,
  preferred: PreferredStore,
): PickedStore | null {
  if (preferred !== "min") {
    const selected = usable(product.stores[preferred]);
    if (selected) return { key: preferred, price: selected };

    const fallbackKey: CatalogStoreKey = preferred === "magnit" ? "lenta" : "magnit";
    const fallback = usable(product.stores[fallbackKey]);
    return fallback ? { key: fallbackKey, price: fallback } : null;
  }

  const candidates = (["magnit", "lenta"] as const)
    .map((key) => ({ key, price: usable(product.stores[key]) }))
    .filter((candidate): candidate is PickedStore => candidate.price !== null);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (a.price.price ?? 0) - (b.price.price ?? 0));
  return candidates[0];
}

function pricePer100Of(price: CatalogStorePrice, packWeightGrams: number | null) {
  if (price.pricePer100 != null) return price.pricePer100;
  if (packWeightGrams && packWeightGrams > 0 && price.price != null) {
    return Math.round((price.price / packWeightGrams) * 100 * 100) / 100;
  }
  return null;
}

/** Облачный каталог → Product[] для lib/calc.ts. */
export function catalogToProducts(
  catalog: Catalog | null,
  preferred: PreferredStore,
): Product[] {
  const products: Product[] = [];

  for (const product of catalog?.products ?? []) {
    const chosen = pickStore(product, preferred);
    if (!chosen) continue;

    const nutrition = product.nutritionPer100;
    const weight = product.packWeightGrams;
    const category = product.category ?? "Прочее";

    if (product.unit === "piece") {
      const gramsPerPiece = weight ?? 0;
      const factor = gramsPerPiece > 0 ? gramsPerPiece / 100 : 0;

      products.push({
        id: product.id,
        name: product.name,
        category,
        unit: "piece",
        pricePerPiece: chosen.price.price ?? 0,
        gramsPerPiece,
        kcalPerPiece: (nutrition?.kcal ?? 0) * factor,
        proteinPerPiece: (nutrition?.protein ?? 0) * factor,
        fatPerPiece: (nutrition?.fat ?? 0) * factor,
        carbsPerPiece: (nutrition?.carbs ?? 0) * factor,
      });
      continue;
    }

    products.push({
      id: product.id,
      name: product.name,
      category,
      unit: product.unit === "ml" ? "ml" : "g",
      pricePer100: pricePer100Of(chosen.price, weight) ?? 0,
      kcal100: nutrition?.kcal ?? 0,
      protein100: nutrition?.protein ?? 0,
      fat100: nutrition?.fat ?? 0,
      carbs100: nutrition?.carbs ?? 0,
    });
  }

  return products;
}
