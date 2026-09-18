/** Страница выборки. Общий вид для всех списков приложения. */
export interface Page<T> {
  readonly rows: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

export const DEFAULT_PAGE_SIZE = 25

export function emptyPage<T>(page = 0, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  return { rows: [], total: 0, page, pageSize }
}
