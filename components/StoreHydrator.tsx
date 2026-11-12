"use client";

import { useEffect } from "react";

import { useHomeMeal } from "@/lib/store";

/**
 * persist создаётся с skipHydration, чтобы серверный HTML и первый клиентский
 * рендер совпадали. Здесь читаем localStorage один раз после монтирования.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useHomeMeal.persist.rehydrate();
  }, []);

  return null;
}
