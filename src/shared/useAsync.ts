import { useCallback, useEffect, useState } from "react"

interface AsyncState<T> {
  readonly data: T | null
  readonly loading: boolean
  readonly error: string | null
  reload(): void
}

/**
 * Загрузка данных экрана.
 *
 * Результат устаревшего запроса не применяется: при быстрой смене фильтров
 * ответы возвращаются не в том порядке, в каком уходили, и без этой проверки
 * таблица показала бы результат предыдущего фильтра.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((failure: unknown) => {
        if (cancelled) return
        setError(failure instanceof Error ? failure.message : String(failure))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, reload }
}
