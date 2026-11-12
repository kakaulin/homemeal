"use client";

import { Button, Modal } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

import { calculateMeal } from "@/lib/calc";
import { DASH, formatGrams, formatKcal, formatMacro, formatMoney } from "@/lib/format";
import { parseNumber, toInputValue } from "@/lib/number";
import { createId } from "@/lib/store";
import type { Dish, Meal, Product } from "@/lib/types";

import { NumberInput, SelectField, TextInput } from "./ui/Field";
import { Metric } from "./ui/Metric";
import { IconPlus, IconTrash } from "./icons";

type Row = { key: string; dishId: string; portion: string };

let rowCounter = 0;
const newRow = (): Row => {
  rowCounter += 1;
  return { key: `meal-row-${rowCounter}`, dishId: "", portion: "" };
};

type Errors = { name?: string; items?: string };

export function MealFormModal({
  isOpen,
  meal,
  dishes,
  products,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  meal: Meal | null;
  dishes: Dish[];
  products: Product[];
  onClose: () => void;
  onSubmit: (meal: Meal) => void;
}) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [errors, setErrors] = useState<Errors>({});
  const [portionErrors, setPortionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (meal) {
      setName(meal.name);
      setRows(
        meal.items.length > 0
          ? meal.items.map((item) => ({
              key: newRow().key,
              dishId: item.dishId,
              portion: toInputValue(item.portionGrams),
            }))
          : [newRow()],
      );
    } else {
      setName("");
      setRows([newRow()]);
    }

    setErrors({});
    setPortionErrors({});
  }, [isOpen, meal]);

  const dishOptions = useMemo(
    () =>
      [...dishes]
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
        .map((dish) => ({
          id: dish.id,
          label: `${dish.name} — ${formatGrams(dish.cookedWeightGrams)} готового`,
        })),
    [dishes],
  );

  const preview: Meal = {
    id: meal?.id ?? "preview",
    name: name.trim() || "Новый приём пищи",
    items: rows
      .filter((row) => row.dishId && (parseNumber(row.portion) ?? 0) > 0)
      .map((row) => ({
        dishId: row.dishId,
        portionGrams: parseNumber(row.portion) ?? 0,
      })),
  };

  const totals = calculateMeal(preview, dishes, products);

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    setErrors((current) => ({ ...current, items: undefined }));
    setPortionErrors((current) => ({ ...current, [key]: "" }));
  };

  const addRow = () => setRows((current) => [...current, newRow()]);

  const removeRow = (key: string) => {
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.key !== key) : current,
    );
  };

  const handleSubmit = () => {
    const nextErrors: Errors = {};
    const nextPortionErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Введите название приёма пищи";

    let validItems = 0;
    for (const row of rows) {
      if (!row.dishId) continue;
      const portion = parseNumber(row.portion);
      if (portion === null || portion <= 0) {
        nextPortionErrors[row.key] = "Укажите порцию";
        continue;
      }
      validItems += 1;
    }

    if (validItems === 0 && Object.keys(nextPortionErrors).length === 0) {
      nextErrors.items = "Добавьте хотя бы одно блюдо с порцией";
    } else if (Object.keys(nextPortionErrors).length > 0) {
      nextErrors.items = "Проверьте порции блюд";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setPortionErrors(nextPortionErrors);
      return;
    }

    onSubmit({
      id: meal?.id ?? createId("meal"),
      name: name.trim(),
      items: rows
        .filter((row) => row.dishId && (parseNumber(row.portion) ?? 0) > 0)
        .map((row) => ({
          dishId: row.dishId,
          portionGrams: parseNumber(row.portion) ?? 0,
        })),
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Modal.Heading>
                    {meal ? "Редактировать приём пищи" : "Новый приём пищи"}
                  </Modal.Heading>
                  <p className="mt-1 text-xs text-muted">
                    В приём пищи добавляются готовые блюда с порцией в граммах.
                  </p>
                </div>
                <Modal.CloseTrigger />
              </div>
            </Modal.Header>

            <Modal.Body
              className="space-y-5"
              onKeyDown={(event) => {
                const target = event.target as HTMLElement;
                if (event.key === "Enter" && target.tagName === "INPUT") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            >
              <TextInput
                label="Название"
                value={name}
                onChange={setName}
                placeholder="Например, обед"
                error={errors.name}
                isRequired
                autoFocus
              />

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  Блюда в приёме пищи
                </p>

                <div className="hidden gap-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase sm:grid sm:grid-cols-[1fr_120px_36px]">
                  <span>Блюдо</span>
                  <span>Порция</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-2 sm:grid-cols-[1fr_120px_36px] sm:items-start"
                    >
                      <SelectField
                        label="Блюдо"
                        hideLabel
                        value={row.dishId}
                        onChange={(value) => updateRow(row.key, { dishId: value })}
                        options={dishOptions}
                        placeholder="Выберите блюдо"
                      />
                      <NumberInput
                        label="Порция"
                        hideLabel
                        value={row.portion}
                        onChange={(value) => updateRow(row.key, { portion: value })}
                        placeholder="0"
                        suffix="г"
                        error={portionErrors[row.key] || undefined}
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="justify-self-end"
                        aria-label="Убрать блюдо из приёма пищи"
                        isDisabled={rows.length === 1}
                        onPress={() => removeRow(row.key)}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {errors.items ? (
                  <p className="mt-2 text-xs font-medium text-danger">{errors.items}</p>
                ) : null}

                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={addRow}
                    isDisabled={dishes.length === 0}
                  >
                    <IconPlus className="size-4" />
                    Добавить блюдо
                  </Button>
                  {dishes.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      Сначала создайте блюдо на вкладке «Блюда».
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">Итоги приёма пищи</p>
                  <span className="tnum text-xs text-muted">
                    {formatGrams(totals.totalGrams)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Metric label="Стоимость" value={formatMoney(totals.totalCost)} />
                  <Metric label="Калории" value={formatKcal(totals.totalKcal)} />
                  <Metric label="Белки" value={formatMacro(totals.totalProtein)} />
                  <Metric label="Жиры" value={formatMacro(totals.totalFat)} />
                  <Metric label="Углеводы" value={formatMacro(totals.totalCarbs)} />
                </div>
                {totals.totalGrams === 0 ? (
                  <p className="mt-3 text-xs text-muted">
                    Добавьте блюда с порциями — итоги появятся сразу. Прочерк {DASH}{" "}
                    означает, что данных пока нет.
                  </p>
                ) : null}
              </div>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="tertiary" onPress={onClose}>
                Отмена
              </Button>
              <Button variant="primary" onPress={handleSubmit}>
                {meal ? "Сохранить" : "Создать приём пищи"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
