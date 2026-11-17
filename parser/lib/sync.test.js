"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const localDir = fs.mkdtempSync(path.join(os.tmpdir(), "home-meal-sync-"));
process.env.S3_LOCAL_DIR = localDir;
process.env.S3_PRIVATE_BUCKET = "test-private";
process.env.S3_PUBLIC_BUCKET = "test-public";
process.env.NODE_ENV = "test";

const { readJson, writeJson } = require("./s3");
const { syncCatalog } = require("./sync");

const OLD_SUCCESS = "2026-01-01T00:00:00.000Z";

function baseProduct() {
  return {
    id: "p1",
    name: "Макароны Шебекинские №366 Спирали 450г",
    category: "Макароны",
    unit: "g",
    packWeightGrams: 450,
    nutritionPer100: { kcal: 350, protein: 13, fat: 1.5, carbs: 72 },
    stores: {
      magnit: {
        target: { goodsId: "3174070009", url: "https://magnit.ru/product/3174070009" },
        price: 60,
        pricePer100: 13.33,
        priceRegular: null,
        inStock: true,
        lastSuccessAt: OLD_SUCCESS,
        lastAttemptAt: OLD_SUCCESS,
        lastStatus: "ok",
        lastError: null,
      },
      lenta: {
        target: { id: 51814, url: "https://lenta.com/product/x-51814/" },
        price: 79.99,
        pricePer100: 17.78,
        priceRegular: 79.99,
        inStock: true,
        lastSuccessAt: OLD_SUCCESS,
        lastAttemptAt: OLD_SUCCESS,
        lastStatus: "ok",
        lastError: null,
      },
    },
  };
}

async function seed(products) {
  await writeJson({ bucket: "test-private", key: "master-catalog.json", data: products });
}

test("пустой каталог: sync не падает и создаёт пустую витрину", async () => {
  await seed([]);
  const summary = await syncCatalog({});

  assert.equal(summary.total, 0);
  assert.deepEqual(summary.errors, []);

  const publicCatalog = await readJson({ bucket: "test-public", key: "catalog-nsk.json" });
  assert.equal(publicCatalog.city, "Новосибирск");
  assert.deepEqual(publicCatalog.products, []);
});

test("успех обновляет цену, сбой магазина сохраняет старые данные", async () => {
  await seed([baseProduct()]);

  const adapters = {
    magnit: async () => ({ price: 66.99, priceRegular: 69.99, pricePer100: 14.89, inStock: true }),
    lenta: async () => {
      throw new Error("Лента недоступна");
    },
  };

  const summary = await syncCatalog({ adapters });
  assert.equal(summary.errors.length, 1);
  assert.equal(summary.errors[0].store, "lenta");

  const [product] = await readJson({ bucket: "test-private", key: "master-catalog.json" });

  // Магнит: цена пересчитана от packWeightGrams
  assert.equal(product.stores.magnit.price, 66.99);
  assert.equal(product.stores.magnit.pricePer100, 14.89);
  assert.equal(product.stores.magnit.priceRegular, 69.99);
  assert.equal(product.stores.magnit.lastStatus, "ok");
  assert.equal(product.stores.magnit.lastError, null);
  assert.notEqual(product.stores.magnit.lastSuccessAt, OLD_SUCCESS);

  // Лента: старые цена и lastSuccessAt не тронуты
  assert.equal(product.stores.lenta.price, 79.99);
  assert.equal(product.stores.lenta.pricePer100, 17.78);
  assert.equal(product.stores.lenta.priceRegular, 79.99);
  assert.equal(product.stores.lenta.lastSuccessAt, OLD_SUCCESS);
  assert.equal(product.stores.lenta.lastStatus, "error");
  assert.equal(product.stores.lenta.lastError, "Лента недоступна");
  assert.notEqual(product.stores.lenta.lastAttemptAt, OLD_SUCCESS);

  // Публичная витрина: актуальные данные и только нужные поля
  const publicCatalog = await readJson({ bucket: "test-public", key: "catalog-nsk.json" });
  const publicProduct = publicCatalog.products[0];

  assert.equal(publicCatalog.city, "Новосибирск");
  assert.equal(publicCatalog.storesMeta.magnit, "Выборная ул., 87/3");
  assert.equal(publicProduct.stores.magnit.price, 66.99);
  assert.equal(publicProduct.stores.lenta.price, 79.99);
  assert.equal(publicProduct.stores.lenta.lastStatus, "error");
  assert.equal(publicProduct.stores.magnit.url, "https://magnit.ru/product/3174070009");
  assert.equal(publicProduct.stores.magnit.lastAttemptAt, undefined);
  assert.equal(publicProduct.stores.magnit.target, undefined);
});

test("нет в наличии: цена сохраняется, inStock становится false", async () => {
  await seed([baseProduct()]);

  const adapters = {
    magnit: async () => ({ price: 0, inStock: false }),
    lenta: async () => ({ price: 79.99, inStock: true }),
  };

  await syncCatalog({ adapters });
  const [product] = await readJson({ bucket: "test-private", key: "master-catalog.json" });

  assert.equal(product.stores.magnit.price, 60);
  assert.equal(product.stores.magnit.inStock, false);
  assert.equal(product.stores.magnit.lastStatus, "error");
  assert.equal(product.stores.magnit.lastError, "Товара нет в наличии");
  assert.equal(product.stores.magnit.lastSuccessAt, OLD_SUCCESS);
});

test("productId ограничивает синхронизацию одним товаром", async () => {
  const second = { ...baseProduct(), id: "p2", name: "Второй товар" };
  await seed([baseProduct(), second]);

  const calls = [];
  const adapters = {
    magnit: async (target) => {
      calls.push(target.goodsId);
      return { price: 70, inStock: true };
    },
    lenta: async () => ({ price: 80, inStock: true }),
  };

  const summary = await syncCatalog({ adapters, productId: "p2" });

  assert.equal(summary.total, 2);
  assert.equal(summary.synced, 1);
  assert.deepEqual(calls, ["3174070009"]);

  const products = await readJson({ bucket: "test-private", key: "master-catalog.json" });
  assert.equal(products[0].stores.magnit.price, 60);
  assert.equal(products[1].stores.magnit.price, 70);
});
