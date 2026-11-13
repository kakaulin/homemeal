const targets = require("./targets.json");

const API_URL = "https://mcp.lenta.com/mcp";
// Адрес точки, по которой MCP определяет магазин.
const ADDRESS = "Москва, Ленинский проспект 45";

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function searchItems(query) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "storefront_products_search",
        arguments: { query, address: ADDRESS, page: 1 },
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`MCP ответил со статусом ${response.status}`);
  }

  const rpc = await response.json();
  if (rpc.error) {
    throw new Error(rpc.error.message ?? "Ошибка MCP");
  }

  // result.content[0].text — строка с JSON вида { ok: true, data: { items: [...] } }.
  const text = rpc.result?.content?.[0]?.text;
  if (!text) {
    throw new Error("Неожиданный ответ MCP: нет result.content[0].text");
  }

  return JSON.parse(text).data?.items ?? [];
}

exports.handler = async () => {
  // targets.json — массив целей; ответ API Gateway описывает один товар, берём первую.
  const target = Array.isArray(targets) ? targets[0] : targets;

  try {
    const items = await searchItems(target.internal_name);
    const item = items[0];
    if (!item) {
      throw new Error("Лента ничего не нашла по запросу");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ product: item.name, price: item.price }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        cause: error.cause ? error.cause.code || error.cause.message : "Unknown",
      }),
    };
  }
};
