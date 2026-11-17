"use client";

import { Button, Card, Chip, Table } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteAdminProduct,
  fetchAdminProducts,
  syncPrices,
  type AdminProduct,
  type AdminStoreState,
} from "@/lib/apiClient";
import { useAuth } from "@/lib/authClient";
import { formatUpdatedAt } from "@/lib/catalog";
import { formatGrams, formatMoney } from "@/lib/format";
import { useHomeMeal } from "@/lib/store";

import { AdminProductModal } from "./AdminProductModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { GoogleAuthControl } from "./GoogleAuthControl";
import { IconPencil, IconPlus, IconRefresh, IconTrash } from "./icons";
import { EmptyState, LoadingBlock, PageHeader } from "./ui/PageHeader";

const STORES = ["magnit", "lenta"] as const;
const STORE_TITLES = { magnit: "Магнит", lenta: "Лента" } as const;

function hasError(product: AdminProduct) {
  return STORES.some((store) => product.stores?.[store]?.lastStatus === "error");
}

function StoreCell({ state }: { state?: AdminStoreState }) {
  if (!state?.target) {
    return <span className="text-xs text-muted">не привязан</span>;
  }

  const failed = state.lastStatus === "error";

  return (
    <div className="space-y-1">
      <p className={failed ? "tnum font-semibold text-warning" : "tnum font-semibold"}>
        {state.price != null ? formatMoney(state.price) : "—"}
      </p>
      {state.pricePer100 != null ? (
        <p className="tnum text-xs text-muted">{formatMoney(state.pricePer100)} / 100 г</p>
      ) : null}
      <p className="text-[11px] text-muted">
        обновлено {formatUpdatedAt(state.lastSuccessAt) ?? "—"} (GMT+7)
      </p>
      {failed ? (
        <p className="text-[11px] font-medium text-warning">
          {state.lastError ?? "ошибка"} · попытка {formatUpdatedAt(state.lastAttemptAt) ?? "—"}
        </p>
      ) : (
        <p className="text-[11px] text-muted">{state.inStock ? "в наличии" : "нет в наличии"}</p>
      )}
    </div>
  );
}

export function AdminScreen() {
  const session = useAuth((state) => state.session);
  const ready = useAuth((state) => state.ready);
  const hydrate = useAuth((state) => state.hydrate);
  const loadCatalog = useHomeMeal((state) => state.loadCatalog);

  const token = session?.token ?? null;
  const isAdmin = session?.user.isAdmin === true;

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const refresh = useCallback(async () => {
    if (!token || !isAdmin) return;

    setLoading(true);
    setError("");

    try {
      const data = await fetchAdminProducts(token);
      setProducts(data.products);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Не удалось загрузить продукты");
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sorted = useMemo(
    () => [...products].sort((a, b) => Number(hasError(b)) - Number(hasError(a))),
    [products],
  );

  const afterChange = async () => {
    await refresh();
    await loadCatalog(true);
  };

  const syncAll = async () => {
    if (!token) return;

    setBusy("all");
    setNotice("");
    setError("");

    try {
      const result = await syncPrices(token);
      await afterChange();
      setNotice(
        result.errors.length > 0
          ? `Обновлено ${result.synced}, ошибок: ${result.errors.length}`
          : `Обновлено ${result.synced} товаров`,
      );
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Синхронизация не удалась");
    } finally {
      setBusy(null);
    }
  };

  const syncOne = async (id: string) => {
    if (!token) return;

    setBusy(id);
    setNotice("");
    setError("");

    try {
      await syncPrices(token, id);
      await afterChange();
      setNotice("Цена обновлена");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Синхронизация не удалась");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (product: AdminProduct) => {
    if (!token) return;

    setBusy(product.id);

    try {
      await deleteAdminProduct(token, product.id);
      await afterChange();
      setNotice("Продукт удалён");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить");
    } finally {
      setBusy(null);
      setDeleting(null);
    }
  };

  if (!ready) return <LoadingBlock rows={4} />;

  if (!session || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Админка" description="Управление каталогом и ценами Новосибирска." />
        <EmptyState
          title="Требуется вход в аккаунт администратора"
          description="Войдите через Google под аккаунтом администратора — мы проверим права на сервере."
          action={<GoogleAuthControl />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Админка"
        description="Каталог, привязки к магазинам и синхронизация цен."
        actions={
          <>
            <Button variant="secondary" onPress={() => void syncAll()} isDisabled={busy !== null}>
              <IconRefresh className="size-4" />
              {busy === "all" ? "Обновляю…" : "Обновить все цены"}
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <IconPlus className="size-4" />
              Добавить продукт
            </Button>
          </>
        }
      />

      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

      {loading ? (
        <LoadingBlock rows={5} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="В каталоге пока нет продуктов"
          description="Добавьте первый продукт и привяжите его к Магниту и/или Ленте."
          action={
            <Button
              variant="primary"
              onPress={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <IconPlus className="size-4" />
              Добавить продукт
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden border border-border bg-surface p-0">
          <div className="overflow-x-auto">
            <Table>
              <Table.Content aria-label="Каталог для администратора" className="min-w-[980px]">
                <Table.Header>
                  <Table.Column isRowHeader>Продукт</Table.Column>
                  <Table.Column>Магнит</Table.Column>
                  <Table.Column>Лента</Table.Column>
                  <Table.Column> </Table.Column>
                </Table.Header>
                <Table.Body>
                  {sorted.map((product) => (
                    <Table.Row
                      key={product.id}
                      id={product.id}
                      className={hasError(product) ? "bg-warning/10" : undefined}
                    >
                      <Table.Cell>
                        <p className={hasError(product) ? "font-semibold text-warning" : "font-semibold"}>
                          {product.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <Chip size="sm">{product.category ?? "Прочее"}</Chip>
                          {product.packWeightGrams ? (
                            <span>{formatGrams(product.packWeightGrams)}</span>
                          ) : null}
                          {product.nutritionPer100 ? (
                            <span className="tnum">
                              {product.nutritionPer100.kcal ?? "—"} ккал · Б{" "}
                              {product.nutritionPer100.protein ?? "—"} · Ж{" "}
                              {product.nutritionPer100.fat ?? "—"} · У{" "}
                              {product.nutritionPer100.carbs ?? "—"}
                            </span>
                          ) : (
                            <span>КБЖУ не задано</span>
                          )}
                        </div>
                      </Table.Cell>
                      {STORES.map((store) => (
                        <Table.Cell key={store} className="align-top">
                          <StoreCell state={product.stores?.[store]} />
                        </Table.Cell>
                      ))}
                      <Table.Cell>
                        <div className="flex justify-end gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            aria-label={`Обновить цену ${product.name}`}
                            isDisabled={busy !== null}
                            onPress={() => void syncOne(product.id)}
                          >
                            <IconRefresh className="size-4" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            aria-label={`Редактировать ${product.name}`}
                            onPress={() => {
                              setEditing(product);
                              setModalOpen(true);
                            }}
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
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted">
        Всего продуктов: {products.length} · с ошибками: {products.filter(hasError).length} ·{" "}
        {STORE_TITLES.magnit}: Выборная ул., 87/3 · {STORE_TITLES.lenta}: Большевистская ул., 52/1
      </p>

      <AdminProductModal
        isOpen={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSaved={afterChange}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Удалить продукт?"
        description={
          deleting
            ? `«${deleting.name}» исчезнет из каталога и с витрины. Действие нельзя отменить.`
            : ""
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove(deleting);
        }}
      />
    </div>
  );
}
