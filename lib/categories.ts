export const PRODUCT_CATEGORIES = [
  "Крупы и макароны",
  "Мясо и рыба",
  "Яйца",
  "Молочные продукты",
  "Овощи",
  "Фрукты",
  "Напитки",
  "Масла и соусы",
  "Бакалея",
  "Хлеб",
  "Прочее",
] as const;

export const DISH_CATEGORIES = [
  "Основные блюда",
  "Гарниры",
  "Мясо",
  "Салаты",
  "Завтраки",
  "Напитки",
  "Десерты",
] as const;

export const SERVING_TYPE_OPTIONS = [
  { id: "container", label: "Контейнер" },
  { id: "beverage", label: "Напиток" },
  { id: "standalone", label: "Порция на тарелке" },
] as const;

export const UNIT_OPTIONS = [
  { id: "g", label: "Граммы (г)" },
  { id: "ml", label: "Миллилитры (мл)" },
  { id: "piece", label: "Штуки (шт)" },
] as const;
