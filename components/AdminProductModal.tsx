"use client";

import { Button, Modal } from "@heroui/react";
import { useEffect, useState } from "react";

import {
  createAdminProduct,
  lookupProduct,
  updateAdminProduct,
  type AdminProduct,
  type LookupItem,
} from "@/lib/apiClient";
import { getAuthToken } from "@/lib/authClient";
import { PRODUCT_CATEGORIES, UNIT_OPTIONS } from "@/lib/categories";
import { formatGrams, formatMoney } from "@/lib/format";
import { toInputValue } from "@/lib/number";

import { NumberInput, SelectField, TextInput } from "./ui/Field";

type StoreKey = "magnit" | "lenta";

type FormState = {
  name: string;
  category: string;
  unit: "g" | "ml" | "piece";
  packWeightGrams: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
  magnitInput: string;
  lentaInput: string;
  magnitTarget: { goodsId?: string; url?: string | null } | null;
  lentaTarget: { id?: number; url?: string | null; ean?: string | null } | null;
};

type LookupState = {
  loading: boolean;
  error: string;
  items: LookupItem[];
};

const EMPTY: FormState = {
  name: "",
  category: PRODUCT_CATEGORIES[0],
  unit: "g",
  packWeightGrams: "",
  kcal: "",
  protein: "",
  fat: "",
  carbs: "",
  magnitInput: "",
  lentaInput: "",
  magnitTarget: null,
  lentaTarget: null,
};

const EMPTY_LOOKUP: LookupState = { loading: false, error: "", items: [] };

function toForm(product: AdminProduct | null): FormState {
  if (!product) return { ...EMPTY };

  const nutrition = product.nutritionPer100;

  return {
    name: product.name,
    category: product.category ?? PRODUCT_CATEGORIES[0],
    unit: (product.unit ?? "g") as FormState["unit"],
    packWeightGrams: toInputValue(product.packWeightGrams ?? null),
    kcal: toInputValue(nutrition?.kcal ?? null),
    protein: toInputValue(nutrition?.protein ?? null),
    fat: toInputValue(nutrition?.fat ?? null),
    carbs: toInputValue(nutrition?.carbs ?? null),
    magnitInput: product.stores?.magnit?.target?.url ?? product.stores?.magnit?.target?.goodsId ?? "",
    lentaInput: product.stores?.lenta?.target?.url ?? String(product.stores?.lenta?.target?.id ?? ""),
    magnitTarget: product.stores?.magnit?.target
      ? {
          goodsId: product.stores.magnit.target.goodsId,
          url: product.stores.magnit.target.url,
        }
      : null,
    lentaTarget: product.stores?.lenta?.target
      ? {
          id: product.stores.lenta.target.id,
          url: product.stores.lenta.target.url,
          ean: product.stores.lenta.target.ean,
        }
      : null,
  };
}

export function AdminProductModal({
  isOpen,
  product,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  product: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lookups, setLookups] = useState<Record<StoreKey, LookupState>>({
    magnit: { ...EMPTY_LOOKUP },
    lenta: { ...EMPTY_LOOKUP },
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm(toForm(product));
    setErrors({});
    setSaveError("");
    setLookups({ magnit: { ...EMPTY_LOOKUP }, lenta: { ...EMPTY_LOOKUP } });
  }, [isOpen, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const runLookup = async (store: StoreKey) => {
    const query = (store === "magnit" ? form.magnitInput : form.lentaInput).trim();
    if (!query) {
      setLookups((current) => ({
        ...current,
        [store]: { loading: false, error: "Введите ссылку, ID или название", items: [] },
      }));
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setLookups((current) => ({
        ...current,
        [store]: { loading: false, error: "Нужна авторизация", items: [] },
      }));
      return;
    }

    setLookups((current) => ({ ...current, [store]: { loading: true, error: "", items: [] } }));

    try {
      const result = await lookupProduct(token, store, query);
      setLookups((current) => ({
        ...current,
        [store]: { loading: false, error: "", items: result.items },
      }));
    } catch (error) {
      setLookups((current) => ({
        ...current,
        [store]: {
          loading: false,
          error: error instanceof Error ? error.message : "Поиск не удался",
          items: [],
        },
      }));
    }
  };

  const pick = (store: StoreKey, item: LookupItem) => {
    setForm((current) => {
      const next: FormState = { ...current };

      if (store === "magnit") {
        next.magnitTarget = { goodsId: String(item.id), url: item.url ?? null };
        next.magnitInput = item.url ?? String(item.id);
      } else {
        next.lentaTarget = { id: Number(item.id), url: item.url ?? null, ean: item.ean ?? null };
        next.lentaInput = item.url ?? String(item.id);
      }

      const suggestedWeight = item.suggestedWeightGrams ?? item.weightGrams ?? null;
      if (!current.packWeightGrams.trim() && suggestedWeight) {
        next.packWeightGrams = toInputValue(suggestedWeight);
      }

      const nutrition = item.suggestedNutrition;
      if (nutrition) {
        if (!current.kcal.trim() && nutrition.kcal != null) next.kcal = toInputValue(nutrition.kcal);
        if (!current.protein.trim() && nutrition.protein != null) next.protein = toInputValue(nutrition.protein);
        if (!current.fat.trim() && nutrition.fat != null) next.fat = toInputValue(nutrition.fat);
        if (!current.carbs.trim() && nutrition.carbs != null) next.carbs = toInputValue(nutrition.carbs);
      }

      return next;
    });

    setLookups((current) => ({ ...current, [store]: { ...current[store], items: [] } }));
  };

  const save = async () => {
    const token = getAuthToken();
    if (!token) {
      setSaveError("Нужна авторизация администратора");
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Укажите название";

    const requireNumber = (key: "kcal" | "protein" | "fat" | "carbs", label: string) => {
      if (!form[key].trim() || !Number.isFinite(Number(form[key].replace(",", ".")))) {
        nextErrors[key] = `Укажите ${label}`;
      }
    };

    requireNumber("kcal", "калорийность");
    requireNumber("protein", "белки");
    requireNumber("fat", "жиры");
    requireNumber("carbs", "углеводы");

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const body = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      packWeightGrams: form.packWeightGrams.trim()
        ? Number(form.packWeightGrams.replace(",", "."))
        : null,
      nutritionPer100: {
        kcal: Number(form.kcal.replace(",", ".")),
        protein: Number(form.protein.replace(",", ".")),
        fat: Number(form.fat.replace(",", ".")),
        carbs: Number(form.carbs.replace(",", ".")),
      },
      stores: {
        magnit: { target: form.magnitTarget },
        lenta: { target: form.lentaTarget },
      },
    };

    setSaving(true);
    setSaveError("");

    try {
      if (product) await updateAdminProduct(token, product.id, body);
      else await createAdminProduct(token, body);

      await onSaved();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const renderStoreBlock = (store: StoreKey, label: string) => {
    const lookup = lookups[store];
    const attachedId =
      store === "magnit" ? form.magnitTarget?.goodsId : form.lentaTarget?.id;
    const attachedUrl =
      store === "magnit" ? form.magnitTarget?.url : form.lentaTarget?.url;

    return (
      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <TextInput
            label="Ссылка или ID"
            value={store === "magnit" ? form.magnitInput : form.lentaInput}
            onChange={(value) => set(store === "magnit" ? "magnitInput" : "lentaInput", value)}
            placeholder={store === "magnit" ? "https://magnit.ru/product/…" : "https://lenta.com/product/…"}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onPress={() => void runLookup(store)}
            isDisabled={lookup.loading}
          >
            {lookup.loading ? "Ищу…" : "Найти"}
          </Button>
        </div>

        {attachedId != null ? (
          <p className="mt-1.5 text-xs text-muted">
            Привязано: {store === "magnit" ? attachedId : `#${attachedId}`}
            {attachedUrl ? ` · ${attachedUrl}` : ""}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">Товар магазина не привязан</p>
        )}

        {lookup.error ? (
          <p className="mt-2 text-xs font-medium text-danger">{lookup.error}</p>
        ) : null}

        {lookup.items.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {lookup.items.slice(0, 5).map((item) => (
              <li key={`${item.store}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => pick(store, item)}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-default"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {formatMoney(item.price)}
                    {item.weightGrams ? ` · ${formatGrams(item.weightGrams)}` : ""}
                    {item.suggestedNutrition?.kcal != null
                      ? ` · ${item.suggestedNutrition.kcal} ккал/100 г`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
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
                    {product ? "Редактировать продукт" : "Новый продукт"}
                  </Modal.Heading>
                  <p className="mt-1 text-xs text-muted">
                    КБЖУ вводится вручную на 100 г, ссылки на магазины — для синхронизации цен.
                  </p>
                </div>
                <Modal.CloseTrigger />
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Название"
                  value={form.name}
                  onChange={(value) => set("name", value)}
                  error={errors.name}
                  isRequired
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
                  label="Единица"
                  value={form.unit}
                  onChange={(value) => set("unit", value as FormState["unit"])}
                  options={UNIT_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
                />
                <NumberInput
                  label={form.unit === "piece" ? "Вес штуки" : "Вес упаковки"}
                  value={form.packWeightGrams}
                  onChange={(value) => set("packWeightGrams", value)}
                  suffix="г"
                  hint="Задаёт пересчёт цены за 100 г"
                />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  КБЖУ на 100 г
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <NumberInput
                    label="Ккал"
                    value={form.kcal}
                    onChange={(value) => set("kcal", value)}
                    error={errors.kcal}
                    isRequired
                  />
                  <NumberInput
                    label="Белки"
                    value={form.protein}
                    onChange={(value) => set("protein", value)}
                    error={errors.protein}
                    isRequired
                  />
                  <NumberInput
                    label="Жиры"
                    value={form.fat}
                    onChange={(value) => set("fat", value)}
                    error={errors.fat}
                    isRequired
                  />
                  <NumberInput
                    label="Углеводы"
                    value={form.carbs}
                    onChange={(value) => set("carbs", value)}
                    error={errors.carbs}
                    isRequired
                  />
                </div>
              </div>

              {renderStoreBlock("magnit", "Магнит — Выборная ул., 87/3")}
              {renderStoreBlock("lenta", "Гипер Лента — Большевистская ул., 52/1")}

              {saveError ? (
                <p className="text-sm font-medium text-danger">{saveError}</p>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="tertiary" onPress={onClose}>
                Отмена
              </Button>
              <Button variant="primary" onPress={() => void save()} isDisabled={saving}>
                {saving ? "Сохраняю…" : product ? "Сохранить" : "Добавить продукт"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
