"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { calcPricePer100, parseWeightGrams } = require("./weight");

test("parseWeightGrams: граммы", () => {
  assert.equal(parseWeightGrams("Крупа Манная 800г"), 800);
  assert.equal(parseWeightGrams("Печенье 450 г"), 450);
  assert.equal(parseWeightGrams("Сода пищевая 500г в ассортименте"), 500);
});

test("parseWeightGrams: килограммы, литры, миллилитры", () => {
  assert.equal(parseWeightGrams("Мука 0,9 кг"), 900);
  assert.equal(parseWeightGrams("Сок 1 л"), 1000);
  assert.equal(parseWeightGrams("Кефир 900 мл"), 900);
  assert.equal(parseWeightGrams("Молоко 1,5 л"), 1500);
});

test("parseWeightGrams: мультиупаковки", () => {
  assert.equal(parseWeightGrams("Йогурт 2х100 г"), 200);
  assert.equal(parseWeightGrams("Творог 3 x 0,5 кг"), 1500);
  assert.equal(parseWeightGrams("Набор 2*250мл"), 500);
});

test("parseWeightGrams: проценты и отсутствие веса не путаются", () => {
  assert.equal(parseWeightGrams("Творог 3,9%"), null);
  assert.equal(parseWeightGrams("Молоко 3,2% 930 мл"), 930);
  assert.equal(parseWeightGrams("Бананы"), null);
  assert.equal(parseWeightGrams(null), null);
});

test("calcPricePer100", () => {
  assert.equal(calcPricePer100(32.99, 800), 4.12);
  assert.equal(calcPricePer100(152.99, 1000), 15.3);
  assert.equal(calcPricePer100(0, 800), null);
  assert.equal(calcPricePer100(100, 0), null);
  assert.equal(calcPricePer100(null, 800), null);
});
