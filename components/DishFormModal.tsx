"use client";

import { Button, Modal } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

import { calculateDish } from "@/lib/calc";
import { DISH_CATEGORIES, SERVING_TYPE_OPTIONS } from "@/lib/categories";
import {
  DASH,
  formatGrams,
  formatKcal,
  formatMacro,
  formatMoney,
  priceBasisLabel,
} from "@/lib/format";
import { parseNumber, toInputValue } from "@/lib/number";
import { createId } from "@/lib/store";
import type { Dish, Product, ServingType } from "@/lib/types";

import { NumberInput, SelectField, TextAreaInput, TextInput } from "./ui/Field";
import { Metric } from "./ui/Metric";
import { IconPlus, IconTrash } from "./icons";

type Row = { key: string; productId: string; grams: string };

let rowCounter = 0;
const newRow = (): Row => {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, productId: "", grams: "" };
};

type Errors = {
  name?: string;
  cookedWeight?: string;
  items?: string;
};

export function DishFormModal({
  isOpen,
  dish,
  products,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  dish: Dish | null;
  products: Product[];
  onClose: () => void;
  onSubmit: (dish: Dish) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(DISH_CATEGORIES[0]);
  const [servingType, setServingType] = useState<ServingType>("container");
  const [cookedWeight, setCookedWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [errors, setErrors] = useState<Errors>({});
  const [gramErrors, setGramErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (dish) {
      setName(dish.name);
      setCategory(dish.category);
      setServingType(dish.servingType);
      setCookedWeight(toInputValue(dish.cookedWeightGrams));
      setNotes(dish.notes ?? "");
      setRows(
        dish.items.length > 0
          ? dish.items.map((item) => ({
              key: newRow().key,
              productId: item.productId,
              grams: toInputValue(item.grams),
            }))
          : [newRow()],
      );
    } else {
      setName("");
      setCategory(DISH_CATEGORIES[0]);
      setServingType("container");
      setCookedWeight("");
      setNotes("");
      setRows([newRow()]);
    }

    setErrors({});
    setGramErrors({});
  }, [isOpen, dish]);

  const productOptions = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category, "ru") ||
            a.name.localeCompare(b.name, "ru"),
        )
        .map((product) => {
          const price =
            product.unit === "piece" ? product.pricePerPiece : product.pricePer100;
          return {
            id: product.id,
            label: `${product.name} — ${formatMoney(price)} ${priceBasisLabel(product.unit)}`,
          };
        }),
    [products],
  );

  const parsedRows = rows.map((row) => ({
    ...row,
    grams: parseNumber(row.grams) ?? 0,
  }));

  const rawWeight = parsedRows.reduce(
    (sum, row) => sum + (row.productId ? row.grams : 0),
    0,
  );

  const preview: Dish = {
    id: dish?.id ?? "preview",
    name: name.trim() || "Новое блюдо",
    items: parsedRows
      .filter((row) => row.productId && row.grams > 0)
      .map((row) => ({ productId: row.productId, grams: row.grams })),
    cookedWeightGrams: parseNumber(cookedWeight) ?? 0,
    category,
    servingType,
    notes: notes.trim() || undefined,
  };

  const totals = calculateDish(preview, products);

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    setErrors((current) => ({ ...current, items: undefined }));
    setGramErrors((current) => ({ ...current, [key]: "" }));
  };

  const addRow = () => setRows((current) => [...current, newRow()]);

  const removeRow = (key: string) => {
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.key !== key) : current,
    );
  };

  const handleSubmit = () => {
    const nextErrors: Errors = {};
    const nextGramErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Введите название блюда";

    const weight = parseNumber(cookedWeight);
    if (weight === null || weight <= 0) {
      nextErrors.cookedWeight = "Укажите итоговый вес готового блюда";
    }

    let validItems = 0;
    for (const row of rows) {
      if (!row.productId) continue;
      const grams = parseNumber(row.grams);
      if (grams === null || grams <= 0) {
        nextGramErrors[row.key] = "Укажите вес";
        continue;
      }
      validItems += 1;
    }

    if (validItems === 0 && Object.keys(nextGramErrors).length === 0) {
      nextErrors.items = "Добавьте хотя бы один продукт с весом";
    } else if (Object.keys(nextGramErrors).length > 0) {
      nextErrors.items = "Проверьте вес продуктов в составе";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setGramErrors(nextGramErrors);
      return;
    }

    onSubmit({
      id: dish?.id ?? createId("dish"),
      name: name.trim(),
      items: rows
        .filter((row) => row.productId && (parseNumber(row.grams) ?? 0) > 0)
        .map((row) => ({ productId: row.productId, grams: parseNumber(row.grams) ?? 0 })),
      cookedWeightGrams: weight ?? 0,
      category,
      servingType,
      notes: notes.trim() || undefined,
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
        <Modal.Container size="lg" placement="center" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Modal.Heading>
                    {dish ? "Редактировать блюдо" : "Новое блюдо"}
                  </Modal.Heading>
                  <p className="mt-1 text-xs text-muted">
                    Соберите состав и укажите вес готового блюда — итоги считаются сразу.
                  </p>
                </div>
                <Modal.CloseTrigger />
              </div>
            </Modal.Header>

            <Modal.Body
              className="space-y-6"
              onKeyDown={(event) => {
                const target = event.target as HTMLElement;
                if (event.key === "Enter" && target.tagName === "INPUT") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Название блюда"
                  value={name}
                  onChange={setName}
                  placeholder="Например, рис с курицей"
                  error={errors.name}
                  isRequired
                  autoFocus
                />
                <SelectField
                  label="Категория"
                  value={category}
                  onChange={setCategory}
                  options={DISH_CATEGORIES.map((item) => ({ id: item, label: item }))}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Состав
                  </p>
                  <span className="text-xs text-muted">
                    Сырой вес: {formatGrams(rawWeight)}
                  </span>
                </div>

                <div className="hidden gap-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase sm:grid sm:grid-cols-[1fr_120px_36px]">
                  <span>Продукт</span>
                  <span>Граммы</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-2 sm:grid-cols-[1fr_120px_36px] sm:items-start"
                    >
                      <SelectField
                        label="Продукт"
                        hideLabel
                        value={row.productId}
                        onChange={(value) => updateRow(row.key, { productId: value })}
                        options={productOptions}
                        placeholder="Выберите продукт"
                      />
                      <NumberInput
                        label="Граммы"
                        hideLabel
                        value={row.grams}
                        onChange={(value) => updateRow(row.key, { grams: value })}
                        placeholder="0"
                        suffix="г"
                        error={gramErrors[row.key] || undefined}
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="justify-self-end"
                        aria-label="Удалить продукт из состава"
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
                    isDisabled={products.length === 0}
                  >
                    <IconPlus className="size-4" />
                    Добавить продукт
                  </Button>
                  {products.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      Сначала добавьте продукты на вкладке «Продукты».
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Итоговый вес готового блюда"
                  value={cookedWeight}
                  onChange={(value) => {
                    setCookedWeight(value);
                    setErrors((current) => ({ ...current, cookedWeight: undefined }));
                  }}
                  suffix="г"
                  placeholder="0"
                  error={errors.cookedWeight}
                  isRequired
                  hint="Вес после приготовления, с учётом ужарки или уварки."
                />
                <SelectField
                  label="Тип подачи"
                  value={servingType}
                  onChange={(value) => setServingType(value as ServingType)}
                  options={SERVING_TYPE_OPTIONS.map((option) => ({
                    id: option.id,
                    label: option.label,
                  }))}
                />
              </div>

              <TextAreaInput
                label="Заметки о хранении"
                value={notes}
                onChange={setNotes}
                rows={2}
                placeholder="Например: хранить в холодильнике до 3 суток"
              />

              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">Итоги блюда</p>
                  <span className="text-xs text-muted">
                    {totals ? formatGrams(preview.cookedWeightGrams) : "нужен вес блюда"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Metric
                    label="Стоимость"
                    value={totals ? formatMoney(totals.totalCost) : DASH}
                  />
                  <Metric
                    label="Калории"
                    value={totals ? formatKcal(totals.totalKcal) : DASH}
                  />
                  <Metric
                    label="Белки"
                    value={totals ? formatMacro(totals.totalProtein) : DASH}
                  />
                  <Metric
                    label="Жиры"
                    value={totals ? formatMacro(totals.totalFat) : DASH}
                  />
                  <Metric
                    label="Углеводы"
                    value={totals ? formatMacro(totals.totalCarbs) : DASH}
                  />
                </div>

                <p className="mt-4 mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  На 100 г готового блюда
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Metric
                    label="Цена"
                    value={totals ? formatMoney(totals.costPer100) : DASH}
                  />
                  <Metric
                    label="Ккал"
                    value={totals ? formatKcal(totals.kcalPer100) : DASH}
                  />
                  <Metric
                    label="Белки"
                    value={totals ? formatMacro(totals.proteinPer100) : DASH}
                  />
                  <Metric
                    label="Жиры"
                    value={totals ? formatMacro(totals.fatPer100) : DASH}
                  />
                  <Metric
                    label="Углеводы"
                    value={totals ? formatMacro(totals.carbsPer100) : DASH}
                  />
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="tertiary" onPress={onClose}>
                Отмена
              </Button>
              <Button variant="primary" onPress={handleSubmit}>
                {dish ? "Сохранить" : "Создать блюдо"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
