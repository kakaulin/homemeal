"use strict";

const crypto = require("node:crypto");

const lenta = require("./adapters/lenta");
const magnit = require("./adapters/magnit");
const auth = require("./lib/auth");
const { loadProducts, saveCatalog, syncCatalog } = require("./lib/sync");
const targets = require("./targets.json");

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const STORES = ["magnit", "lenta"];

const respond = (statusCode, payload) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(payload),
});

const httpError = auth.httpError;

function httpMethod(event) {
  return String(
    event?.httpMethod || event?.requestContext?.http?.method || "GET",
  ).toUpperCase();
}

function toPathname(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return null;
    }
  }

  return raw.split("?")[0] || null;
}

/**
 * В API Gateway event.path — это шаблон OpenAPI («/admin/products/{id}»),
 * реальный путь лежит в event.url, а параметр — в pathParams/params.
 * Локальные тесты присылают обычный path, поэтому поддерживаем оба варианта.
 */
function resolveRoute(event) {
  const candidates = [event?.url, event?.path, event?.requestContext?.http?.path]
    .map(toPathname)
    .filter(Boolean);

  const concrete =
    candidates.find((candidate) => !candidate.includes("{")) ?? candidates[0] ?? "/";
  const path = concrete.length > 1 ? concrete.replace(/\/+$/, "") : concrete;

  const rawId = event?.pathParams?.id ?? event?.params?.id ?? null;

  return {
    path,
    id: rawId != null ? decodeURIComponent(String(rawId)) : null,
  };
}

function readBody(event) {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, "Некорректный JSON в теле запроса");
  }
}

function isTimer(event) {
  const type = event?.messages?.[0]?.event_metadata?.event_type ?? "";
  return String(type).includes("TimerMessage");
}

function normalizeTarget(store, target) {
  if (target == null) return null;

  if (store === "magnit") {
    const goodsId = target.goodsId ?? magnit.parseMagnitUrlOrId(target.url);
    if (!goodsId) throw httpError(400, "Не удалось определить goodsId Магнита");
    return {
      goodsId: String(goodsId),
      url: target.url || `https://magnit.ru/product/${goodsId}`,
    };
  }

  const id = target.id ?? lenta.parseLentaUrlOrId(target.url);
  if (!id) throw httpError(400, "Не удалось определить id товара Ленты");
  return { id: Number(id), url: target.url || null };
}

function applyPatch(product, body) {
  for (const field of ["name", "category", "unit"]) {
    if (body[field] !== undefined) product[field] = body[field];
  }
  if (body.packWeightGrams !== undefined) {
    product.packWeightGrams = body.packWeightGrams === null ? null : Number(body.packWeightGrams);
  }
  if (body.nutritionPer100 !== undefined) {
    product.nutritionPer100 = body.nutritionPer100 ?? null;
  }

  if (body.stores) {
    product.stores = product.stores ?? {};
    for (const store of STORES) {
      if (!(store in body.stores)) continue;

      const target = normalizeTarget(store, body.stores[store]?.target);
      if (!target) {
        delete product.stores[store];
        continue;
      }

      const previous = product.stores[store]?.target;
      const changed =
        !previous || String(previous.goodsId ?? previous.id) !== String(target.goodsId ?? target.id);

      product.stores[store] = changed
        ? { target }
        : { ...product.stores[store], target };
    }
  }
}

function buildProduct(body) {
  const name = String(body?.name ?? "").trim();
  if (!name) throw httpError(400, "Укажите название продукта");

  const product = {
    id: body.id || crypto.randomUUID(),
    name,
    category: body.category ?? null,
    unit: body.unit ?? "g",
    packWeightGrams: body.packWeightGrams != null ? Number(body.packWeightGrams) : null,
    nutritionPer100: body.nutritionPer100 ?? null,
    stores: {},
  };

  applyPatch(product, body);
  return product;
}

function hasError(product) {
  return STORES.some((store) => product.stores?.[store]?.lastStatus === "error");
}

function decorate(item) {
  return {
    ...item,
    suggestedWeightGrams: item.weightGrams ?? null,
    suggestedNutrition: item.suggestedNutrition ?? item.nutrition ?? null,
  };
}

async function handleGoogleAuth(event) {
  const body = readBody(event);
  const user = await auth.verifyGoogleIdToken(
    body.credential,
    process.env.GOOGLE_CLIENT_ID,
  );

  const adminEmail = String(process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const isAdmin = Boolean(adminEmail) && String(user.email).toLowerCase() === adminEmail;

  const token = auth.signSessionJwt(
    {
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin,
    },
    process.env.JWT_SECRET,
  );

  return respond(200, {
    token,
    user: { email: user.email, name: user.name, picture: user.picture, isAdmin },
  });
}

async function handleAdminProducts(iamToken) {
  const products = await loadProducts(iamToken);
  const sorted = [...products].sort((a, b) => Number(hasError(b)) - Number(hasError(a)));
  return respond(200, { products: sorted });
}

async function handleAdminCreate(event, iamToken) {
  const product = buildProduct(readBody(event));

  const products = await loadProducts(iamToken);
  products.push(product);
  await saveCatalog(products, iamToken);

  const summary = await syncCatalog({ iamToken, productId: product.id });
  const saved = (await loadProducts(iamToken)).find((item) => item.id === product.id);

  return respond(201, { product: saved ?? product, sync: summary });
}

async function handleAdminUpdate(event, iamToken, id) {
  const body = readBody(event);
  const products = await loadProducts(iamToken);
  const product = products.find((item) => item.id === id);

  if (!product) return respond(404, { error: "Товар не найден" });

  applyPatch(product, body);
  await saveCatalog(products, iamToken);

  return respond(200, { product });
}

async function handleAdminDelete(iamToken, id) {
  const products = await loadProducts(iamToken);
  const next = products.filter((item) => item.id !== id);

  if (next.length === products.length) {
    return respond(404, { error: "Товар не найден" });
  }

  await saveCatalog(next, iamToken);
  return respond(200, { ok: true, deleted: id });
}

async function handleLookup(event) {
  const { store, queryOrUrl } = readBody(event);

  if (!STORES.includes(store)) {
    throw httpError(400, "store должен быть magnit или lenta");
  }

  const value = String(queryOrUrl ?? "").trim();
  if (!value) throw httpError(400, "queryOrUrl обязателен");

  const byLink = /^https?:\/\//i.test(value) || /^\d+$/.test(value);

  if (byLink) {
    const item =
      store === "magnit"
        ? await magnit.fetchMagnitById({ goodsId: value })
        : await lenta.fetchLentaById({ id: value });

    return respond(200, { mode: "id", items: [decorate(item)] });
  }

  const items =
    store === "magnit"
      ? await magnit.searchMagnit({ term: value })
      : await lenta.searchLenta({ term: value });

  return respond(200, { mode: "search", items: items.slice(0, 12).map(decorate) });
}

async function handleSync(event, iamToken) {
  const body = readBody(event);
  const summary = await syncCatalog({ iamToken, productId: body?.productId });
  const products = await loadProducts(iamToken);

  return respond(200, { ...summary, products });
}

/** Обратная совместимость: прежний /get-price по targets.json. */
async function handleGetPrice(event) {
  const target = Array.isArray(targets) ? targets[0] : targets;
  const query = event?.queryStringParameters ?? {};

  const term = query.q || target.internal_name;
  const store = String(query.store || target.store || "magnit").toLowerCase();
  const shopCode = String(query.shopCode || target.shop_code);

  const tasks = [];
  if (store === "magnit" || store === "all") {
    tasks.push({
      name: "magnit",
      run: () => magnit.searchMagnit({ shopCode, term }),
    });
  }
  if (store === "lenta" || store === "all") {
    tasks.push({
      name: "lenta",
      run: () => lenta.searchLenta({ term, address: query.address }),
    });
  }

  if (tasks.length === 0) {
    return respond(400, { error: `Неизвестный store: ${store}` });
  }

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
    return respond(502, { error: "Не удалось получить цены", errors });
  }

  const first = items[0];
  return respond(200, {
    product: first.name,
    price: first.price,
    pricePer100: first.pricePer100,
    weightGrams: first.weightGrams,
    store: first.store,
    items,
    errors,
  });
}

exports.handler = async (event, context) => {
  const iamToken = context?.token?.access_token;

  try {
    if (isTimer(event)) {
      const summary = await syncCatalog({ iamToken });
      return respond(200, summary);
    }

    const method = httpMethod(event);
    const route = resolveRoute(event);
    const path = route.path;

    if (method === "POST" && path === "/auth/google") {
      return await handleGoogleAuth(event);
    }

    if (method === "GET" && path === "/get-price") {
      return await handleGetPrice(event);
    }

    if (path === "/admin/products" && method === "GET") {
      auth.requireAdmin(event);
      return await handleAdminProducts(iamToken);
    }

    if (path === "/admin/products" && method === "POST") {
      auth.requireAdmin(event);
      return await handleAdminCreate(event, iamToken);
    }

    const productMatch = path.match(/^\/admin\/products\/([^/]+)$/);
    if (productMatch) {
      auth.requireAdmin(event);
      const id = route.id ?? decodeURIComponent(productMatch[1]);

      if (method === "PUT") return await handleAdminUpdate(event, iamToken, id);
      if (method === "DELETE") return await handleAdminDelete(iamToken, id);
    }

    if (method === "POST" && path === "/admin/lookup") {
      auth.requireAdmin(event);
      return await handleLookup(event);
    }

    if (method === "POST" && path === "/admin/sync") {
      auth.requireAdmin(event);
      return await handleSync(event, iamToken);
    }

    return respond(404, { error: "Not found" });
  } catch (error) {
    return respond(error?.statusCode ?? 500, {
      error: error?.message ?? String(error),
    });
  }
};
