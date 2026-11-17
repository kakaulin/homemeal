"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import type { Catalog, PreferredStore } from "./catalog";
import type { Dish, Meal } from "./types";

type HomeMealState = {
  dishes: Dish[];
  meals: Meal[];
  preferredStore: PreferredStore;

  /** true после чтения localStorage — до этого рендерим заглушку. */
  hydrated: boolean;

  /** Каталог из Object Storage, не персистится. */
  catalog: Catalog | null;
  catalogLoading: boolean;
  catalogError: string | null;

  loadCatalog: (force?: boolean) => Promise<void>;
  setPreferredStore: (store: PreferredStore) => void;

  addDish: (d: Dish) => void;
  updateDish: (id: string, patch: Partial<Dish>) => void;
  deleteDish: (id: string) => void;

  addMeal: (m: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;

  setHydrated: () => void;
};

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useHomeMeal = create<HomeMealState>()(
  persist(
    (set, get) => ({
      dishes: [],
      meals: [],
      preferredStore: "min",
      hydrated: false,

      catalog: null,
      catalogLoading: false,
      catalogError: null,

      loadCatalog: async (force = false) => {
        const url = process.env.NEXT_PUBLIC_CATALOG_URL;
        const state = get();

        if (!url) {
          set({ catalogError: "Каталог не настроен", catalogLoading: false });
          return;
        }
        if (!force && (state.catalog || state.catalogLoading)) return;

        set({ catalogLoading: true, catalogError: null });

        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const catalog = (await response.json()) as Catalog;
          set({ catalog, catalogLoading: false });
        } catch (error) {
          set({
            catalogLoading: false,
            catalogError: error instanceof Error ? error.message : "Не удалось загрузить каталог",
          });
        }
      },

      setPreferredStore: (preferredStore) => set({ preferredStore }),

      addDish: (dish) => set((state) => ({ dishes: [...state.dishes, dish] })),

      updateDish: (id, patch) =>
        set((state) => ({
          dishes: state.dishes.map((dish) =>
            dish.id === id ? { ...dish, ...patch } : dish,
          ),
        })),

      deleteDish: (id) =>
        set((state) => ({
          dishes: state.dishes.filter((dish) => dish.id !== id),
          meals: state.meals.map((meal) => ({
            ...meal,
            items: meal.items.filter((item) => item.dishId !== id),
          })),
        })),

      addMeal: (meal) => set((state) => ({ meals: [...state.meals, meal] })),

      updateMeal: (id, patch) =>
        set((state) => ({
          meals: state.meals.map((meal) => (meal.id === id ? { ...meal, ...patch } : meal)),
        })),

      deleteMeal: (id) =>
        set((state) => ({ meals: state.meals.filter((meal) => meal.id !== id) })),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "home-meal-mvp",
      version: 2,
      storage: createJSONStorage<Pick<HomeMealState, "dishes" | "meals" | "preferredStore">>(
        () => (typeof window === "undefined" ? serverStorage : window.localStorage),
      ),
      partialize: (state) => ({
        dishes: state.dishes,
        meals: state.meals,
        preferredStore: state.preferredStore,
      }),
      // v1 содержал демо-каталог и примеры блюд — сбрасываем, каталог теперь с сервера.
      migrate: (persisted, version) => {
        if (version < 2) {
          return { dishes: [], meals: [], preferredStore: "min" as PreferredStore };
        }
        return persisted as {
          dishes: Dish[];
          meals: Meal[];
          preferredStore: PreferredStore;
        };
      },
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export const useHydrated = () => useHomeMeal((state) => state.hydrated);

export const createId = (prefix: string) => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
};
