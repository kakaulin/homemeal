"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.S3_LOCAL_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "home-meal-router-"));
process.env.S3_PRIVATE_BUCKET = "router-private";
process.env.S3_PUBLIC_BUCKET = "router-public";
process.env.JWT_SECRET = "router-secret";
process.env.ADMIN_EMAIL = "admin@example.com";
process.env.NODE_ENV = "test";

const { handler } = require("./index");
const { signSessionJwt } = require("./lib/auth");

const headers = {
  authorization: `Bearer ${signSessionJwt({ email: "admin@example.com" }, process.env.JWT_SECRET)}`,
};
const encode = (payload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

async function createProduct(name) {
  const response = await handler(
    {
      httpMethod: "POST",
      path: "/admin/products",
      headers,
      isBase64Encoded: true,
      body: encode({ name, unit: "g", packWeightGrams: 450 }),
    },
    {},
  );

  assert.equal(response.statusCode, 201);
  return JSON.parse(response.body).product;
}

test("событие API Gateway: шаблон path, url, pathParams и base64 body", async () => {
  const product = await createProduct("Товар до обновления");
  assert.ok(product.id);

  const response = await handler(
    {
      httpMethod: "PUT",
      path: "/admin/products/{id}",
      url: `https://gateway.example/admin/products/${product.id}`,
      pathParams: { id: product.id },
      headers,
      isBase64Encoded: true,
      body: encode({ name: "Товар после обновления" }),
    },
    {},
  );

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).product.name, "Товар после обновления");
});

test("id берётся из url, если pathParams не пришёл", async () => {
  const product = await createProduct("Удаляемый товар");

  const response = await handler(
    {
      httpMethod: "DELETE",
      path: "/admin/products/{id}",
      url: `/admin/products/${product.id}`,
      headers,
    },
    {},
  );

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).deleted, product.id);
});

test("GET /admin/products работает по обычному path", async () => {
  const response = await handler({ httpMethod: "GET", path: "/admin/products", headers }, {});

  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(JSON.parse(response.body).products));
});

test("base64-тело в /admin/lookup действительно декодируется", async () => {
  const response = await handler(
    {
      httpMethod: "POST",
      path: "/admin/lookup",
      headers,
      isBase64Encoded: true,
      body: encode({}),
    },
    {},
  );

  assert.equal(response.statusCode, 400);
  assert.match(JSON.parse(response.body).error, /store/);
});
