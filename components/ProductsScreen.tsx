"use client";

import { Button, Card, Chip, Input, Label, Table, TextField } from "@heroui/react";
import { useMemo, useState } from "react";

import { formatKcal, formatMoney, formatPieces, priceUnitLabel } from "@/lib/format";
import { useHomeMeal, useHydrated } from "@/lib/store";
import type { Product } from "@/lib/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { ProductFormModal } from "./ProductFormModal";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "./icons";
import { Macros } from "./ui/Metric";
import { EmptyState, LoadingBlock, PageHeader } from "./ui/PageHeader";

function productKcal(product: Product) {
  return product.unit === "piece" ? product.kcalPerPiece : product.kcal100;
}

function productMacros(product: Product) {
  const isPiece = product.unit === "piece";
  return {
    protein: (isPiece ? product.proteinPerPiece : product.protein100) ?? 0,
    fat: (isPiece ? product.fatPerPiece : product.fat100) ?? 0,
    carbs: (isPiece ? product.carbsPerPiece : product.carbs100) ?? 0,
  };
}

function productPrice(product: Product) {
  return product.unit === "piece" ? product.pricePerPiece : product.pricePer100;
}

export function ProductsScreen() {
  const hydrated = useHydrated();
  const products = useHomeMeal((state) => state.products);
  const addProduct = useHomeMeal((state) => state.addProduct);
  const updateProduct = useHomeMeal((state) => state.updateProduct);
  const deleteProduct = useHomeMeal((state) => state.deleteProduct);

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.category.toLowerCase().includes(needle),
    );
  }, [products, query]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleSubmit = (product: Product) => {
    if (editing) updateProduct(editing.id, product);
    else addProduct(product);
  };

  const renderActions = (product: Product) => (
    <div className="flex shrink-0 gap-1">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Изменить ${product.name}`}
        onPress={() => openEdit(product)}
      >
        <IconPencil className="size-4" />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Удалить ${product.name}`}
        onPress={() => setDeleting(product)}
      >
        <IconTrash className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Продукты"
        description="База продуктов с ценой и КБЖУ. Всё, что нужно для расчёта домашних блюд."
        actions={
          <Button variant="primary" onPress={openCreate}>
            <IconPlus className="size-4" />
            Добавить продукт
          </Button>
        }
      />

      {!hydrated ? (
        <LoadingBlock rows={6} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <TextField
              className="w-full sm:max-w-sm"
              fullWidth
              value={query}
              onChange={setQuery}
            >
              <Label>Поиск</Label>
              <div className="relative">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <Input fullWidth placeholder="Название или категория" className="pl-9" />
              </div>
            </TextField>
            <p className="text-sm text-muted">
              {visible.length === products.length
                ? `Всего продуктов: ${products.length}`
                : `Найдено: ${visible.length} из ${products.length}`}
            </p>
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Пока нет ни одного продукта"
              description="Добавьте первый продукт с ценой и КБЖУ — из него можно будет собрать блюдо."
              action={
                <Button variant="primary" onPress={openCreate}>
                  <IconPlus className="size-4" />
                  Добавить продукт
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              title="Ничего не найдено"
              description={`По запросу «${query.trim()}» продуктов нет. Попробуйте другое название или категорию.`}
              action={
                <Button variant="tertiary" onPress={() => setQuery("")}>
                  Сбросить поиск
                </Button>
              }
            />
          ) : (
            <>
              {/* Мобильный вариант: карточки вместо горизонтальной прокрутки таблицы */}
              <div className="space-y-2 sm:hidden">
                {visible.map((product) => {
                  const macros = productMacros(product);
                  return (
                    <Card
                      key={product.id}
                      className="border border-border bg-surface"
                    >
                      <Card.Content className="flex w-full flex-row items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{product.name}</p>
                          <div className="mt-1.5">
                            <Chip size="sm">{product.category}</Chip>
                          </div>
                          <p className="tnum mt-2 text-sm font-medium">
                            {formatMoney(productPrice(product))}
                            <span className="ml-1 text-xs font-normal text-muted">
                              {priceUnitLabel(product.unit)}
                            </span>
                          </p>
                          <p className="tnum text-xs text-muted">
                            {formatKcal(productKcal(product))}
                            {product.unit === "piece"
                              ? ` · ${product.gramsPerPiece ?? 0} г за штуку`
                              : " · на 100 г"}
                          </p>
                          <Macros
                            protein={macros.protein}
                            fat={macros.fat}
                            carbs={macros.carbs}
                            className="mt-1"
                          />
                        </div>
                        {renderActions(product)}
                      </Card.Content>
                    </Card>
                  );
                })}
              </div>

              <Card className="hidden overflow-hidden border border-border bg-surface p-0 sm:block">
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Content
                      aria-label="Список продуктов"
                      className="min-w-[760px]"
                    >
                      <Table.Header>
                        <Table.Column isRowHeader>Продукт</Table.Column>
                        <Table.Column>Категория</Table.Column>
                        <Table.Column>Цена</Table.Column>
                        <Table.Column>Калорийность</Table.Column>
                        <Table.Column>Б / Ж / У</Table.Column>
                        <Table.Column> </Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {visible.map((product) => {
                          const macros = productMacros(product);
                          return (
                            <Table.Row key={product.id} id={product.id}>
                              <Table.Cell>
                                <span className="font-semibold">{product.name}</span>
                                {product.unit === "piece" ? (
                                  <span className="ml-2 text-xs text-muted">
                                    {formatPieces(1)} ={" "}
                                    {product.gramsPerPiece ?? 0} г
                                  </span>
                                ) : null}
                              </Table.Cell>
                              <Table.Cell>
                                <Chip size="sm">{product.category}</Chip>
                              </Table.Cell>
                              <Table.Cell className="whitespace-nowrap">
                                <span className="tnum font-medium">
                                  {formatMoney(productPrice(product))}
                                </span>
                                <span className="block text-xs text-muted">
                                  {priceUnitLabel(product.unit)}
                                </span>
                              </Table.Cell>
                              <Table.Cell className="whitespace-nowrap">
                                <span className="tnum">
                                  {formatKcal(productKcal(product))}
                                </span>
                                <span className="block text-xs text-muted">
                                  {product.unit === "piece" ? "за штуку" : "на 100 г"}
                                </span>
                              </Table.Cell>
                              <Table.Cell className="tnum whitespace-nowrap text-sm">
                                {macros.protein.toLocaleString("ru-RU", {
                                  maximumFractionDigits: 1,
                                })}{" "}
                                /{" "}
                                {macros.fat.toLocaleString("ru-RU", {
                                  maximumFractionDigits: 1,
                                })}{" "}
                                /{" "}
                                {macros.carbs.toLocaleString("ru-RU", {
                                  maximumFractionDigits: 1,
                                })}
                              </Table.Cell>
                              <Table.Cell>
                                <div className="flex justify-end">
                                  {renderActions(product)}
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      <ProductFormModal
        isOpen={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Удалить продукт?"
        description={
          deleting
            ? `«${deleting.name}» исчезнет из базы и из состава блюд, где он используется. Отменить это действие нельзя.`
            : ""
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteProduct(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
