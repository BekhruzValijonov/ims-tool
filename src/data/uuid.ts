/**
 * Идентификатор записи.
 *
 * crypto.randomUUID есть и в WebView Tauri, и в браузере, и в Node — своей
 * реализации не нужно. Запасной путь оставлен на случай небезопасного
 * контекста, где crypto.randomUUID недоступен.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `id-${ Date.now().toString(36) }-${ Math.random().toString(36).slice(2, 10) }`
}
