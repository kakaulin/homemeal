const plainSpace = (value: string) => value.replace(/\u00A0/g, " ");

const money = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const oneDecimalOrInt = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

const safe = (value: number | undefined | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** 1 234,56 ₽ */
export const formatMoney = (value: number | undefined | null) =>
  `${plainSpace(money.format(safe(value)))} ₽`;

/** 220 ккал */
export const formatKcal = (value: number | undefined | null) =>
  `${plainSpace(number.format(safe(value)))} ккал`;

/** 12,3 г — для белков, жиров и углеводов. */
export const formatMacro = (value: number | undefined | null) =>
  `${plainSpace(decimal.format(safe(value)))} г`;

/** 150 г — вес продукта или порции. */
export const formatGrams = (value: number | undefined | null) =>
  `${plainSpace(oneDecimalOrInt.format(safe(value)))} г`;

/** 1,5 шт */
export const formatPieces = (value: number | undefined | null) =>
  `${plainSpace(oneDecimalOrInt.format(safe(value)))} шт`;

/** Единица измерения цены продукта: ₽/100 г, ₽/100 мл, ₽/шт. */
export const priceUnitLabel = (unit: "g" | "ml" | "piece") => {
  if (unit === "piece") return "₽/шт";
  return unit === "ml" ? "₽/100 мл" : "₽/100 г";
};

/** Словесная база цены — для подписей в списках выбора. */
export const priceBasisLabel = (unit: "g" | "ml" | "piece") => {
  if (unit === "piece") return "за штуку";
  return unit === "ml" ? "за 100 мл" : "за 100 г";
};

/** Прочерк для отсутствующих значений. */
export const DASH = "—";

/** Русская форма множественного числа: 1 продукт, 2 продукта, 5 продуктов. */
export function plural(count: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
