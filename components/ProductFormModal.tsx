"use client";

import { Button, Modal } from "@heroui/react";
import { useEffect, useState } from "react";

import { PRODUCT_CATEGORIES, UNIT_OPTIONS } from "@/lib/categories";
import { formatGrams, formatMoney } from "@/lib/format";
import { parseNumber, parseNumberOrZero, toInputValue } from "@/lib/number";
import {
  buildPriceUrl,
  priceApiBase,
  readNutrition,
  STORE_OPTIONS,
  storeLabel,
  type ApiItem,
} from "@/lib/priceApi";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStore, setSearchStore] = useState<string>(STORE_OPTIONS[0].id);
  const [results, setResults] = useState<ApiItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [weightHint, setWeightHint] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(product));
      setErrors({});
      setSearchQuery(product?.name ?? "");
      setResults([]);
      setSearchError("");
      setWeightHint(false);
    }
  }, [isOpen, product]);

  const runSearch = async () => {
    const url = buildPriceUrl({ q: searchQuery.trim(), store: searchStore });
    if (!url) return;

    setSearching(true);
    setSearchError("");

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      const items: ApiItem[] = Array.isArray(json.items) ? json.items : [];

      setResults(items.slice(0, 5));
      if (items.length === 0) setSearchError("Ничего не найдено");
    } catch {
      setResults([]);
      setSearchError("Не удалось получить цены");
    } finally {
      setSearching(false);
    }
  };

  const applyItem = (item: ApiItem) => {
    const nutrition = readNutrition(item.nutrition);
    const per100 = item.pricePer100 != null ? item.pricePer100 : null;

    setForm((current) => ({
      ...current,
      name: current.name.trim() ? current.name : item.name,
      price: toInputValue(per100 ?? item.price),
      kcal: nutrition.kcal != null ? toInputValue(nutrition.kcal) : current.kcal,
      protein:
        nutrition.protein != null ? toInputValue(nutrition.protein) : current.protein,
      fat: nutrition.fat != null ? toInputValue(nutrition.fat) : current.fat,
      carbs: nutrition.carbs != null ? toInputValue(nutrition.carbs) : current.carbs,
    }));

    setWeightHint(per100 === null);
    setErrors((current) => ({ ...current, name: undefined, price: undefined }));
  };

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

  const amountSuffix = isPiece
    ? "₽ / шт"
    : form.unit === "ml"
      ? "₽ / 100 мл"
      : "₽ / 100 г";
  const energySuffix = isPiece
    ? "ккал / шт"
    : form.unit === "ml"
      ? "ккал / 100 мл"
      : "ккал / 100 г";
  const macroSuffix = isPiece
    ? "г / шт"
    : form.unit === "ml"
      ? "г / 100 мл"
      : "г / 100 г";

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
              {priceApiBase ? (
                <div
                  className="rounded-xl border border-border bg-default/40 p-3"
                  onKeyDown={(event) => {
                    // Enter в поле поиска ищет товар, а не отправляет форму.
                    if (event.key !== "Enter") return;
                    if ((event.target as HTMLElement).tagName !== "INPUT") return;
                    event.preventDefault();
                    event.stopPropagation();
                    void runSearch();
                  }}
                >
                  <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                    Найти в магазине
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <TextInput
                      label="Запрос"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="манная крупа"
                      className="sm:flex-1"
                    />
                    <SelectField
                      label="Магазин"
                      value={searchStore}
                      onChange={setSearchStore}
                      options={STORE_OPTIONS.map((option) => ({
                        id: option.id,
                        label: option.label,
                      }))}
                      className="sm:w-36"
                    />
                    <Button
                      variant="secondary"
                      onPress={runSearch}
                      isDisabled={searching || !searchQuery.trim()}
                    >
                      {searching ? "Ищу…" : "Найти"}
                    </Button>
                  </div>

                  {searchError ? (
                    <p className="mt-2 text-xs font-medium text-danger">{searchError}</p>
                  ) : null}

                  {results.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {results.map((item, index) => (
                        <li key={`${item.store}-${item.name}-${index}`}>
                          <button
                            type="button"
                            onClick={() => applyItem(item)}
                            className="w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-default"
                          >
                            <span className="font-medium">{item.name}</span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {storeLabel(item.store)} · {formatMoney(item.price)}
                              {item.weightGrams
                                ? ` · ${formatGrams(item.weightGrams)}`
                                : ""}
                              {item.pricePer100 != null
                                ? ` · ${formatMoney(item.pricePer100)} за 100 г`
                                : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

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
                  hint={
                    weightHint
                      ? "Вес упаковки не распознан — подставлена цена за упаковку."
                      : undefined
                  }
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
