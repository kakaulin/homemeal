"use strict";

const crypto = require("node:crypto");

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const DEFAULT_TTL_DAYS = 14;

let jwksCache = { keys: [], expiresAt: 0 };

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

async function getGoogleKeys() {
  const now = Date.now();
  if (jwksCache.keys.length > 0 && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const response = await fetch(GOOGLE_CERTS_URL, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Не удалось получить ключи Google: ${response.status}`);
  }

  const body = await response.json();
  const maxAge = Number(
    (response.headers.get("cache-control") ?? "").match(/max-age=(\d+)/)?.[1] ?? 3600,
  );

  jwksCache = { keys: body.keys ?? [], expiresAt: now + maxAge * 1000 };
  return jwksCache.keys;
}

/** Проверка Google ID token: RS256 по JWK, iss/aud/exp/email_verified. */
async function verifyGoogleIdToken(idToken, expectedClientId) {
  if (!idToken) throw httpError(401, "Нет Google ID token");
  if (!expectedClientId) throw httpError(500, "GOOGLE_CLIENT_ID не задан");

  const parts = String(idToken).split(".");
  if (parts.length !== 3) throw httpError(401, "Некорректный Google ID token");

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);

  if (header.alg !== "RS256") {
    throw httpError(401, "Google ID token должен быть подписан RS256");
  }

  const keys = await getGoogleKeys();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw httpError(401, "Не найден ключ Google для проверки подписи");

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], "base64url");

  if (!crypto.verify("RSA-SHA256", signed, publicKey, signature)) {
    throw httpError(401, "Подпись Google ID token неверна");
  }

  if (!GOOGLE_ISSUERS.includes(payload.iss)) {
    throw httpError(401, "Неверный издатель Google ID token");
  }
  if (payload.aud !== expectedClientId) {
    throw httpError(401, "Google ID token выпущен для другого клиента");
  }
  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    throw httpError(401, "Google ID token истёк");
  }
  if (payload.email_verified !== true) {
    throw httpError(403, "Email в Google-аккаунте не подтверждён");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

function signSessionJwt(payload, secret, ttlDays = DEFAULT_TTL_DAYS) {
  if (!secret) throw httpError(500, "JWT_SECRET не задан");

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = base64url(
    JSON.stringify({ ...payload, iat: issuedAt, exp: issuedAt + ttlDays * 86400 }),
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifySessionJwt(token, secret) {
  if (!secret) throw httpError(500, "JWT_SECRET не задан");
  if (!token) throw httpError(401, "Нет токена сессии");

  const parts = String(token).split(".");
  if (parts.length !== 3) throw httpError(401, "Некорректный токен сессии");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest();
  const actual = Buffer.from(parts[2], "base64url");

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw httpError(401, "Подпись токена неверна");
  }

  const payload = decodeSegment(parts[1]);
  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    throw httpError(401, "Токен истёк");
  }

  return payload;
}

function headerValue(headers, name) {
  if (!headers) return null;

  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return null;
}

/** Bearer-токен из Authorization; 401 без токена, 403 если email не админский. */
function requireAdmin(event) {
  const authorization = headerValue(event?.headers, "authorization");
  const token = String(authorization ?? "").match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) throw httpError(401, "Требуется авторизация");

  const payload = verifySessionJwt(token, process.env.JWT_SECRET);

  const adminEmail = String(process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (!adminEmail) throw httpError(500, "ADMIN_EMAIL не задан");

  if (String(payload.email ?? "").toLowerCase() !== adminEmail) {
    throw httpError(403, "Доступ только для администратора");
  }

  return payload;
}

module.exports = {
  httpError,
  requireAdmin,
  signSessionJwt,
  verifyGoogleIdToken,
  verifySessionJwt,
};
