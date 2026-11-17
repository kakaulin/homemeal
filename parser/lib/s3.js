"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const ENDPOINT = "https://storage.yandexcloud.net";
const TIMEOUT_MS = 10000;

function resolveToken(iamToken) {
  return iamToken || process.env.YC_IAM_TOKEN || null;
}

/** Локальный режим: нет токена и это не production (или явно задан S3_LOCAL_DIR). */
function isLocalMode(token) {
  if (token) return false;
  return Boolean(process.env.S3_LOCAL_DIR) || process.env.NODE_ENV !== "production";
}

function localRoot() {
  return path.resolve(process.env.S3_LOCAL_DIR || path.join(".tmp", "local-s3"));
}

function objectUrl(bucket, key) {
  return `${ENDPOINT}/${bucket}/${key}`;
}

async function readJson({ bucket, key, iamToken } = {}) {
  const token = resolveToken(iamToken);

  if (isLocalMode(token)) {
    try {
      const text = await fs.readFile(path.join(localRoot(), bucket, key), "utf8");
      return JSON.parse(text);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  const response = await fetch(objectUrl(bucket, key), {
    headers: { "X-YaCloud-SubjectToken": token },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`S3 GET ${bucket}/${key} -> ${response.status}: ${details.slice(0, 200)}`);
  }

  return response.json();
}

async function writeJson({ bucket, key, iamToken, data } = {}) {
  const token = resolveToken(iamToken);
  const body = JSON.stringify(data, null, 2);

  if (isLocalMode(token)) {
    const file = path.join(localRoot(), bucket, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, "utf8");
    return { bucket, key, storage: "local", bytes: Buffer.byteLength(body) };
  }

  const response = await fetch(objectUrl(bucket, key), {
    method: "PUT",
    headers: {
      "X-YaCloud-SubjectToken": token,
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`S3 PUT ${bucket}/${key} -> ${response.status}: ${details.slice(0, 200)}`);
  }

  return { bucket, key, storage: "s3", bytes: Buffer.byteLength(body) };
}

module.exports = { isLocalMode, localRoot, objectUrl, readJson, writeJson };
