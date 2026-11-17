"use strict";

const { calcPricePer100, parseWeightGrams } = require("../lib/weight");

const MCP_URL = "https://mcp.lenta.com/mcp";
const DEFAULT_STORE_ID = 73; // Новосибирск, Большевистская ул., 52/1 (Гипер)
const DEFAULT_ADDRESS = "Новосибирск, Большевистская улица, 52/1";
const PROTOCOL_VERSION = "2024-11-05";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "User-Agent": USER_AGENT,
};

// Ленивая инициализация: сессия (если сервер её выдаёт) живёт в памяти модуля.
let sessionId = null;
let initialized = false;
let requestId = 0;

/** MCP может ответить как JSON, так и SSE потоком «data: {...}». */
function parseRpcText(text, contentType) {
  if ((contentType ?? "").includes("text/event-stream")) {
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        return JSON.parse(payload);
      } catch {
        // строка не JSON — смотрим следующую
      }
    }
    throw new Error("Не удалось разобрать SSE-ответ MCP");
  }

  return JSON.parse(text);
}

async function rpc(method, params) {
  requestId += 1;

  const headers = sessionId
    ? { ...BASE_HEADERS, "Mcp-Session-Id": sessionId }
    : BASE_HEADERS;

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
    signal: AbortSignal.timeout(8000),
  });

  const nextSession = response.headers.get("mcp-session-id");
  if (nextSession) sessionId = nextSession;

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP Ленты ответил ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = parseRpcText(text, response.headers.get("content-type"));
  if (json.error) throw new Error(json.error.message ?? "Ошибка MCP");

  return json.result;
}

async function initialize() {
  if (initialized) return;

  await rpc("initialize", {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "home-meal", version: "0.1.0" },
  });

  initialized = true;
}

function resetSession() {
  sessionId = null;
  initialized = false;
}

async function callTool(name, args) {
  await initialize();

  try {
    return await rpc("tools/call", { name, arguments: args });
  } catch (error) {
    // Сервер мог отвергнуть протухшую сессию — один раз переинициализируемся.
    if (!sessionId) throw error;
    resetSession();
    await initialize();
    return rpc("tools/call", { name, arguments: args });
  }
}

function toolPayload(result) {
  const text = result?.content?.[0]?.text;
  if (!text) throw new Error("Неожиданный ответ MCP: нет result.content[0].text");
  return JSON.parse(text);
}

/** id товара из ссылки https://lenta.com/product/...-51814/ или из строки "51814". */
function parseLentaUrlOrId(input) {
  if (input == null) return null;

  const text = String(input).trim();
  if (/^\d+$/.test(text)) return Number(text);

  const clean = text.split(/[?#]/)[0].replace(/\/+$/, "");
  const match = clean.match(/-(\d+)$/) ?? clean.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

/**
 * КБЖУ из строки вида «Белки – 13г, жиры – 1,5г, углеводы – 72г, 350 Ккал».
 * В карточке Ленты состав приходит текстом, а не структурой.
 */
function parseNutritionText(text) {
  if (typeof text !== "string" || !text.trim()) return null;

  const take = (pattern) => {
    const match = text.match(pattern);
    if (!match) return null;
    const value = Number(match[1].replace(",", "."));
    return Number.isFinite(value) ? value : null;
  };

  const nutrition = {
    kcal: take(/([\d.,]+)\s*ккал/i) ?? take(/ккал[^\d]*([\d.,]+)/i),
    protein: take(/белк[а-яё]*[^\d]*([\d.,]+)/i),
    fat: take(/жир[а-яё]*[^\d]*([\d.,]+)/i),
    carbs: take(/углевод[а-яё]*[^\d]*([\d.,]+)/i),
  };

  return Object.values(nutrition).some((value) => value !== null) ? nutrition : null;
}

/** КБЖУ объекта (если сервер когда-нибудь начнёт отдавать структуру). */
const NUTRITION_KEYS = {
  kcal: ["kcal", "calories", "energy"],
  protein: ["protein", "proteins"],
  fat: ["fat", "fats"],
  carbs: ["carbs", "carbohydrates"],
};

function normalizeNutrition(raw) {
  if (!raw || typeof raw !== "object") return parseNutritionText(raw);

  const pick = (keys) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
  };

  const nutrition = {
    kcal: pick(NUTRITION_KEYS.kcal),
    protein: pick(NUTRITION_KEYS.protein),
    fat: pick(NUTRITION_KEYS.fat),
    carbs: pick(NUTRITION_KEYS.carbs),
  };

  return Object.values(nutrition).some((value) => value !== null) ? nutrition : null;
}

function normalizeLentaItem(item, storeId) {
  const price = Number(item.price);
  const priceRegular = item.priceRegular != null ? Number(item.priceRegular) : null;
  const weightGrams = parseWeightGrams(item.package ?? item.name);

  return {
    store: "lenta",
    shopCode: storeId != null ? String(storeId) : null,
    id: String(item.id),
    productId: null,
    name: item.name,
    price,
    priceRegular,
    discountPercent: item.discountPercent ?? null,
    isWeighted: false,
    weightGrams,
    pricePer100: calcPricePer100(price, weightGrams),
    quantity: item.stock ?? null,
    nutrition: normalizeNutrition(item.nutrition),
  };
}

/** Чистая нормализация карточки storefront_product_details. */
function parseLentaDetailsResponse(item) {
  if (!item || !item.name) {
    throw new Error("Лента вернула пустую карточку товара");
  }

  const price = Number(item.price);
  const priceRegular = item.priceRegular != null ? Number(item.priceRegular) : null;
  const weightGrams = parseWeightGrams(item.package ?? item.name);
  const stock = typeof item.stock === "number" ? item.stock : null;

  return {
    store: "lenta",
    shopCode: null,
    id: String(item.id),
    productId: null,
    name: item.name,
    price,
    priceRegular,
    discountPercent: item.discountPercent ?? null,
    isWeighted: false,
    weightGrams,
    pricePer100: calcPricePer100(price, weightGrams),
    quantity: stock,
    ean: item.ean ?? null,
    url: item.url ?? null,
    inStock: stock !== null && stock > 0 && Number.isFinite(price) && price > 0,
    suggestedNutrition: normalizeNutrition(item.nutrition),
  };
}

async function searchLenta({ term, storeId = DEFAULT_STORE_ID, address } = {}) {
  const args = { query: term, page: 1 };

  if (Number.isFinite(Number(storeId))) {
    args.storeId = Number(storeId);
  } else if (address) {
    args.address = address;
  }

  const payload = toolPayload(
    await callTool("storefront_products_search", args),
  );

  const items = payload?.data?.items ?? [];
  const resolvedStoreId = payload?.data?.storeId ?? storeId;

  return items.map((item) => normalizeLentaItem(item, resolvedStoreId));
}

/** Точечное получение товара по id через storefront_product_details. */
async function fetchLentaById({ id, storeId = DEFAULT_STORE_ID } = {}) {
  const productId = parseLentaUrlOrId(id);
  if (!Number.isFinite(productId)) {
    throw new Error(`Не удалось извлечь id товара Ленты из «${id}»`);
  }

  const payload = toolPayload(
    await callTool("storefront_product_details", {
      id: Number(productId),
      storeId: Number(storeId),
    }),
  );

  const item = payload?.data?.item;
  if (!item) {
    throw new Error(`Лента не нашла товар ${productId}`);
  }

  return parseLentaDetailsResponse(item);
}

module.exports = {
  DEFAULT_ADDRESS,
  DEFAULT_STORE_ID,
  fetchLentaById,
  parseLentaDetailsResponse,
  parseLentaUrlOrId,
  parseNutritionText,
  searchLenta,
};
