"use client";

import { Button, Card, Skeleton } from "@heroui/react";
import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/format";

type PriceData = { product: string; price: number };

export function PriceWidget() {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const url = process.env.NEXT_PUBLIC_API_URL;

    setLoading(true);
    setError(false);

    (url ? fetch(url) : Promise.reject(new Error("NEXT_PUBLIC_API_URL не задан")))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json: { product?: unknown; price?: unknown }) => {
        const price = Number(json.price);
        if (!Number.isFinite(price)) throw new Error("В ответе нет цены");
        if (!cancelled) setData({ product: String(json.product ?? ""), price });
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <Card className="border border-border bg-surface">
      <Card.Header>
        <Card.Title className="text-sm font-semibold">Актуальная цена</Card.Title>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-24" />
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
              Попробовать снова
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{data.product}</p>
            <p className="tnum text-lg font-bold">{formatMoney(data.price)}</p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
