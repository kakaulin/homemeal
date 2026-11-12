"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// redirect() из next/navigation не работает при output: "export",
// поэтому на статике уходим на /products на клиенте.
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/products");
  }, [router]);

  return null;
}
