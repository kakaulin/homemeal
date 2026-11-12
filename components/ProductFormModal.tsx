"use client";

import { Button, Modal } from "@heroui/react";
import { useEffect, useState } from "react";

import { PRODUCT_CATEGORIES, UNIT_OPTIONS } from "@/lib/categories";
import { parseNumber, parseNumberOrZero, toInputValue } from "@/lib/number";
import { createId } from "@/lib/store";
import type { Product, ProductUnit } from "@/lib/types";

import { NumberInput, SelectField, TextInput } from "./ui/Field";

type FormState = {
  name: string;
  category: string;
  unit: ProductUnit;
  price: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
  gramsPerPiece: string;
};

const EMPTY: FormState = {
  name: "",
  category: PRODUCT_CATEGORIES[0],
  unit: "g",
  price: "",
  kcal: "",
  protein: "",
  fat: "",
  carbs: "",
  gramsPerPiece: "",
};

function toForm(product: Product | null): FormState {
  if (!product) return { ...EMPTY };

  const isPiece = product.unit === "piece";

  return {
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: toInputValue(isPiece ? product.pricePerPiece : product.pricePer100),
    kcal: toInputValue(isPiece ? product.kcalPerPiece : product.kcal100),
    protein: toInputValue(
      isPiece ? product.proteinPerPiece : product.protein100,
    ),
    fat: toInputValue(isPiece ? product.fatPerPiece : product.fat100),
    carbs: toInputValue(isPiece ? product.carbsPerPiece : product.carbs100),
    gramsPerPiece: toInputValue(product.gramsPerPiece),
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

export function ProductFormModal({
  isOpen,
  product,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (product: Product) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(product));
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(product));
      setErrors({});
    }
  }, [isOpen, product]);

  const isPiece = form.unit === "piece";
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = () => {
    const nextErrors: Errors = {};
    const name = form.name.trim();
    const price = parseNumber(form.price);
    const kcal = parseNumber(form.kcal);

    if (!name) nextErrors.name = "Введите название продукта";
    if (price === null) nextErrors.price = "Укажите цену";
    else if (price < 0) nextErrors.price = "Цена не может быть отрицательной";
    if (kcal === null) nextErrors.kcal = "Укажите калорийность";
    else if (kcal < 0) nextErrors.kcal = "Калорийность не может быть отрицательной";

    let gramsPerPiece: number | null = null;
    if (isPiece) {
      gramsPerPiece = parseNumber(form.gramsPerPiece);
      if (gramsPerPiece === null || gramsPerPiece <= 0) {
        nextErrors.gramsPerPiece = "Укажите вес одной штуки в граммах";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const catalogPart = {
      id: product?.id ?? createId("prod"),
      name,
      category: form.category,
      unit: form.unit,
    };

    const result: Product = isPiece
      ? {
          ...catalogPart,
          pricePerPiece: price ?? 0,
          gramsPerPiece: gramsPerPiece ?? 0,
          kcalPerPiece: kcal ?? 0,
          proteinPerPiece: parseNumberOrZero(form.protein),
          fatPerPiece: parseNumberOrZero(form.fat),
          carbsPerPiece: parseNumberOrZero(form.carbs),
        }
      : {
          ...catalogPart,
          pricePer100: price ?? 0,
          kcal100: kcal ?? 0,
          protein100: parseNumberOrZero(form.protein),
          fat100: parseNumberOrZero(form.fat),
          carbs100: parseNumberOrZero(form.carbs),
        };

    onSubmit(result);
    onClose();
  };

  const amountSuffix = isPiece ? "₽ / шт" : "₽ / 100 г";
  const energySuffix = isPiece ? "ккал / шт" : "ккал / 100 г";
  const macroSuffix = isPiece ? "г / шт" : "г / 100 г";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Modal.Heading>
                    {product ? "Редактировать продукт" : "Новый продукт"}
                  </Modal.Heading>
                  <p className="mt-1 text-xs text-muted">
                    Цена и КБЖУ указываются на 100 г, 100 мл или за одну штуку.
                  </p>
                </div>
                <Modal.CloseTrigger />
              </div>
            </Modal.Header>

            <Modal.Body
              className="space-y-4"
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
                  label="Название"
                  value={form.name}
                  onChange={(value) => set("name", value)}
                  placeholder="Например, куриная грудка"
                  error={errors.name}
                  isRequired
                  autoFocus
                  className="sm:col-span-2"
                />
                <SelectField
                  label="Категория"
                  value={form.category}
                  onChange={(value) => set("category", value)}
                  options={PRODUCT_CATEGORIES.map((category) => ({
                    id: category,
                    label: category,
                  }))}
                />
                <SelectField
                  label="Единица измерения"
                  value={form.unit}
                  onChange={(value) => set("unit", value as ProductUnit)}
                  options={UNIT_OPTIONS.map((option) => ({
                    id: option.id,
                    label: option.label,
                  }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Цена"
                  value={form.price}
                  onChange={(value) => set("price", value)}
                  suffix={amountSuffix}
                  error={errors.price}
                  isRequired
                />
                <NumberInput
                  label="Калорийность"
                  value={form.kcal}
                  onChange={(value) => set("kcal", value)}
                  suffix={energySuffix}
                  error={errors.kcal}
                  isRequired
                />
                {isPiece ? (
                  <NumberInput
                    label="Вес одной штуки"
                    value={form.gramsPerPiece}
                    onChange={(value) => set("gramsPerPiece", value)}
                    suffix="грамм"
                    error={errors.gramsPerPiece}
                    isRequired
                    hint="Нужен, чтобы пересчитывать граммы в штуки."
                    className="sm:col-span-2"
                  />
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  КБЖУ
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <NumberInput
                    label="Белки"
                    value={form.protein}
                    onChange={(value) => set("protein", value)}
                    suffix={macroSuffix}
                  />
                  <NumberInput
                    label="Жиры"
                    value={form.fat}
                    onChange={(value) => set("fat", value)}
                    suffix={macroSuffix}
                  />
                  <NumberInput
                    label="Углеводы"
                    value={form.carbs}
                    onChange={(value) => set("carbs", value)}
                    suffix={macroSuffix}
                  />
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="tertiary" onPress={onClose}>
                Отмена
              </Button>
              <Button variant="primary" onPress={handleSubmit}>
                {product ? "Сохранить" : "Добавить продукт"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
