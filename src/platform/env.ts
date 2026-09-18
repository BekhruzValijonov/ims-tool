/**
 * Где выполняется приложение.
 *
 * В браузере (дев-сервер Vite) нет ни Tauri, ни SQLite — там работает
 * MemoryRepo. Проверка по внутреннему объекту Tauri, а не по user agent:
 * user agent у WebView обычный.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

export function isDevelopment(): boolean {
  return import.meta.env.MODE === "development"
}
