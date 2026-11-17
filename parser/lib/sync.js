"use strict";

const { DEFAULT_SHOP_CODE, fetchMagnitById } = require("../adapters/magnit");
const { DEFAULT_STORE_ID, fetchLentaById } = require("../adapters/lenta");
const { readJson, writeJson } = require("./s3");
const { calcPricePer100 } = require("./weight");

const MASTER_KEY = "master-catalog.json";
const PUBLIC_KEY = "catalog-nsk.json";
const CITY = "Новосибирск";
const STORES_META = {
  magnit: "Выборная ул., 87/3",
  lenta: "Большевистская ул., 52/1",
};
const STORES = ["magnit", "lenta"];
const CONCURRENCY = 2;
const BATCH_PAUSE_MS = 150;

const masterBucket = () => process.env.S3_PRIVATE_BUCKET || "home-meal-private";
const publicBucket = () => process.env.S3_PUBLIC_BUCKET || "home-meal-public";

/** Адаптеры по умолчанию: принимают target магазина, возвращают нормализованный товар. */
const defaultAdapters = {
  magnit: (target) =>
    fetchMagnitById({
      goodsId: target.goodsId,
      shopCode: target.shopCode || DEFAULT_SHOP_CODE,
      storeType: target.storeType || "1",
      catalogType: target.catalogType || "1",
    }),
  lenta: (target) =>
    fetchLentaById({
      id: target.id,
      storeId: target.storeId ?? DEFAULT_STORE_ID,
    }),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Файл — массив товаров; отсутствие файла означает пустой каталог. */
async function loadProducts(iamToken) {
  const data = await readJson({ bucket: masterBucket(), key: MASTER_KEY, iamToken });

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  return [];
}

/** Публичная витрина: только поля, нужные фронту. */
function buildPublicCatalog(products, updatedAt) {
  return {
    city: CITY,
    storesMeta: STORES_META,
    updatedAt,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category ?? null,
      unit: product.unit ?? "g",
      packWeightGrams: product.packWeightGrams ?? null,
      nutritionPer100: product.nutritionPer100 ?? null,
      stores: Object.fromEntries(
        STORES.filter((store) => product.stores?.[store]?.target).map((store) => {
          const state = product.stores[store];
          return [
            store,
            {
              price: state.price ?? null,
              pricePer100: state.pricePer100 ?? null,
              priceRegular: state.priceRegular ?? null,
              inStock: state.inStock ?? false,
              lastSuccessAt: state.lastSuccessAt ?? null,
              lastStatus: state.lastStatus ?? null,
              url: state.target?.url ?? null,
            },
          ];
        }),
      ),
    })),
  };
}

async function saveCatalog(products, iamToken) {
  const updatedAt = new Date().toISOString();

  await writeJson({
    bucket: masterBucket(),
    key: MASTER_KEY,
    iamToken,
    data: products,
  });

  const publicCatalog = buildPublicCatalog(products, updatedAt);
  await writeJson({
    bucket: publicBucket(),
    key: PUBLIC_KEY,
    iamToken,
    data: publicCatalog,
  });

  return { updatedAt, master: MASTER_KEY, public: PUBLIC_KEY };
}

/**
 * Обновление цены одного магазина.
 * Успех перезаписывает цену; сбой трогает только служебные поля.
 */
async function syncStore(product, store, adapters, nowIso) {
  const state = product.stores?.[store];
  if (!state?.target) return;

  try {
    const item = await adapters[store](state.target);

    const price = Number(item.price);
    const inStock = item.inStock !== false && Number.isFinite(price) && price > 0;

    if (!inStock) {
      const error = new Error("Товара нет в наличии");
      error.received = true;
      throw error;
    }

    state.price = price;
    state.pricePer100 = product.packWeightGrams
      ? calcPricePer100(price, product.packWeightGrams)
      : (item.pricePer100 ?? null);
    state.priceRegular = item.priceRegular ?? null;
    state.inStock = true;
    state.lastSuccessAt = nowIso;
    state.lastAttemptAt = nowIso;
    state.lastStatus = "ok";
    state.lastError = null;
  } catch (error) {
    state.lastAttemptAt = nowIso;
    state.lastStatus = "error";
    state.lastError = error.message;
    // Ответ получен, но товара нет — отмечаем отсутствие; при сетевой ошибке статус не знаем.
    if (error.received) state.inStock = false;
  }
}

async function runBatched(items, worker) {
  for (let index = 0; index < items.length; index += CONCURRENCY) {
    await Promise.all(items.slice(index, index + CONCURRENCY).map(worker));
    if (index + CONCURRENCY < items.length) await sleep(BATCH_PAUSE_MS);
  }
}

async function syncCatalog({ iamToken, productId, adapters = defaultAdapters } = {}) {
  const nowIso = new Date().toISOString();
  const products = await loadProducts(iamToken);

  const targets = productId
    ? products.filter((product) => product.id === productId)
    : products;

  await runBatched(targets, async (product) => {
    for (const store of STORES) {
      await syncStore(product, store, adapters, nowIso);
    }
  });

  await saveCatalog(products, iamToken);

  const errors = [];
  for (const product of targets) {
    for (const store of STORES) {
      const state = product.stores?.[store];
      if (state?.lastStatus === "error") {
        errors.push({
          productId: product.id,
          name: product.name,
          store,
          error: state.lastError,
        });
      }
    }
  }

  return {
    updatedAt: nowIso,
    total: products.length,
    synced: targets.length,
    errors,
  };
}

module.exports = {
  CITY,
  MASTER_KEY,
  PUBLIC_KEY,
  STORES,
  STORES_META,
  buildPublicCatalog,
  loadProducts,
  saveCatalog,
  syncCatalog,
  syncStore,
};
