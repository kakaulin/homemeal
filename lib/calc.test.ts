import { describe, expect, it } from "vitest";

import { calculateDish, calculateMeal } from "./calc";
import type { Dish, Meal, Product } from "./types";

const gramProduct = (
  id: string,
  name: string,
  pricePer100: number,
  kcal100: number,
  protein100: number,
  fat100: number,
  carbs100: number,
): Product => ({
  id,
  name,
  category: "Прочее",
  unit: "g",
  pricePer100,
  kcal100,
  protein100,
  fat100,
  carbs100,
});

const rice = gramProduct("p-rice", "Рис", 10, 344, 6.7, 0.7, 78.9);
const chicken = gramProduct(
  "p-chicken",
  "Куриная грудка",
  45,
  110,
  23,
  1.5,
  0,
);
const butter = gramProduct("p-butter", "Масло сливочное", 90, 748, 0.5, 82.5, 0.8);
const tea = gramProduct("p-tea", "Чай зелёный", 2, 1, 0, 0, 0.2);
const buckwheat = gramProduct("p-buckwheat", "Гречка", 12, 343, 12.6, 3.3, 62.1);

const egg: Product = {
  id: "p-egg",
  name: "Яйцо куриное",
  category: "Яйца",
  unit: "piece",
  pricePerPiece: 8.5,
  gramsPerPiece: 55,
  kcalPerPiece: 78,
  proteinPerPiece: 6.3,
  fatPerPiece: 5.3,
  carbsPerPiece: 0.4,
};

const dish = (patch: Partial<Dish> & Pick<Dish, "id" | "name" | "items">): Dish => ({
  cookedWeightGrams: 0,
  category: "Прочее",
  servingType: "standalone",
  ...patch,
});

describe("calculateDish", () => {
  it("считает блюдо из одного продукта", () => {
    const one = dish({
      id: "d1",
      name: "Гречка отварная",
      items: [{ productId: buckwheat.id, grams: 100 }],
      cookedWeightGrams: 100,
    });

    const totals = calculateDish(one, [buckwheat]);

    expect(totals).not.toBeNull();
    expect(totals!.totalCost).toBeCloseTo(12, 10);
    expect(totals!.totalKcal).toBeCloseTo(343, 10);
    expect(totals!.totalProtein).toBeCloseTo(12.6, 10);
    expect(totals!.totalFat).toBeCloseTo(3.3, 10);
    expect(totals!.totalCarbs).toBeCloseTo(62.1, 10);
    // Готовый вес равен сырому — показатели на 100 г совпадают с продуктом.
    expect(totals!.costPer100).toBeCloseTo(12, 10);
    expect(totals!.kcalPer100).toBeCloseTo(343, 10);
  });

  it("считает блюдо из трёх продуктов с ужаркой (сырой вес ≠ готовому)", () => {
    // Сырой вес 150 + 200 + 20 = 370 г, готовый вес 300 г.
    const three = dish({
      id: "d2",
      name: "Рис с курицей",
      items: [
        { productId: rice.id, grams: 150 },
        { productId: chicken.id, grams: 200 },
        { productId: butter.id, grams: 20 },
      ],
      cookedWeightGrams: 300,
    });

    const totals = calculateDish(three, [rice, chicken, butter]);

    expect(totals).not.toBeNull();

    // 15 + 90 + 18
    expect(totals!.totalCost).toBeCloseTo(123, 10);
    // 516 + 220 + 149,6
    expect(totals!.totalKcal).toBeCloseTo(885.6, 10);
    // 10,05 + 46 + 0,1
    expect(totals!.totalProtein).toBeCloseTo(56.15, 10);
    // 1,05 + 3 + 16,5
    expect(totals!.totalFat).toBeCloseTo(20.55, 10);
    // 118,35 + 0 + 0,16
    expect(totals!.totalCarbs).toBeCloseTo(118.51, 10);

    // На 100 г готового блюда — делим на 300, а не на 370.
    expect(totals!.costPer100).toBeCloseTo(41, 10);
    expect(totals!.kcalPer100).toBeCloseTo(295.2, 10);
    expect(totals!.proteinPer100).toBeCloseTo(18.7166666667, 8);
    expect(totals!.fatPer100).toBeCloseTo(6.85, 10);
    expect(totals!.carbsPer100).toBeCloseTo(39.5033333333, 8);
  });

  it("пересчитывает штучный продукт через вес одной штуки", () => {
    const omelette = dish({
      id: "d3",
      name: "Омлет",
      items: [{ productId: egg.id, grams: 110 }],
      cookedWeightGrams: 110,
    });

    const totals = calculateDish(omelette, [egg]);

    expect(totals).not.toBeNull();
    // 110 г при 55 г за штуку = 2 штуки.
    expect(totals!.totalCost).toBeCloseTo(17, 10);
    expect(totals!.totalKcal).toBeCloseTo(156, 10);
    expect(totals!.totalProtein).toBeCloseTo(12.6, 10);
  });

  it("возвращает null, если итоговый вес блюда не задан", () => {
    const noWeight = dish({
      id: "d4",
      name: "Без веса",
      items: [{ productId: rice.id, grams: 100 }],
      cookedWeightGrams: 0,
    });

    expect(calculateDish(noWeight, [rice])).toBeNull();

    const negative = { ...noWeight, cookedWeightGrams: -50 };
    expect(calculateDish(negative, [rice])).toBeNull();
  });

  it("пропускает удалённые продукты вместо падения", () => {
    const dangling = dish({
      id: "d5",
      name: "С удалённым продуктом",
      items: [
        { productId: "p-missing", grams: 100 },
        { productId: rice.id, grams: 100 },
      ],
      cookedWeightGrams: 200,
    });

    const totals = calculateDish(dangling, [rice]);

    expect(totals).not.toBeNull();
    expect(totals!.totalCost).toBeCloseTo(10, 10);
    expect(totals!.totalKcal).toBeCloseTo(344, 10);
  });
});

describe("calculateMeal", () => {
  it("складывает два блюда с разными порциями", () => {
    const mainDish = dish({
      id: "d-main",
      name: "Рис с курицей",
      items: [
        { productId: rice.id, grams: 150 },
        { productId: chicken.id, grams: 200 },
        { productId: butter.id, grams: 20 },
      ],
      cookedWeightGrams: 300,
    });

    const teaDish = dish({
      id: "d-tea",
      name: "Чай зелёный",
      items: [{ productId: tea.id, grams: 5 }],
      cookedWeightGrams: 250,
      servingType: "beverage",
    });

    const lunch: Meal = {
      id: "m1",
      name: "Обед",
      items: [
        { dishId: mainDish.id, portionGrams: 200 },
        { dishId: teaDish.id, portionGrams: 250 },
      ],
    };

    const totals = calculateMeal(lunch, [mainDish, teaDish], [
      rice,
      chicken,
      butter,
      tea,
    ]);

    // Основное блюдо: 200/300 от 123 ₽, 885,6 ккал, 56,15 белка.
    // Напиток: вся порция 250 г, то есть 5 г заварки.
    expect(totals.totalCost).toBeCloseTo(82.1, 8);
    expect(totals.totalKcal).toBeCloseTo(590.45, 8);
    expect(totals.totalProtein).toBeCloseTo(37.4333333333, 8);
    expect(totals.totalFat).toBeCloseTo(13.7, 8);
    expect(totals.totalCarbs).toBeCloseTo(79.0166666667, 8);
    expect(totals.totalGrams).toBeCloseTo(450, 8);
  });

  it("возвращает нули для пустого приёма пищи и пропускает удалённые блюда", () => {
    const empty = calculateMeal({ id: "m2", name: "Пусто", items: [] }, [], []);
    expect(empty).toEqual({
      totalCost: 0,
      totalKcal: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalGrams: 0,
    });

    const missing = calculateMeal(
      { id: "m3", name: "Удалено", items: [{ dishId: "nope", portionGrams: 100 }] },
      [],
      [],
    );
    expect(missing.totalCost).toBe(0);
  });

  it("не учитывает блюдо без итогового веса", () => {
    const noWeight = dish({
      id: "d-no-weight",
      name: "Без веса",
      items: [{ productId: rice.id, grams: 100 }],
      cookedWeightGrams: 0,
    });

    const totals = calculateMeal(
      { id: "m4", name: "Обед", items: [{ dishId: noWeight.id, portionGrams: 100 }] },
      [noWeight],
      [rice],
    );

    expect(totals.totalCost).toBe(0);
    expect(totals.totalKcal).toBe(0);
  });
});
