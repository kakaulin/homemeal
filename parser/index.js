"use strict";

const magnit = require("./adapters/magnit");
const lenta = require("./adapters/lenta");
const targets = require("./targets.json");

const DEFAULT_ADDRESS = lenta.DEFAULT_ADDRESS;

function firstTarget() {
  return Array.isArray(targets) ? targets[0] : targets;
}

exports.handler = async (event) => {
  const target = firstTarget();
  const query = event?.queryStringParameters ?? {};

  const term = query.q || target.internal_name;
  const store = String(query.store || target.store || "magnit").toLowerCase();
  const shopCode = String(query.shopCode || target.shop_code);
  const storeType = String(query.storeType || target.shop_type || "1");
  const catalogType = String(query.catalogType || target.catalog_type || "1");
  const address = query.address || DEFAULT_ADDRESS;

  const tasks = [];
  if (store === "magnit" || store === "all") {
    tasks.push({
      name: "magnit",
      run: () => magnit.searchMagnit({ shopCode, term, storeType, catalogType }),
    });
  }
  if (store === "lenta" || store === "all") {
    tasks.push({ name: "lenta", run: () => lenta.searchLenta({ term, address }) });
  }

  if (tasks.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Неизвестный store: ${store}` }),
    };
  }

  // Сбой одного магазина не должен ломать ответ второго.
  const settled = await Promise.allSettled(tasks.map((task) => task.run()));

  const items = [];
  const errors = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
      return;
    }

    const reason = result.reason;
    errors.push({
      store: tasks[index].name,
      error: reason?.message ?? String(reason),
      cause: reason?.cause ? reason.cause.code || reason.cause.message : "Unknown",
    });
  });

  if (items.length === 0) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Не удалось получить цены", errors }),
    };
  }

  const first = items[0];

  return {
    statusCode: 200,
    body: JSON.stringify({
      // обратная совместимость с PriceWidget
      product: first.name,
      price: first.price,
      pricePer100: first.pricePer100,
      weightGrams: first.weightGrams,
      store: first.store,
      items,
      errors,
    }),
  };
};
