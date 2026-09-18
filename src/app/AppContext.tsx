import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Alert } from "../ui/Alert"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { getRepo } from "../data"
import type { AppRepo, StorageBackend } from "../data/AppRepo"

interface AppState {
  readonly repo: AppRepo
  readonly backend: StorageBackend
  /** ФИО оператора. Пока его нет, операции запрещены: журнал без автора бесполезен. */
  readonly operatorName: string | null
  setOperatorName(name: string): Promise<void>
}

const AppStateContext = createContext<AppState | null>(null)

interface AppProviderProps {
  readonly children: ReactNode
  /**
   * Готовый репозиторий вместо настоящего.
   *
   * Нужен тестам экранов: они проверяют вёрстку и поведение на данных, которые
   * сами и подготовили, а не на том, что окажется в базе устройства.
   */
  readonly repo?: AppRepo
}

export function AppProvider({ children, repo: injected }: AppProviderProps) {
  const [repo, setRepo] = useState<AppRepo | null>(injected ?? null)
  const [operatorName, setName] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (injected) {
      let cancelled = false
      injected.settings.operatorName().then((name) => { if (!cancelled) setName(name) })
      return () => { cancelled = true }
    }

    let cancelled = false
    getRepo()
      .then(async (loaded) => {
        const name = await loaded.settings.operatorName()
        if (cancelled) return
        setRepo(loaded)
        setName(name)
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error instanceof Error ? error.message : String(error))
      })
    return () => { cancelled = true }
  }, [injected])

  const setOperatorName = useCallback(async (name: string) => {
    if (!repo) return
    await repo.settings.setOperatorName(name)
    setName(name.trim())
  }, [repo])

  const value = useMemo<AppState | null>(
    () => (repo ? { repo, backend: repo.backend, operatorName, setOperatorName } : null),
    [repo, operatorName, setOperatorName],
  )

  if (failure) {
    return (
      <Stack align="center" justify="center" style={ { minHeight: "100vh", padding: 24 } }>
        <Alert severity="error" title="База данных недоступна" className="app-boot-alert">
          { failure }
        </Alert>
      </Stack>
    )
  }

  if (!value) {
    return (
      <Stack align="center" justify="center" style={ { minHeight: "100vh" } }>
        <Text tone="secondary">Открываем базу…</Text>
      </Stack>
    )
  }

  return <AppStateContext.Provider value={ value }>{ children }</AppStateContext.Provider>
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext)
  if (!state) throw new Error("useAppState вызван вне AppProvider")
  return state
}

export function useRepo(): AppRepo {
  return useAppState().repo
}

/**
 * ФИО оператора для подписи операции.
 *
 * Возвращает пустую строку, только если оператор ещё не представился — в этом
 * случае экран операций и не показывается, его закрывает модалка.
 */
export function useOperatorName(): string {
  return useAppState().operatorName ?? ""
}
