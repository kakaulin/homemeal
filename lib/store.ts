"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { seedDishes, seedMeals, seedProducts } from "./seed";
import type { Dish, Meal, Product } from "./types";

type HomeMealState = {
  products: Product[];
  dishes: Dish[];
  meals: Meal[];
  /** true после чтения localStorage — до этого рендерим заглушку, чтобы не было рассинхрона гидратации. */
  hydrated: boolean;

  addProduct: (p: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addDish: (d: Dish) => void;
  updateDish: (id: string, patch: Partial<Dish>) => void;
  deleteDish: (id: string) => void;

  addMeal: (m: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;

  setHydrated: () => void;
};

/** В localStorage попадает только предметное состояние, без флагов и методов. */
type PersistedState = Pick<HomeMealState, "products" | "dishes" | "meals">;

/** Заглушка хранилища для сервера: persist не должен трогать window при SSR. */
const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useHomeMeal = create<HomeMealState>()(
  persist(
    (set) => ({
      products: seedProducts,
      dishes: seedDishes,
      meals: seedMeals,
      hydrated: false,

      addProduct: (p) => set((state) => ({ products: [...state.products, p] })),

      updateProduct: (id, patch) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? { ...product, ...patch } : product,
          ),
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
          // Убираем позицию из состава блюд, чтобы не оставалось «висячих» ссылок.
          dishes: state.dishes.map((dish) => ({
            ...dish,
            items: dish.items.filter((item) => item.productId !== id),
          })),
        })),

      addDish: (d) => set((state) => ({ dishes: [...state.dishes, d] })),

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

      addMeal: (m) => set((state) => ({ meals: [...state.meals, m] })),

      updateMeal: (id, patch) =>
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === id ? { ...meal, ...patch } : meal,
          ),
        })),

      deleteMeal: (id) =>
        set((state) => ({
          meals: state.meals.filter((meal) => meal.id !== id),
        })),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "home-meal-mvp",
      version: 1,
      storage: createJSONStorage<PersistedState>(() =>
        typeof window === "undefined" ? serverStorage : window.localStorage,
      ),
      partialize: (state) => ({
        products: state.products,
        dishes: state.dishes,
        meals: state.meals,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** До чтения localStorage показываем одинаковую на сервере и клиенте заглушку. */
export const useHydrated = () => useHomeMeal((state) => state.hydrated);

export const createId = (prefix: string) => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
};
