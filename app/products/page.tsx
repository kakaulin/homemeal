import type { Metadata } from "next";

import { ProductsScreen } from "@/components/ProductsScreen";

export const metadata: Metadata = {
  title: "Продукты — Home Meal",
};

export default function ProductsPage() {
  return <ProductsScreen />;
}
