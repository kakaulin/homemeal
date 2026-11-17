"use strict";

const crypto = require("node:crypto");

const { calcPricePer100, parseWeightGrams } = require("../lib/weight");

const MAGNIT_BASE = "https://magnit.ru";
const SEARCH_URL = `${MAGNIT_BASE}/webgate/v2/goods/search`;
const DEFAULT_SHOP_CODE = "543371"; // Новосибирск, Выборная ул., 87/3
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const NUTRITION_PARAMS = {
  ккал: "kcal",
  белки: "protein",
  жиры: "fat",
  углеводы: "carbs",
};

function buildHeaders() {
  return {
    "x-client-name": "magnit",
    "x-device-platform": "Web",
    "x-device-id": crypto.randomUUID(),
    "x-device-tag": "disabled",
    "x-magnit-bff": "1",
    origin: MAGNIT_BASE,
    referer: `${MAGNIT_BASE}/`,
    "content-type": "application/json",
    "user-agent": USER_AGENT,
    accept: "application/json, text/plain, */*",
  };
}

/** goodsId из ссылки https://magnit.ru/product/3174070009-... или из строки "3174070009". */
function parseMagnitUrlOrId(input) {
  if (input == null) return null;

  const text = String(input).trim();
  if (/^\d+$/.test(text)) return text;

  const match = text.match(/\/product\/(\d+)/);
  return match ? match[1] : null;
}

/** КБЖУ из details[] — блок «Пищевая ценность в 100 граммах». */
function parseDetailsNutrition(details) {
  const group = (details ?? []).find((detail) =>
    /Пищевая ценность/i.test(detail?.name ?? ""),
  );
  if (!group) return null;

  const nutrition = { kcal: null, protein: null, fat: null, carbs: null };

  for (const parameter of group.parameters ?? []) {
    const key = NUTRITION_PARAMS[String(parameter?.name ?? "").trim().toLowerCase()];
    if (!key) continue;

    const value = Number(String(parameter.value ?? "").replace(",", "."));
    if (Number.isFinite(value)) nutrition[key] = value;
  }

  return Object.values(nutrition).some((value) => value !== null) ? nutrition : null;
}

function assertSameStore(storeCode, expected) {
  if (storeCode != null && String(storeCode) !== expected) {
    throw new Error(
      `Магнит вернул товар магазина ${storeCode} вместо ${expected} — сработал фоллбэк на другую точку`,
    );
  }
}

async function searchMagnit({
  shopCode = DEFAULT_SHOP_CODE,
  term,
  storeType = "1",
  catalogType = "1",
}) {
  const storeCode = String(shopCode);

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      storeCode,
      storeType: String(storeType),
      catalogType: String(catalogType),
      term,
      pagination: { limit: 12, offset: 0 },
      sort: { order: "desc", type: "popular" },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Магнит ответил ${response.status}: ${details.slice(0, 200)}`);
  }

  return parseMagnitSearchResponse(await response.json(), storeCode);
}

/** Чистая нормализация ответа /webgate/v2/goods/search. */
function parseMagnitSearchResponse(json, expectedStoreCode) {
  const expected = String(expectedStoreCode);
  const items = json?.items ?? [];
  const result = [];

  for (const item of items) {
    assertSameStore(item?.storeCode, expected);
    if (!(item?.price > 0)) continue;
    if (typeof item.quantity === "number" && item.quantity <= 0) continue;

    const isWeighted = item.weighted?.isWeighted === true;
    const priceKopecks = isWeighted ? (item.weighted?.unitPrice ?? item.price) : item.price;
    const price = priceKopecks / 100;
    const priceRegular =
      item.promotion?.oldPrice != null ? item.promotion.oldPrice / 100 : null;
    const weightGrams = isWeighted
      ? item.weighted?.shelfWeight || 1000
      : parseWeightGrams(item.name);

    result.push({
      store: "magnit",
      shopCode: expected,
      id: String(item.id),
      productId: item.productId != null ? String(item.productId) : null,
      name: item.name,
      price,
      priceRegular,
      discountPercent: item.promotion?.discountPercent ?? null,
      isWeighted,
      weightGrams,
      pricePer100: calcPricePer100(price, weightGrams),
      quantity: item.quantity ?? null,
    });
  }

  return result;
}

/** Точечное получение товара по id: GET /webgate/v2/goods/{id}/stores/{shopCode}. */
async function fetchMagnitById({
  goodsId,
  shopCode = DEFAULT_SHOP_CODE,
  storeType = "1",
  catalogType = "1",
}) {
  const id = parseMagnitUrlOrId(goodsId);
  if (!id) {
    throw new Error(`Не удалось извлечь goodsId из «${goodsId}»`);
  }

  const storeCode = String(shopCode);
  const url =
    `${MAGNIT_BASE}/webgate/v2/goods/${id}/stores/${storeCode}` +
    `?storetype=${storeType}&catalogtype=${catalogType}`;

  const response = await fetch(url, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Магнит ответил ${response.status}: ${details.slice(0, 200)}`);
  }

  return parseMagnitDetailsResponse(await response.json(), storeCode);
}

/** Чистая нормализация карточки товара /goods/{id}/stores/{store}. */
function parseMagnitDetailsResponse(json, expectedStoreCode) {
  const expected = String(expectedStoreCode);
  assertSameStore(json?.storeCode, expected);

  if (!json || typeof json !== "object" || !json.name) {
    throw new Error("Магнит вернул пустую карточку товара");
  }

  const isWeighted = json.weighted?.isWeighted === true;
  const priceKopecks = isWeighted
    ? (json.weighted?.unitPrice ?? json.price)
    : json.price;
  const price = Number.isFinite(priceKopecks) ? priceKopecks / 100 : 0;
  const priceRegular =
    json.promotion?.oldPrice != null ? json.promotion.oldPrice / 100 : null;
  const weightGrams = isWeighted
    ? json.weighted?.shelfWeight || 1000
    : parseWeightGrams(json.name);
  const quantity = typeof json.quantity === "number" ? json.quantity : null;
  const inStock = !json.isMissing && quantity !== null && quantity > 0 && price > 0;

  return {
    store: "magnit",
    shopCode: expected,
    id: String(json.id),
    productId: json.id != null ? String(json.id) : null,
    name: json.name,
    price,
    priceRegular,
    discountPercent: json.promotion?.discountPercent ?? null,
    isWeighted,
    weightGrams,
    pricePer100: calcPricePer100(price, weightGrams),
    quantity,
    inStock,
    suggestedNutrition: parseDetailsNutrition(json.details),
  };
}

module.exports = {
  DEFAULT_SHOP_CODE,
  fetchMagnitById,
  parseDetailsNutrition,
  parseMagnitDetailsResponse,
  parseMagnitSearchResponse,
  parseMagnitUrlOrId,
  searchMagnit,
};
