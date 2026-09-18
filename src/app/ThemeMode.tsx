import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type ThemeMode = "light" | "dark"

const STORAGE_KEY = "ims-theme"

interface ThemeModeState {
  readonly mode: ThemeMode
  toggle(): void
}

const Context = createContext<ThemeModeState | null>(null)

function readStored(): ThemeMode {
  if (typeof localStorage === "undefined") return "light"
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light"
}

/**
 * Светлая или тёмная схема.
 *
 * Заменяет useColorScheme из MUI: схема живёт атрибутом data-theme на <html>,
 * а переменные CSS переключаются сами. Выбор запоминается — оператор не должен
 * переключать тему каждую смену.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStored)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Приватный режим или запрет хранилища — тема просто не запомнится.
    }
  }, [mode])

  const toggle = useCallback(() => setMode((current) => (current === "dark" ? "light" : "dark")), [])
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle])

  return <Context.Provider value={ value }>{ children }</Context.Provider>
}

export function useThemeMode(): ThemeModeState {
  const state = useContext(Context)
  if (!state) throw new Error("useThemeMode вызван вне ThemeModeProvider")
  return state
}
