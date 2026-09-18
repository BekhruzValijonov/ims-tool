import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  /*
   * Список зависимостей закреплён, а не собирается по мере обнаружения.
   *
   * Половина из них подключается лениво: графики — при первом заходе на
   * дашборд, driver.js — при первом запуске обхода, плагины Tauri — при первой
   * выгрузке. Каждое такое открытие заставляло Vite пересобрать зависимости и
   * перезагрузить открытую вкладку, а вкладка, пережившая пересборку, иногда
   * остаётся с двумя копиями React и падает на первом же useState.
   */
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "apexcharts",
      "react-apexcharts",
      "driver.js",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-fs",
      "@tauri-apps/plugin-sql",
    ],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
