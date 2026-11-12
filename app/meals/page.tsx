import type { Metadata } from "next";

import { MealsScreen } from "@/components/MealsScreen";

export const metadata: Metadata = {
  title: "Приёмы пищи — Home Meal",
};

export default function MealsPage() {
  return <MealsScreen />;
}
