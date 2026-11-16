"use client";

import { Button, Card, Chip, Skeleton } from "@heroui/react";
import { useEffect, useState } from "react";

import { formatGrams, formatMoney } from "@/lib/format";
import {
  buildPriceUrl,
  priceApiBase,
  storeLabel,
  STORE_OPTIONS,
  type ApiItem,
} from "@/lib/priceApi";

import { IconRefresh } from "./icons";

type WidgetData = {
  product: string;
  price: number;
  pricePer100: number | null;
  weightGrams: number | null;
  store: string;
  items: ApiItem[];
};

export function PriceWidget() {
  const [store, setStore] = useState<string>(STORE_OPTIONS[0].id);
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const url = buildPriceUrl({ store });
    if (!url) return;

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    setLoading(true);
    setError(false);

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json: Record<string, unknown>) => {
        const price = Number(json.price);
        if (!Number.isFinite(price)) throw new Error("В ответе нет цены");
        if (cancelled) return;

        setData({
          product: String(json.product ?? ""),
          price,
          pricePer100: json.pricePer100 != null ? Number(json.pricePer100) : null,
          weightGrams: json.weightGrams != null ? Number(json.weightGrams) : null,
          store: String(json.store ?? store),
          items: Array.isArray(json.items) ? (json.items as ApiItem[]) : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [store, attempt]);

  // Без URL (или с заглушкой) виджет не показываем — это нормальный локальный режим.
  if (!priceApiBase) return null;

  return (
    <Card className="border border-border bg-surface">
      <Card.Header>
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Card.Title className="text-sm font-semibold">Актуальная цена</Card.Title>
          <div className="flex gap-1">
            {STORE_OPTIONS.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={store === option.id ? "secondary" : "ghost"}
                onPress={() => setStore(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        ) : error || !data ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-danger">
              Не удалось загрузить цену
            </p>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setAttempt((value) => value + 1)}
            >
              <IconRefresh className="size-4" />
              Повторить
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{data.product}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Chip size="sm" variant="secondary">
                  {storeLabel(data.store)}
                </Chip>
                {data.weightGrams ? <span>{formatGrams(data.weightGrams)}</span> : null}
                {data.pricePer100 != null ? (
                  <span>{formatMoney(data.pricePer100)} за 100 г</span>
                ) : null}
              </div>
            </div>
            <p className="tnum text-3xl leading-none font-bold tracking-tight">
              {formatMoney(data.price)}
            </p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
