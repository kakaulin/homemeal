export type ProductUnit = "g" | "ml" | "piece";

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: ProductUnit;
  /** Для unit = "g" | "ml" */
  pricePer100?: number;
  kcal100?: number;
  protein100?: number;
  fat100?: number;
  carbs100?: number;
  /** Для unit = "piece" */
  pricePerPiece?: number;
  gramsPerPiece?: number;
  kcalPerPiece?: number;
  proteinPerPiece?: number;
  fatPerPiece?: number;
  carbsPerPiece?: number;
};

export type DishItem = {
  productId: string;
  /** Всегда в граммах (для ml считаем 1 мл ≈ 1 г) */
  grams: number;
};

export type ServingType = "container" | "beverage" | "standalone";

export type Dish = {
  id: string;
  name: string;
  items: DishItem[];
  /** Итоговый вес готового блюда, г */
  cookedWeightGrams: number;
  /** "Гарниры", "Мясо", "Салаты", "Напитки"... */
  category: string;
  servingType: ServingType;
  /** Условия хранения */
  notes?: string;
};

export type MealItem = {
  dishId: string;
  /** Сколько граммов этого блюда в приёме пищи */
  portionGrams: number;
};

export type Meal = {
  id: string;
  name: string;
  items: MealItem[];
};
