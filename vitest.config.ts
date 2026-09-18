import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    /* jsdom на весь набор: тесты слоя данных от него не страдают (node:sqlite
       остаётся доступным), а разделять среды по маске файлов vitest 5 больше
       не умеет. */
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
})
