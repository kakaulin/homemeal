"use strict";

const { calcPricePer100, parseWeightGrams } = require("../lib/weight");

const MCP_URL = "https://mcp.lenta.com/mcp";
const DEFAULT_ADDRESS = "Москва, Ленинский проспект 45";
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

/**
 * MCP storefront_products_search сегодня КБЖУ не отдаёт: в живом ответе по «молоко»
 * полей nutrition нет вовсе. Функция приводит любые будущие варианты имён
 * к каноническому { kcal, protein, fat, carbs } (значения на 100 г).
 */
const NUTRITION_KEYS = {
  kcal: ["kcal", "calories", "energy"],
  protein: ["protein", "proteins"],
  fat: ["fat", "fats"],
  carbs: ["carbs", "carbohydrates"],
};

function normalizeNutrition(raw) {
  if (!raw || typeof raw !== "object") return null;

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
  const isWeighted = false;
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
    isWeighted,
    weightGrams,
    pricePer100: calcPricePer100(price, weightGrams),
    quantity: item.stock ?? null,
    nutrition: normalizeNutrition(item.nutrition),
  };
}

async function searchLenta({ term, address = DEFAULT_ADDRESS }) {
  const result = await callTool("storefront_products_search", {
    query: term,
    address,
    page: 1,
  });

  const text = result?.content?.[0]?.text;
  if (!text) {
    throw new Error("Неожиданный ответ MCP: нет result.content[0].text");
  }

  const payload = JSON.parse(text);
  const items = payload?.data?.items ?? [];
  const storeId = payload?.data?.storeId;

  return items.map((item) => normalizeLentaItem(item, storeId));
}

module.exports = { searchLenta, DEFAULT_ADDRESS };
