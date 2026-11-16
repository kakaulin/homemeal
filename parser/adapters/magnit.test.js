"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { parseMagnitSearchResponse } = require("./magnit");

const fixtures = path.join(__dirname, "..", "fixtures");
const mannaya = JSON.parse(fs.readFileSync(path.join(fixtures, "magnit-search.json"), "utf8"));
const bananas = JSON.parse(
  fs.readFileSync(path.join(fixtures, "magnit-search-bananas.json"), "utf8"),
);

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
