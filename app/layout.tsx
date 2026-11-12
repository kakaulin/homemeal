import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { StoreHydrator } from "@/components/StoreHydrator";

import { lebowski } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Meal — стоимость и КБЖУ домашних блюд",
  description:
    "Калькулятор стоимости и КБЖУ домашних блюд и приёмов пищи: продукт → блюдо → приём пищи.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={lebowski.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <StoreHydrator />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
