import type { NutritionPer100 } from "./catalog";

export type AdminStoreState = {
  target?: {
    goodsId?: string;
    id?: number;
    url?: string | null;
    ean?: string | null;
  };
  price?: number | null;
  pricePer100?: number | null;
  priceRegular?: number | null;
  inStock?: boolean;
  lastSuccessAt?: string | null;
  lastAttemptAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  category?: string | null;
  unit?: "g" | "ml" | "piece";
  packWeightGrams?: number | null;
  nutritionPer100?: NutritionPer100 | null;
  stores?: Partial<Record<"magnit" | "lenta", AdminStoreState>>;
};

export type LookupItem = {
  store: string;
  id: string;
  name: string;
  price: number;
  pricePer100?: number | null;
  weightGrams?: number | null;
  suggestedWeightGrams?: number | null;
  suggestedNutrition?: NutritionPer100 | null;
  ean?: string | null;
  url?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * NEXT_PUBLIC_API_URL исторически указывает на /get-price,
 * поэтому из него вырезается хвост — дальше работаем с базой шлюза.
 */
export const gatewayBase = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    url.pathname = url.pathname.replace(/\/get-price\/?$/i, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
})();

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  if (!gatewayBase) {
    throw new ApiError("API не настроен: задайте NEXT_PUBLIC_API_URL");
  }

  const response = await fetch(`${gatewayBase}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  const data = safeJson(text);

  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Запрос не удался (HTTP ${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export type GoogleAuthResponse = {
  token: string;
  user: { email: string; name?: string; picture?: string; isAdmin: boolean };
};

export const exchangeGoogleCredential = (credential: string) =>
  request<GoogleAuthResponse>("/auth/google", {
    method: "POST",
    body: { credential },
  });

export const fetchAdminProducts = (token: string) =>
  request<{ products: AdminProduct[] }>("/admin/products", { token });

export const createAdminProduct = (token: string, body: unknown) =>
  request<{ product: AdminProduct }>("/admin/products", { method: "POST", body, token });

export const updateAdminProduct = (token: string, id: string, body: unknown) =>
  request<{ product: AdminProduct }>(`/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
    token,
  });

export const deleteAdminProduct = (token: string, id: string) =>
  request<{ ok: boolean }>(`/admin/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });

export const lookupProduct = (token: string, store: "magnit" | "lenta", queryOrUrl: string) =>
  request<{ mode: string; items: LookupItem[] }>("/admin/lookup", {
    method: "POST",
    body: { store, queryOrUrl },
    token,
  });

export type SyncResponse = {
  updatedAt: string;
  total: number;
  synced: number;
  errors: { productId: string; name: string; store: string; error: string }[];
  products?: AdminProduct[];
};

export const syncPrices = (token: string, productId?: string) =>
  request<SyncResponse>("/admin/sync", {
    method: "POST",
    body: productId ? { productId } : {},
    token,
  });
