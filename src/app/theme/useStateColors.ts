import { useColorScheme } from "@mui/material/styles"
import { CHART_SERIES, CHART_SERIES_DARK, STATE, STATE_DARK } from "./tokens"

/**
 * Цвета состояний под текущую схему.
 *
 * Нужен хук, а не константа: цвет уходит в атрибуты SVG, где переменные CSS
 * не раскрываются, поэтому графики обязаны получить готовое значение. Схема
 * берётся у MUI — «системная» разворачивается в ту, что применилась на самом
 * деле.
 */
export function useStateColors() {
  const { mode, systemMode } = useColorScheme()
  const dark = (systemMode ?? mode) === "dark"

  return {
    dark,
    state: dark ? STATE_DARK : STATE,
    series: dark ? CHART_SERIES_DARK : CHART_SERIES,
  }
}
