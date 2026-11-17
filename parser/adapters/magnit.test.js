"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  parseMagnitDetailsResponse,
  parseMagnitSearchResponse,
  parseMagnitUrlOrId,
} = require("./magnit");

const fixtures = path.join(__dirname, "..", "fixtures");
const readFixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));

const mannaya = readFixture("magnit-search.json");
const bananas = readFixture("magnit-search-bananas.json");
const nsk = readFixture("nsk-probe.json");
const details = nsk.magnit.goodsStores.body;

test("фикстура «манная крупа»: цена, вес, цена за 100 г", () => {
  const items = parseMagnitSearchResponse(mannaya, "303857");

  assert.equal(items.length, 1);
  const item = items[0];

  assert.equal(item.name, "Крупа Манная 800г");
  assert.equal(item.store, "magnit");
  assert.equal(item.shopCode, "303857");
  assert.equal(item.price, 32.99);
  assert.equal(item.weightGrams, 800);
  assert.equal(item.pricePer100, 4.12);
  assert.equal(item.isWeighted, false);
});

test("фикстура «бананы»: акционный и весовой товары", () => {
  const items = parseMagnitSearchResponse(bananas, "303857");

  const promo = items.find((item) => item.name.startsWith("Творог детский Яблоко-банан"));
  assert.ok(promo, "акционный товар не найден");
  assert.equal(promo.price, 36.99);
  assert.equal(promo.priceRegular, 49.32);
  assert.equal(promo.discountPercent, 25);

  const weighted = items.find((item) => item.name === "Бананы");
  assert.ok(weighted, "весовой товар не найден");
  assert.equal(weighted.isWeighted, true);
  assert.equal(weighted.price, 152.99);
  assert.equal(weighted.weightGrams, 1000);
  assert.equal(weighted.pricePer100, 15.3);
});

test("защита от фоллбэка: чужой storeCode — ошибка", () => {
  assert.throws(
    () => parseMagnitSearchResponse(mannaya, "099255"),
    /магазина .* вместо 099255/,
  );
});

test("товары без остатка и с нулевой ценой отфильтрованы", () => {
  const json = {
    items: [
      { id: "1", name: "Тест 100г", price: 1000, quantity: 0, storeCode: "303857" },
      { id: "2", name: "Тест 100г", price: 0, quantity: 5, storeCode: "303857" },
      { id: "3", name: "Тест 100г", price: 500, quantity: 2, storeCode: "303857" },
    ],
  };

  const items = parseMagnitSearchResponse(json, "303857");

  assert.equal(items.length, 1);
  assert.equal(items[0].id, "3");
  assert.equal(items[0].price, 5);
  assert.equal(items[0].pricePer100, 5);
});

test("карточка Магнита: копейки -> рубли, вес и КБЖУ из details", () => {
  const item = parseMagnitDetailsResponse(details, "543371");

  assert.equal(item.store, "magnit");
  assert.equal(item.shopCode, "543371");
  assert.equal(item.name, "Макароны Шебекинские №366 Спирали 450г");
  assert.equal(item.price, 66.99);
  assert.equal(item.weightGrams, 450);
  assert.equal(item.quantity, 16);
  assert.equal(item.inStock, true);
  assert.deepEqual(item.suggestedNutrition, {
    kcal: 350,
    protein: 13,
    fat: 1.5,
    carbs: 72,
  });
});

test("карточка Магнита: чужой storeCode — ошибка", () => {
  assert.throws(() => parseMagnitDetailsResponse(details, "999999"), /магазина/);
});

test("карточка Магнита: отсутствующий товар не в наличии", () => {
  const item = parseMagnitDetailsResponse(
    { ...details, isMissing: true, quantity: 0 },
    "543371",
  );

  assert.equal(item.inStock, false);
});

test("parseMagnitUrlOrId: ссылка и строка", () => {
  assert.equal(
    parseMagnitUrlOrId(
      "https://magnit.ru/product/3174070009-makarony_shebekinskie_spirali_450g?shopCode=543371&shopType=express",
    ),
    "3174070009",
  );
  assert.equal(parseMagnitUrlOrId("3174070009"), "3174070009");
  assert.equal(parseMagnitUrlOrId("не ссылка"), null);
});
