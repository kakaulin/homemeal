import type { Metadata } from "next";

import { DishesScreen } from "@/components/DishesScreen";

export const metadata: Metadata = {
  title: "Блюда — Home Meal",
};

export default function DishesPage() {
  return <DishesScreen />;
}
