import type { Dish, DishItem, Meal, Product } from "./types";

export type DishTotals = {
  totalCost: number;
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  kcalPer100: number;
  costPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
};

export type MealTotals = {
  totalCost: number;
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  /** Суммарный вес порций приёма пищи, г */
  totalGrams: number;
};

export type DishItemTotals = {
  cost: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

const EMPTY_ITEM_TOTALS: DishItemTotals = {
  cost: 0,
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
};

/**
 * Числовой коэффициент «сколько единиц продукта в граммах».
 * Для g/ml: 100 г = 1 единица. Для piece: gramsPerPiece = 1 единица.
 */
export function unitFactor(product: Product, grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;

  if (product.unit === "piece") {
    const perPiece = product.gramsPerPiece ?? 0;
    if (!Number.isFinite(perPiece) || perPiece <= 0) return 0;
    return grams / perPiece;
  }

  return grams / 100;
}

/** Стоимость и КБЖУ одной позиции блюда в её граммах. */
export function calculateDishItem(
  item: DishItem,
  product: Product,
): DishItemTotals {
  const factor = unitFactor(product, item.grams);
  if (factor === 0) return { ...EMPTY_ITEM_TOTALS };

  const isPiece = product.unit === "piece";

  return {
    cost: factor * ((isPiece ? product.pricePerPiece : product.pricePer100) ?? 0),
    kcal: factor * ((isPiece ? product.kcalPerPiece : product.kcal100) ?? 0),
    protein:
      factor * ((isPiece ? product.proteinPerPiece : product.protein100) ?? 0),
    fat: factor * ((isPiece ? product.fatPerPiece : product.fat100) ?? 0),
    carbs:
      factor * ((isPiece ? product.carbsPerPiece : product.carbs100) ?? 0),
  };
}

/**
 * Итоги блюда: суммы по составу и показатели на 100 г готового блюда.
 * Возвращает null, если итоговый вес не задан (<= 0) — делить нельзя.
 */
export function calculateDish(
  dish: Dish,
  products: Product[],
): DishTotals | null {
  const cookedWeightGrams = dish.cookedWeightGrams;

  if (!Number.isFinite(cookedWeightGrams) || cookedWeightGrams <= 0) {
    return null;
  }

  const byId = new Map(products.map((product) => [product.id, product]));

  let totalCost = 0;
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  for (const item of dish.items) {
    const product = byId.get(item.productId);
    // Продукт мог быть удалён — такая позиция не даёт вклада.
    if (!product) continue;

    const totals = calculateDishItem(item, product);
    totalCost += totals.cost;
    totalKcal += totals.kcal;
    totalProtein += totals.protein;
    totalFat += totals.fat;
    totalCarbs += totals.carbs;
  }

  const per100 = (value: number) => (value / cookedWeightGrams) * 100;

  return {
    totalCost,
    totalKcal,
    totalProtein,
    totalFat,
    totalCarbs,
    costPer100: per100(totalCost),
    kcalPer100: per100(totalKcal),
    proteinPer100: per100(totalProtein),
    fatPer100: per100(totalFat),
    carbsPer100: per100(totalCarbs),
  };
}

/** Итоги готового блюда, приведённые к произвольному весу порции. */
export function scaleDishTotals(
  totals: DishTotals,
  portionGrams: number,
  cookedWeightGrams: number,
): DishTotals {
  if (
    !Number.isFinite(portionGrams) ||
    portionGrams <= 0 ||
    !Number.isFinite(cookedWeightGrams) ||
    cookedWeightGrams <= 0
  ) {
    return {
      totalCost: 0,
      totalKcal: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      kcalPer100: totals.kcalPer100,
      costPer100: totals.costPer100,
      proteinPer100: totals.proteinPer100,
      fatPer100: totals.fatPer100,
      carbsPer100: totals.carbsPer100,
    };
  }

  const factor = portionGrams / cookedWeightGrams;

  return {
    totalCost: totals.totalCost * factor,
    totalKcal: totals.totalKcal * factor,
    totalProtein: totals.totalProtein * factor,
    totalFat: totals.totalFat * factor,
    totalCarbs: totals.totalCarbs * factor,
    kcalPer100: totals.kcalPer100,
    costPer100: totals.costPer100,
    proteinPer100: totals.proteinPer100,
    fatPer100: totals.fatPer100,
    carbsPer100: totals.carbsPer100,
  };
}

/**
 * Итоги приёма пищи: складывает доли блюд пропорционально весу порции.
 * Блюда, у которых не задан итоговый вес, и удалённые блюда пропускаются.
 */
export function calculateMeal(
  meal: Meal,
  dishes: Dish[],
  products: Product[],
): MealTotals {
  const byId = new Map(dishes.map((dish) => [dish.id, dish]));

  let totalCost = 0;
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let totalGrams = 0;

  for (const item of meal.items) {
    const dish = byId.get(item.dishId);
    if (!dish) continue;

    const dishTotals = calculateDish(dish, products);
    if (!dishTotals) continue;

    const scaled = scaleDishTotals(
      dishTotals,
      item.portionGrams,
      dish.cookedWeightGrams,
    );

    totalCost += scaled.totalCost;
    totalKcal += scaled.totalKcal;
    totalProtein += scaled.totalProtein;
    totalFat += scaled.totalFat;
    totalCarbs += scaled.totalCarbs;
    totalGrams += Math.max(0, item.portionGrams);
  }

  return { totalCost, totalKcal, totalProtein, totalFat, totalCarbs, totalGrams };
}
