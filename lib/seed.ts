import type { Dish, Meal, Product } from "./types";

/**
 * Демонстрационные данные. Цены — условные, средние по России, за 100 г / 100 мл
 * или за штуку; КБЖУ — на те же единицы.
 */
export const seedProducts: Product[] = [
  // Крупы, макароны, картофель
  { id: "prod-rice", name: "Рис белый", category: "Крупы и макароны", unit: "g", pricePer100: 10, kcal100: 344, protein100: 6.7, fat100: 0.7, carbs100: 78.9 },
  { id: "prod-buckwheat", name: "Гречка", category: "Крупы и макароны", unit: "g", pricePer100: 12, kcal100: 343, protein100: 12.6, fat100: 3.3, carbs100: 62.1 },
  { id: "prod-oatmeal", name: "Овсяные хлопья", category: "Крупы и макароны", unit: "g", pricePer100: 9, kcal100: 352, protein100: 12.3, fat100: 6.1, carbs100: 59.5 },
  { id: "prod-pasta", name: "Макароны", category: "Крупы и макароны", unit: "g", pricePer100: 11, kcal100: 350, protein100: 12, fat100: 1.5, carbs100: 70 },
  { id: "prod-bulgur", name: "Булгур", category: "Крупы и макароны", unit: "g", pricePer100: 14, kcal100: 342, protein100: 12.3, fat100: 1.3, carbs100: 63.4 },
  { id: "prod-potato", name: "Картофель", category: "Овощи", unit: "g", pricePer100: 4, kcal100: 77, protein100: 2, fat100: 0.4, carbs100: 16.3 },
  { id: "prod-bread", name: "Хлеб пшеничный", category: "Хлеб", unit: "g", pricePer100: 12, kcal100: 265, protein100: 8, fat100: 3.2, carbs100: 49 },

  // Мясо, рыба, яйца
  { id: "prod-chicken-breast", name: "Куриная грудка", category: "Мясо и рыба", unit: "g", pricePer100: 45, kcal100: 110, protein100: 23, fat100: 1.5, carbs100: 0 },
  { id: "prod-chicken-thigh", name: "Куриное бедро", category: "Мясо и рыба", unit: "g", pricePer100: 32, kcal100: 158, protein100: 19, fat100: 9, carbs100: 0 },
  { id: "prod-beef-mince", name: "Фарш говяжий", category: "Мясо и рыба", unit: "g", pricePer100: 52, kcal100: 250, protein100: 18, fat100: 20, carbs100: 0 },
  { id: "prod-pork-neck", name: "Свинина (шея)", category: "Мясо и рыба", unit: "g", pricePer100: 48, kcal100: 320, protein100: 16, fat100: 29, carbs100: 0 },
  { id: "prod-salmon", name: "Лосось", category: "Мясо и рыба", unit: "g", pricePer100: 110, kcal100: 208, protein100: 20, fat100: 13, carbs100: 0 },
  { id: "prod-pollock", name: "Минтай", category: "Мясо и рыба", unit: "g", pricePer100: 38, kcal100: 72, protein100: 16, fat100: 0.9, carbs100: 0 },
  { id: "prod-egg", name: "Яйцо куриное", category: "Яйца", unit: "piece", pricePerPiece: 8.5, gramsPerPiece: 55, kcalPerPiece: 78, proteinPerPiece: 6.3, fatPerPiece: 5.3, carbsPerPiece: 0.4 },

  // Молочные продукты и масла
  { id: "prod-milk", name: "Молоко 2,5%", category: "Молочные продукты", unit: "ml", pricePer100: 8, kcal100: 52, protein100: 2.8, fat100: 2.5, carbs100: 4.7 },
  { id: "prod-kefir", name: "Кефир 1%", category: "Молочные продукты", unit: "ml", pricePer100: 7, kcal100: 40, protein100: 2.8, fat100: 1, carbs100: 4 },
  { id: "prod-curd", name: "Творог 5%", category: "Молочные продукты", unit: "g", pricePer100: 35, kcal100: 121, protein100: 17, fat100: 5, carbs100: 3 },
  { id: "prod-cheese", name: "Сыр твёрдый", category: "Молочные продукты", unit: "g", pricePer100: 95, kcal100: 364, protein100: 25, fat100: 29, carbs100: 0 },
  { id: "prod-sour-cream", name: "Сметана 15%", category: "Молочные продукты", unit: "g", pricePer100: 26, kcal100: 158, protein100: 2.6, fat100: 15, carbs100: 3 },
  { id: "prod-butter", name: "Масло сливочное", category: "Масла и соусы", unit: "g", pricePer100: 90, kcal100: 748, protein100: 0.5, fat100: 82.5, carbs100: 0.8 },
  { id: "prod-olive-oil", name: "Масло оливковое", category: "Масла и соусы", unit: "ml", pricePer100: 78, kcal100: 898, protein100: 0, fat100: 99.8, carbs100: 0 },

  // Овощи
  { id: "prod-tomato", name: "Помидор", category: "Овощи", unit: "g", pricePer100: 18, kcal100: 20, protein100: 1.1, fat100: 0.2, carbs100: 3.7 },
  { id: "prod-cucumber", name: "Огурец", category: "Овощи", unit: "g", pricePer100: 12, kcal100: 15, protein100: 0.8, fat100: 0.1, carbs100: 2.8 },
  { id: "prod-onion", name: "Лук репчатый", category: "Овощи", unit: "g", pricePer100: 6, kcal100: 41, protein100: 1.4, fat100: 0.2, carbs100: 10.4 },
  { id: "prod-carrot", name: "Морковь", category: "Овощи", unit: "g", pricePer100: 5, kcal100: 35, protein100: 1.3, fat100: 0.1, carbs100: 6.9 },
  { id: "prod-cabbage", name: "Капуста белокочанная", category: "Овощи", unit: "g", pricePer100: 4, kcal100: 28, protein100: 1.8, fat100: 0.1, carbs100: 4.7 },
  { id: "prod-pepper", name: "Перец болгарский", category: "Овощи", unit: "g", pricePer100: 22, kcal100: 27, protein100: 1.3, fat100: 0.1, carbs100: 5.3 },
  { id: "prod-garlic", name: "Чеснок", category: "Овощи", unit: "g", pricePer100: 30, kcal100: 149, protein100: 6.5, fat100: 0.5, carbs100: 29.9 },

  // Фрукты
  { id: "prod-banana", name: "Банан", category: "Фрукты", unit: "g", pricePer100: 12, kcal100: 96, protein100: 1.5, fat100: 0.2, carbs100: 21.8 },
  { id: "prod-apple", name: "Яблоко", category: "Фрукты", unit: "g", pricePer100: 10, kcal100: 52, protein100: 0.4, fat100: 0.4, carbs100: 9.8 },
  { id: "prod-orange", name: "Апельсин", category: "Фрукты", unit: "g", pricePer100: 14, kcal100: 47, protein100: 0.9, fat100: 0.2, carbs100: 8.1 },

  // Напитки и бакалея
  { id: "prod-tea", name: "Чай зелёный (заварка)", category: "Напитки", unit: "g", pricePer100: 25, kcal100: 1, protein100: 0, fat100: 0, carbs100: 0.2 },
  { id: "prod-coffee", name: "Кофе молотый", category: "Напитки", unit: "g", pricePer100: 90, kcal100: 200, protein100: 12, fat100: 14, carbs100: 3 },
  { id: "prod-soy-sauce", name: "Соевый соус", category: "Масла и соусы", unit: "ml", pricePer100: 9, kcal100: 58, protein100: 6, fat100: 0.1, carbs100: 6 },
  { id: "prod-tomato-paste", name: "Томатная паста", category: "Бакалея", unit: "g", pricePer100: 22, kcal100: 82, protein100: 4.2, fat100: 0.5, carbs100: 19 },
  { id: "prod-mayo", name: "Майонез", category: "Масла и соусы", unit: "g", pricePer100: 30, kcal100: 680, protein100: 1, fat100: 74, carbs100: 3 },
  { id: "prod-sugar", name: "Сахар", category: "Бакалея", unit: "g", pricePer100: 8, kcal100: 400, protein100: 0, fat100: 0, carbs100: 99.8 },
  { id: "prod-honey", name: "Мёд", category: "Бакалея", unit: "g", pricePer100: 60, kcal100: 304, protein100: 0.8, fat100: 0, carbs100: 80.3 },
  { id: "prod-salt", name: "Соль", category: "Бакалея", unit: "g", pricePer100: 2, kcal100: 0, protein100: 0, fat100: 0, carbs100: 0 },
];

export const seedDishes: Dish[] = [
  {
    id: "dish-rice-chicken",
    name: "Рис с курицей",
    items: [
      { productId: "prod-rice", grams: 150 },
      { productId: "prod-chicken-breast", grams: 200 },
      { productId: "prod-butter", grams: 10 },
    ],
    cookedWeightGrams: 300,
    category: "Мясо",
    servingType: "container",
    notes: "Хранить в холодильнике до 3 суток, разогревать в микроволновке 2 минуты.",
  },
  {
    id: "dish-buckwheat",
    name: "Гречка отварная",
    items: [{ productId: "prod-buckwheat", grams: 100 }],
    cookedWeightGrams: 250,
    category: "Гарниры",
    servingType: "container",
    notes: "Хранить до 4 суток при температуре +2…+6 °C.",
  },
  {
    id: "dish-veg-salad",
    name: "Салат овощной",
    items: [
      { productId: "prod-tomato", grams: 150 },
      { productId: "prod-cucumber", grams: 100 },
      { productId: "prod-onion", grams: 30 },
      { productId: "prod-olive-oil", grams: 10 },
    ],
    cookedWeightGrams: 270,
    category: "Салаты",
    servingType: "container",
    notes: "Заправлять перед подачей. Хранить не более 12 часов.",
  },
  {
    id: "dish-tea",
    name: "Чай зелёный",
    items: [{ productId: "prod-tea", grams: 5 }],
    cookedWeightGrams: 250,
    category: "Напитки",
    servingType: "beverage",
    notes: "Пить свежим, не хранить.",
  },
  {
    id: "dish-omelette",
    name: "Омлет с сыром",
    items: [
      { productId: "prod-egg", grams: 110 },
      { productId: "prod-milk", grams: 50 },
      { productId: "prod-cheese", grams: 30 },
      { productId: "prod-butter", grams: 5 },
    ],
    cookedWeightGrams: 180,
    category: "Завтраки",
    servingType: "standalone",
    notes: "Готовить непосредственно перед едой.",
  },
  {
    id: "dish-oatmeal-banana",
    name: "Овсяная каша с бананом",
    items: [
      { productId: "prod-oatmeal", grams: 60 },
      { productId: "prod-milk", grams: 200 },
      { productId: "prod-banana", grams: 100 },
    ],
    cookedWeightGrams: 340,
    category: "Завтраки",
    servingType: "standalone",
    notes: "Хранить до 24 часов, лучше есть сразу.",
  },
  {
    id: "dish-salmon",
    name: "Лосось на пару",
    items: [
      { productId: "prod-salmon", grams: 180 },
      { productId: "prod-salt", grams: 2 },
    ],
    cookedWeightGrams: 160,
    category: "Мясо",
    servingType: "container",
    notes: "Хранить в холодильнике не более 24 часов.",
  },
  {
    id: "dish-compote",
    name: "Компот из яблок",
    items: [
      { productId: "prod-apple", grams: 200 },
      { productId: "prod-sugar", grams: 30 },
    ],
    cookedWeightGrams: 500,
    category: "Напитки",
    servingType: "beverage",
    notes: "Хранить в холодильнике до 2 суток.",
  },
];

export const seedMeals: Meal[] = [
  {
    id: "meal-breakfast",
    name: "Завтрак",
    items: [
      { dishId: "dish-oatmeal-banana", portionGrams: 340 },
      { dishId: "dish-tea", portionGrams: 250 },
    ],
  },
];
