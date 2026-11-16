"use strict";

const crypto = require("node:crypto");

const { calcPricePer100, parseWeightGrams } = require("../lib/weight");

const SEARCH_URL = "https://magnit.ru/webgate/v2/goods/search";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildHeaders() {
  return {
    "x-client-name": "magnit",
    "x-device-platform": "Web",
    "x-device-id": crypto.randomUUID(),
    "x-device-tag": "disabled",
    "x-magnit-bff": "1",
    origin: "https://magnit.ru",
    referer: "https://magnit.ru/",
    "content-type": "application/json",
    "user-agent": USER_AGENT,
    accept: "application/json, text/plain, */*",
  };
}

async function searchMagnit({ shopCode, term, storeType = "1", catalogType = "1" }) {
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

/**
 * Чистая нормализация ответа /webgate/v2/goods/search.
 * Цены у Магнита в копейках, storeCode в ответе — защита от фоллбэка на другой город.
 */
function parseMagnitSearchResponse(json, expectedStoreCode) {
  const expected = String(expectedStoreCode);
  const items = json?.items ?? [];
  const result = [];

  for (const item of items) {
    if (item?.storeCode != null && String(item.storeCode) !== expected) {
      throw new Error(
        `Магнит вернул товар магазина ${item.storeCode} вместо ${expected} — сработал фоллбэк на другую точку`,
      );
    }

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

module.exports = { searchMagnit, parseMagnitSearchResponse };
