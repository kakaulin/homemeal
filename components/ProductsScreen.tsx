"use client";

import { Button, Card, Chip, Table } from "@heroui/react";

import {
  PREFERRED_OPTIONS,
  STORE_LABELS,
  formatUpdatedLabel,
  isStale,
  type CatalogStorePrice,
} from "@/lib/catalog";
import { formatGrams, formatMoney } from "@/lib/format";
import { useHomeMeal, useHydrated } from "@/lib/store";

import { Macros } from "./ui/Metric";
import { EmptyState, LoadingBlock, PageHeader } from "./ui/PageHeader";

function PriceCell({ price }: { price?: CatalogStorePrice }) {
  if (!price || price.price == null) {
    return <p className="text-sm text-muted">—</p>;
  }

  const stale = isStale(price.lastSuccessAt);

  return (
    <div
      className={
        stale
          ? "rounded-lg border border-warning/50 bg-warning/10 px-2.5 py-2"
          : "px-2.5 py-2"
      }
    >
      <p className="tnum text-sm font-semibold">{formatMoney(price.price)}</p>
      <p className="tnum text-xs text-muted">
        {price.pricePer100 != null
          ? `${formatMoney(price.pricePer100)} / 100 г`
          : "цена за 100 г неизвестна"}
      </p>
      <p className={stale ? "text-[11px] font-medium text-warning" : "text-[11px] text-muted"}>
        {formatUpdatedLabel(price.lastSuccessAt)}
      </p>
      {stale ? (
        <p className="mt-1 text-[11px] leading-4 font-medium text-warning">
          Последнее обновление цены было более двух недель назад — цена может быть
          неактуальной
        </p>
      ) : null}
    </div>
  );
}

export function ProductsScreen() {
  const hydrated = useHydrated();
  const catalog = useHomeMeal((state) => state.catalog);
  const loading = useHomeMeal((state) => state.catalogLoading);
  const error = useHomeMeal((state) => state.catalogError);
  const preferredStore = useHomeMeal((state) => state.preferredStore);
  const setPreferredStore = useHomeMeal((state) => state.setPreferredStore);
  const loadCatalog = useHomeMeal((state) => state.loadCatalog);

  const products = catalog?.products ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Продукты"
        description="Цены Магнита и Ленты в Новосибирске и проверенное КБЖУ на 100 г. Каталог обновляется автоматически."
      />

      <Card className="border border-border bg-surface">
        <Card.Content className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm">{catalog?.city ?? "Новосибирск"}</Chip>
            <Chip size="sm" variant="secondary">
              Магнит — {catalog?.storesMeta?.magnit ?? "Выборная ул., 87/3"}
            </Chip>
            <Chip size="sm" variant="secondary">
              Гипер Лента — {catalog?.storesMeta?.lenta ?? "Большевистская ул., 52/1"}
            </Chip>
            <Chip size="sm" variant="secondary">
              обновление ежедневно в 4:00 (GMT+7)
            </Chip>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              Цены для расчёта блюд
            </span>
            <div className="flex gap-1">
              {PREFERRED_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant={preferredStore === option.id ? "secondary" : "ghost"}
                  onPress={() => setPreferredStore(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </Card.Content>
      </Card>

      {!hydrated || loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState
          title="Не удалось загрузить каталог"
          description={error}
          action={
            <Button variant="secondary" onPress={() => void loadCatalog(true)}>
              Повторить
            </Button>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="В каталоге пока нет продуктов"
          description="Цены появятся после первой синхронизации — обычно это происходит ночью."
        />
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {products.map((product) => (
              <Card key={product.id} className="border border-border bg-surface">
                <Card.Content className="space-y-3">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Chip size="sm">{product.category ?? "Прочее"}</Chip>
                      {product.packWeightGrams ? (
                        <span>{formatGrams(product.packWeightGrams)}</span>
                      ) : null}
                    </div>
                    {product.nutritionPer100 ? (
                      <Macros
                        protein={product.nutritionPer100.protein ?? 0}
                        fat={product.nutritionPer100.fat ?? 0}
                        carbs={product.nutritionPer100.carbs ?? 0}
                        className="mt-2 flex flex-wrap items-center gap-2 text-xs"
                      />
                    ) : (
                      <p className="mt-2 text-xs text-muted">КБЖУ не указано</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(["magnit", "lenta"] as const).map((store) => (
                      <div key={store}>
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                          {STORE_LABELS[store]}
                        </p>
                        <PriceCell price={product.stores[store]} />
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden border border-border bg-surface p-0 sm:block">
            <div className="overflow-x-auto">
              <Table>
                <Table.Content aria-label="Каталог продуктов" className="min-w-[900px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Продукт</Table.Column>
                    <Table.Column>Магнит</Table.Column>
                    <Table.Column>Лента</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {products.map((product) => (
                      <Table.Row key={product.id} id={product.id}>
                        <Table.Cell>
                          <p className="font-semibold">{product.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <Chip size="sm">{product.category ?? "Прочее"}</Chip>
                            {product.packWeightGrams ? (
                              <span>{formatGrams(product.packWeightGrams)}</span>
                            ) : null}
                          </div>
                          {product.nutritionPer100 ? (
                            <Macros
                              protein={product.nutritionPer100.protein ?? 0}
                              fat={product.nutritionPer100.fat ?? 0}
                              carbs={product.nutritionPer100.carbs ?? 0}
                              className="mt-1 flex flex-wrap items-center gap-2 text-xs"
                            />
                          ) : (
                            <p className="mt-1 text-xs text-muted">КБЖУ не указано</p>
                          )}
                        </Table.Cell>
                        <Table.Cell className="align-top">
                          <PriceCell price={product.stores.magnit} />
                        </Table.Cell>
                        <Table.Cell className="align-top">
                          <PriceCell price={product.stores.lenta} />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
