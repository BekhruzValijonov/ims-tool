import { useColorScheme } from "@mui/material/styles"
import {
  CHART_SERIES,
  CHART_SERIES_LIGHT,
  STATE,
  STATE_LIGHT,
} from "./tokens"

/**
 * Цвета состояний под текущую схему.
 *
 * Нужен хук, а не константа: цвет уходит в атрибуты SVG, где переменные CSS
 * не раскрываются, поэтому графики обязаны получить готовое значение. Схема
 * берётся у MUI: «системная» разворачивается в ту, что применилась на самом
 * деле, а умолчание здесь тёмное.
 */
export function useStateColors() {
  const { mode, systemMode } = useColorScheme()
  const light = (systemMode ?? mode) === "light"

  return {
    dark: !light,
    state: light ? STATE_LIGHT : STATE,
    series: light ? CHART_SERIES_LIGHT : CHART_SERIES,
  }
}
