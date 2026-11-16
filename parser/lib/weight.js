"use strict";

const UNIT_TO_GRAMS = { г: 1, гр: 1, кг: 1000, мл: 1, л: 1000 };

/**
 * Вес или объём из названия товара в граммах (для мл считаем 1 мл ≈ 1 г).
 * Понимает «800г», «450 г», «0,9 кг», «1 л», «900 мл» и мультиупаковки «2х100 г».
 * Проценты (жирность) и прочие числа без единицы игнорируются.
 */
function parseWeightGrams(name) {
  if (typeof name !== "string") return null;

  const text = name.toLowerCase().replace(/\u00a0/g, " ").replace(/(\d),(\d)/g, "$1.$2");

  // Мультиупаковка: 2х100 г, 3 x 0,5 кг, 2*100г
  const multipack = text.match(/(\d+)\s*[хx×*]\s*(\d+(?:\.\d+)?)\s*(кг|гр|г|мл|л)(?![а-яa-z])/);
  if (multipack) {
    const count = Number(multipack[1]);
    const amount = Number(multipack[2]) * UNIT_TO_GRAMS[multipack[3]];
    return Math.round(count * amount);
  }

  // Одиночный вес/объём: 800г, 450 г, 0,9 кг, 1 л, 900 мл
  const single = text.match(/(\d+(?:\.\d+)?)\s*(кг|гр|г|мл|л)(?![а-яa-z])/);
  if (!single) return null;

  return Math.round(Number(single[1]) * UNIT_TO_GRAMS[single[2]]);
}

/** Цена за 100 г/мл, округлённая до копеек. */
function calcPricePer100(priceRub, weightGrams) {
  if (!Number.isFinite(priceRub) || !Number.isFinite(weightGrams)) return null;
  if (priceRub <= 0 || weightGrams <= 0) return null;

  return Math.round((priceRub / weightGrams) * 100 * 100) / 100;
}

module.exports = { parseWeightGrams, calcPricePer100 };
