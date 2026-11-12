"use client";

import { Button, Card, Chip } from "@heroui/react";
import { useState } from "react";

import { calculateDish, calculateMeal, scaleDishTotals } from "@/lib/calc";
import { DASH, formatGrams, formatKcal, formatMoney, plural } from "@/lib/format";
import { useHomeMeal, useHydrated } from "@/lib/store";
import type { Dish, Meal, Product } from "@/lib/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { MealFormModal } from "./MealFormModal";
import { IconPencil, IconPlus, IconTrash } from "./icons";
import { EmptyState, LoadingBlock, PageHeader } from "./ui/PageHeader";
import { Macros } from "./ui/Metric";

type BreakdownRow = {
  key: string;
  name: string;
  portion: number;
  missing: boolean;
  noWeight: boolean;
  cost: number;
  kcal: number;
};

function buildBreakdown(
  meal: Meal,
  dishes: Dish[],
  products: Product[],
): BreakdownRow[] {
  return meal.items.map((item, index) => {
    const dish = dishes.find((candidate) => candidate.id === item.dishId);

    if (!dish) {
      return {
        key: `${item.dishId}-${index}`,
        name: "Блюдо удалено",
        portion: item.portionGrams,
        missing: true,
        noWeight: false,
        cost: 0,
        kcal: 0,
      };
    }

    const dishTotals = calculateDish(dish, products);
    const scaled = dishTotals
      ? scaleDishTotals(dishTotals, item.portionGrams, dish.cookedWeightGrams)
      : null;

    return {
      key: `${dish.id}-${index}`,
      name: dish.name,
      portion: item.portionGrams,
      missing: false,
      noWeight: scaled === null,
      cost: scaled?.totalCost ?? 0,
      kcal: scaled?.totalKcal ?? 0,
    };
  });
}

export function MealsScreen() {
  const hydrated = useHydrated();
  const products = useHomeMeal((state) => state.products);
  const dishes = useHomeMeal((state) => state.dishes);
  const meals = useHomeMeal((state) => state.meals);
  const addMeal = useHomeMeal((state) => state.addMeal);
  const updateMeal = useHomeMeal((state) => state.updateMeal);
  const deleteMeal = useHomeMeal((state) => state.deleteMeal);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (meal: Meal) => {
    setEditing(meal);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Приёмы пищи"
        description="Соберите приём пищи из готовых блюд и порций — стоимость и КБЖУ сложатся автоматически."
        actions={
          <Button variant="primary" onPress={openCreate}>
            <IconPlus className="size-4" />
            Создать приём пищи
          </Button>
        }
      />

      {!hydrated ? (
        <LoadingBlock rows={4} />
      ) : meals.length === 0 ? (
        <EmptyState
          title="Пока нет ни одного приёма пищи"
          description="Добавьте блюда с порциями в граммах — увидите стоимость и КБЖУ всего приёма пищи."
          action={
            <Button variant="primary" onPress={openCreate}>
              <IconPlus className="size-4" />
              Создать приём пищи
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {meals.map((meal) => {
            const totals = calculateMeal(meal, dishes, products);
            const breakdown = buildBreakdown(meal, dishes, products);

            return (
              <Card
                key={meal.id}
                className="flex h-full flex-col border border-border bg-surface"
              >
                <Card.Header className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Card.Title className="text-base font-bold">{meal.name}</Card.Title>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Chip size="sm" variant="secondary">
                        {formatGrams(totals.totalGrams)}
                      </Chip>
                      <Chip size="sm" variant="secondary">
                        {meal.items.length}{" "}
                        {plural(meal.items.length, "блюдо", "блюда", "блюд")}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Изменить ${meal.name}`}
                      onPress={() => openEdit(meal)}
                    >
                      <IconPencil className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Удалить ${meal.name}`}
                      onPress={() => setDeleting(meal)}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                </Card.Header>

                <Card.Content className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-default px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                        Стоимость
                      </div>
                      <div className="tnum mt-0.5 text-sm font-semibold">
                        {formatMoney(totals.totalCost)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-default px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                        Калории
                      </div>
                      <div className="tnum mt-0.5 text-sm font-semibold">
                        {formatKcal(totals.totalKcal)}
                      </div>
                    </div>
                  </div>

                  <Macros
                    protein={totals.totalProtein}
                    fat={totals.totalFat}
                    carbs={totals.totalCarbs}
                  />

                  <div className="border-t border-separator pt-3">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                      Состав
                    </p>
                    <ul className="space-y-1.5">
                      {breakdown.map((row) => (
                        <li
                          key={row.key}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {row.name}
                            <span className="ml-1.5 text-xs text-muted">
                              {formatGrams(row.portion)}
                            </span>
                          </span>
                          <span className="tnum shrink-0 text-xs text-muted">
                            {row.missing
                              ? "нет в базе"
                              : row.noWeight
                                ? DASH
                                : `${formatMoney(row.cost)} · ${formatKcal(row.kcal)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      <MealFormModal
        isOpen={formOpen}
        meal={editing}
        dishes={dishes}
        products={products}
        onClose={() => setFormOpen(false)}
        onSubmit={(meal) => {
          if (editing) updateMeal(editing.id, meal);
          else addMeal(meal);
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Удалить приём пищи?"
        description={
          deleting ? `«${deleting.name}» будет удалён без возможности отмены.` : ""
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMeal(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
