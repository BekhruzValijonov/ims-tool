/**
 * Текст для поиска, заранее приведённый к нижнему регистру.
 *
 * Считается в JS и хранится отдельной колонкой, потому что встроенная в SQLite
 * функция lower() работает только с латиницей: «Мультиметр» она оставляет как
 * есть, и поиск по русскому названию не находит ничего. Своей ICU в сборке
 * Tauri нет, а русские названия здесь — норма, а не исключение.
 */
export function buildSearchText(...parts: readonly (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ").toLowerCase()
}

export function normalizeSearchQuery(text: string): string {
  return text.trim().toLowerCase()
}
