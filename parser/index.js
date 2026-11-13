const targets = require("./targets.json");

const API_URL = "https://webgate.magnit.ru/webgate/v2/goods/search";

const HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "x-client-name": "magnit",
  "x-device-platform": "Web",
  "x-app-version": "2026.11.5-16.57",
  "x-device-id": "5a451faa-57cb-4d9c-99a9-ceedc30918a7", // статичный UUID для теста
  "x-device-tag": "disabled",
  "x-platform-version": "Windows Chrome 156",
  "x-magnit-bff": "1",
  origin: "https://magnit.ru",
  referer: "https://magnit.ru/",
};

// В ответе Магнита цена бывает числом или объектом вида { value: ... }.
function extractPrice(payload) {
  const item =
    payload?.goods?.[0] ??
    payload?.products?.[0] ??
    payload?.items?.[0] ??
    (Array.isArray(payload) ? payload[0] : payload);
  const raw = item?.priceWithDiscount ?? item?.price;
  return raw !== null && typeof raw === "object" ? (raw.value ?? raw.amount) : raw;
}

async function requestPrice(target) {
  let firstError;

  // Схема /v2/goods/search не подтверждена: пробуем поиск по тексту,
  // затем старую структуру по идентификаторам.
  for (const body of [
    { storeCode: target.shop_code, query: target.internal_name },
    { storeCodes: [target.shop_code], productIDs: [target.product_id] },
  ]) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Магнит ответил со статусом ${response.status}`);
      }

      const price = extractPrice(await response.json());
      if (price !== undefined && price !== null) return price;

      throw new Error("В ответе Магнита нет цены");
    } catch (error) {
      firstError ??= error;
    }
  }

  throw firstError;
}

exports.handler = async () => {
  // targets.json — массив целей; ответ API Gateway описывает один товар, берём первую.
  const target = Array.isArray(targets) ? targets[0] : targets;

  try {
    const price = await requestPrice(target);

    return {
      statusCode: 200,
      body: JSON.stringify({ product: target.internal_name, price }),
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
