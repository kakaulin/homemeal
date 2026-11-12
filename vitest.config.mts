import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Воркер-треды работают и в ограниченной среде Windows-песочницы,
    // где forks-пул не может запустить дочерний процесс (spawn EPERM).
    pool: "threads",
  },
});
