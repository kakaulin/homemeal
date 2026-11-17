"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  parseLentaDetailsResponse,
  parseLentaUrlOrId,
  parseNutritionText,
} = require("./lenta");

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "fixtures", "nsk-probe.json"), "utf8"),
);
const item = fixture.lenta.details.data.item;

test("карточка Ленты: цена в рублях, вес, ean, наличие", () => {
  const parsed = parseLentaDetailsResponse(item);

  assert.equal(parsed.store, "lenta");
  assert.equal(parsed.id, "51814");
  assert.equal(parsed.price, 79.99);
  assert.equal(parsed.priceRegular, 79.99);
  assert.equal(parsed.weightGrams, 450);
  assert.equal(parsed.quantity, 50);
  assert.equal(parsed.ean, "4607001850106");
  assert.equal(parsed.inStock, true);
  assert.equal(parsed.url, item.url);
});

test("строка КБЖУ Ленты разбирается в объект", () => {
  const parsed = parseLentaDetailsResponse(item);

  assert.deepEqual(parsed.suggestedNutrition, {
    kcal: 350,
    protein: 13,
    fat: 1.5,
    carbs: 72,
  });
});

test("parseNutritionText: пустая строка и мусор", () => {
  assert.equal(parseNutritionText(""), null);
  assert.equal(parseNutritionText("без состава"), null);
  assert.deepEqual(parseNutritionText("Ккал 120, белки 3,2г"), {
    kcal: 120,
    protein: 3.2,
    fat: null,
    carbs: null,
  });
});

test("Лента без остатка не в наличии", () => {
  const parsed = parseLentaDetailsResponse({ ...item, stock: 0 });
  assert.equal(parsed.inStock, false);
});

test("parseLentaUrlOrId: ссылка, строка, мусор", () => {
  assert.equal(
    parseLentaUrlOrId(
      "https://lenta.com/product/makarony-spirali-366-gra-vs-rossiya-450g-51814/",
    ),
    51814,
  );
  assert.equal(parseLentaUrlOrId("51814"), 51814);
  assert.equal(parseLentaUrlOrId("нет id"), null);
});
