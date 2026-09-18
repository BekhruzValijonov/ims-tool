import { useThemeMode } from "../ThemeMode"
import { CHART_SERIES, CHART_SERIES_DARK, STATE, STATE_DARK } from "./tokens"

/**
 * Цвета состояний под текущую схему.
 *
 * Нужен хук, а не константа: цвет уходит в настройки графиков и в атрибуты
 * SVG, где переменные CSS не раскрываются, поэтому значение должно быть
 * готовым.
 */
export function useStateColors() {
  const { mode } = useThemeMode()
  const dark = mode === "dark"

  return {
    dark,
    state: dark ? STATE_DARK : STATE,
    series: dark ? CHART_SERIES_DARK : CHART_SERIES,
  }
}
