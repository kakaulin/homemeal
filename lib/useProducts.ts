"use client";

import { useMemo } from "react";

import { catalogToProducts } from "./catalog";
import { useHomeMeal } from "./store";

/** Продукты каталога в формате lib/calc.ts с учётом выбранного магазина. */
export function useProducts() {
  const catalog = useHomeMeal((state) => state.catalog);
  const preferredStore = useHomeMeal((state) => state.preferredStore);

  return useMemo(
    () => catalogToProducts(catalog, preferredStore),
    [catalog, preferredStore],
  );
}
