"use client";

import { Button, Card, Chip } from "@heroui/react";
import { useState } from "react";

import { calculateDish } from "@/lib/calc";
import { DASH, formatGrams, formatKcal, formatMoney, plural } from "@/lib/format";
import { useHomeMeal, useHydrated } from "@/lib/store";
import type { Dish, ServingType } from "@/lib/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { DishFormModal } from "./DishFormModal";
import { IconPencil, IconPlus, IconTrash } from "./icons";
import { EmptyState, LoadingBlock, PageHeader } from "./ui/PageHeader";
import { Macros } from "./ui/Metric";

const SERVING_LABELS: Record<ServingType, string> = {
  container: "Контейнер",
  beverage: "Напиток",
  standalone: "На тарелке",
};

export function DishesScreen() {
  const hydrated = useHydrated();
  const products = useHomeMeal((state) => state.products);
  const dishes = useHomeMeal((state) => state.dishes);
  const addDish = useHomeMeal((state) => state.addDish);
  const updateDish = useHomeMeal((state) => state.updateDish);
  const deleteDish = useHomeMeal((state) => state.deleteDish);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [deleting, setDeleting] = useState<Dish | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (dish: Dish) => {
    setEditing(dish);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Блюда"
        description="Состав из продуктов, итоговый вес и готовые показатели на 100 г."
        actions={
          <Button variant="primary" onPress={openCreate}>
            <IconPlus className="size-4" />
            Создать блюдо
          </Button>
        }
      />

      {!hydrated ? (
        <LoadingBlock rows={4} />
      ) : dishes.length === 0 ? (
        <EmptyState
          title="Пока нет ни одного блюда"
          description="Создайте блюдо из продуктов: система посчитает стоимость и КБЖУ всего блюда и на 100 г."
          action={
            <Button variant="primary" onPress={openCreate}>
              <IconPlus className="size-4" />
              Создать блюдо
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dishes.map((dish) => {
            const totals = calculateDish(dish, products);

            return (
              <Card
                key={dish.id}
                className="flex h-full flex-col border border-border bg-surface"
              >
                <Card.Header className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Card.Title className="text-base font-bold">{dish.name}</Card.Title>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Chip size="sm">{dish.category}</Chip>
                      <Chip size="sm" variant="secondary">
                        {SERVING_LABELS[dish.servingType]}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Изменить ${dish.name}`}
                      onPress={() => openEdit(dish)}
                    >
                      <IconPencil className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Удалить ${dish.name}`}
                      onPress={() => setDeleting(dish)}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                </Card.Header>

                <Card.Content className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-default px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                        Стоимость
                      </div>
                      <div className="tnum mt-0.5 text-sm font-semibold">
                        {totals ? formatMoney(totals.totalCost) : DASH}
                      </div>
                    </div>
                    <div className="rounded-xl bg-default px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                        Калории
                      </div>
                      <div className="tnum mt-0.5 text-sm font-semibold">
                        {totals ? formatKcal(totals.totalKcal) : DASH}
                      </div>
                    </div>
                  </div>

                  {totals ? (
                    <Macros
                      protein={totals.totalProtein}
                      fat={totals.totalFat}
                      carbs={totals.totalCarbs}
                    />
                  ) : (
                    <p className="tnum text-xs text-muted">Б: {DASH} · Ж: {DASH} · У: {DASH}</p>
                  )}

                  <div className="border-t border-separator pt-3">
                    <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                      На 100 г готового блюда
                    </p>
                    {totals ? (
                      <>
                        <p className="tnum mt-1 text-sm font-semibold">
                          {formatMoney(totals.costPer100)} · {formatKcal(totals.kcalPer100)}
                        </p>
                        <Macros
                          protein={totals.proteinPer100}
                          fat={totals.fatPer100}
                          carbs={totals.carbsPer100}
                        />
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-danger">
                        Не указан итоговый вес — показатели на 100 г недоступны.
                      </p>
                    )}
                  </div>
                </Card.Content>

                <Card.Footer className="flex flex-col items-start gap-1 text-xs text-muted">
                  <span>
                    Готовый вес: {formatGrams(dish.cookedWeightGrams)} ·{" "}
                    {dish.items.length}{" "}
                    {plural(dish.items.length, "продукт", "продукта", "продуктов")}{" "}
                    в составе
                  </span>
                  {dish.notes ? (
                    <span className="line-clamp-2">{dish.notes}</span>
                  ) : null}
                </Card.Footer>
              </Card>
            );
          })}
        </div>
      )}

      <DishFormModal
        isOpen={formOpen}
        dish={editing}
        products={products}
        onClose={() => setFormOpen(false)}
        onSubmit={(dish) => {
          if (editing) updateDish(editing.id, dish);
          else addDish(dish);
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Удалить блюдо?"
        description={
          deleting
            ? `«${deleting.name}» исчезнет из списка и из приёмов пищи, где оно используется.`
            : ""
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteDish(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
