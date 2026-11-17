import type { Metadata } from "next";

import { AdminScreen } from "@/components/AdminScreen";

export const metadata: Metadata = {
  title: "Админка — Home Meal",
};

export default function AdminPage() {
  return <AdminScreen />;
}
