"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { requireAdmin, signSessionJwt, verifySessionJwt } = require("./auth");

process.env.JWT_SECRET = "test-secret";
process.env.ADMIN_EMAIL = "Admin@Example.com";

const status = (code) => (error) => error.statusCode === code;

test("JWT: подпись и проверка", () => {
  const token = signSessionJwt({ email: "admin@example.com", sub: "1" }, process.env.JWT_SECRET);
  const payload = verifySessionJwt(token, process.env.JWT_SECRET);

  assert.equal(payload.email, "admin@example.com");
  assert.equal(payload.sub, "1");
  assert.ok(payload.exp > payload.iat);
});

test("JWT: подмена подписи отклоняется", () => {
  const token = signSessionJwt({ email: "admin@example.com" }, process.env.JWT_SECRET);
  const tampered = `${token.slice(0, -4)}AAAA`;

  assert.throws(() => verifySessionJwt(tampered, process.env.JWT_SECRET), status(401));
});

test("JWT: истёкший токен отклоняется", () => {
  const token = signSessionJwt({ email: "admin@example.com" }, process.env.JWT_SECRET, -1);

  assert.throws(() => verifySessionJwt(token, process.env.JWT_SECRET), status(401));
});

test("requireAdmin: без заголовка — 401", () => {
  assert.throws(() => requireAdmin({ headers: {} }), status(401));
});

test("requireAdmin: чужой email — 403", () => {
  const token = signSessionJwt({ email: "other@example.com" }, process.env.JWT_SECRET);

  assert.throws(
    () => requireAdmin({ headers: { Authorization: `Bearer ${token}` } }),
    status(403),
  );
});

test("requireAdmin: админ проходит, регистр заголовка не важен", () => {
  const token = signSessionJwt({ email: "admin@example.com" }, process.env.JWT_SECRET);

  const payload = requireAdmin({ headers: { authorization: `Bearer ${token}` } });
  assert.equal(payload.email, "admin@example.com");
});
