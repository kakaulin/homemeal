"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { IconDishes, IconMeals, IconProducts } from "./icons";

const items = [
  { href: "/products", label: "Продукты", caption: "цены и КБЖУ", Icon: IconProducts },
  { href: "/dishes", label: "Блюда", caption: "состав и вес", Icon: IconDishes },
  { href: "/meals", label: "Приёмы пищи", caption: "порции и итоги", Icon: IconMeals },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-border bg-surface lg:flex">
        <Link href="/products" className="flex items-center gap-3 px-5 py-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-lg font-extrabold text-accent-foreground">
            HM
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold leading-tight">
              Home Meal
            </span>
            <span className="block truncate text-xs text-muted">
              домашняя кухня в цифрах
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-3" aria-label="Основная навигация">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  active
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted hover:bg-default hover:text-foreground",
                )}
              >
                <item.Icon className="mt-0.5 size-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "block text-xs leading-4",
                      active ? "text-accent-foreground/80" : "text-muted",
                    )}
                  >
                    {item.caption}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-5 py-4 text-xs leading-5 text-muted">
          Данные хранятся только в этом браузере.
          <br />
          Ничего не отправляется на сервер.
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-extrabold text-accent-foreground">
              HM
            </span>
            <span className="text-base font-bold">Home Meal</span>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto px-3 pb-3"
            aria-label="Основная навигация"
          >
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:bg-default hover:text-foreground",
                  )}
                >
                  <item.Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
