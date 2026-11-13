const targets = require("./targets.json");

const API_URL = "https://web-gateway.middle-api.magnit.ru/v3/goods";

const HEADERS = {
  "x-client-name": "magnit",
  "x-device-platform": "Web",
  "x-app-version": "0.1.0",
  "Content-Type": "application/json",
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

exports.handler = async () => {
  // targets.json — массив целей; ответ API Gateway описывает один товар, берём первую.
  const target = Array.isArray(targets) ? targets[0] : targets;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        storeCodes: [target.shop_code],
        shopType: target.shop_type,
        productIDs: [target.product_id],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Магнит ответил со статусом ${response.status}`);
    }

    const price = extractPrice(await response.json());
    if (price === undefined || price === null) {
      throw new Error("В ответе Магнита нет цены");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ product: target.internal_name, price }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
