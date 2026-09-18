import type { Theme } from "@mui/material/styles"
import { varAlpha } from "minimal-shared/utils"
import { axisClasses, chartsGridClasses, legendClasses } from "@mui/x-charts"
import type { ChartsComponents } from "@mui/x-charts/themeAugmentation"

/**
 * Оформление графиков.
 *
 * Тонкие оси, пунктирная сетка и градиентные заливки утверждены отдельно и
 * остаются. Цвета берутся из темы Minimal, поэтому графики говорят тем же
 * языком, что и остальной интерфейс, и переключаются вместе со схемой.
 */
export const chartsCustomizations: ChartsComponents<Theme> = {
  MuiChartsAxis: {
    styleOverrides: {
      root: ({ theme }) => ({
        [`& .${ axisClasses.line }`]: {
          stroke: varAlpha(theme.vars.palette.grey["500Channel"], 0.2),
        },
        [`& .${ axisClasses.tick }`]: {
          stroke: varAlpha(theme.vars.palette.grey["500Channel"], 0.2),
        },
        [`& .${ axisClasses.tickLabel }`]: {
          fill: theme.vars.palette.text.secondary,
          fontWeight: 500,
          fontSize: 12,
        },
      }),
    },
  },
  MuiChartsTooltip: {
    styleOverrides: {
      mark: ({ theme }) => ({
        ry: 4,
        boxShadow: "none",
        border: `1px solid ${ varAlpha(theme.vars.palette.grey["500Channel"], 0.16) }`,
      }),
      table: ({ theme }) => ({
        border: `1px solid ${ varAlpha(theme.vars.palette.grey["500Channel"], 0.16) }`,
        borderRadius: 8,
        background: theme.vars.palette.background.paper,
      }),
    },
  },
  MuiChartsLegend: {
    styleOverrides: {
      root: { [`& .${ legendClasses.mark }`]: { ry: 4 } },
    },
  },
  MuiChartsGrid: {
    styleOverrides: {
      root: ({ theme }) => ({
        [`& .${ chartsGridClasses.line }`]: {
          stroke: varAlpha(theme.vars.palette.grey["500Channel"], 0.2),
          strokeDasharray: "3 3",
          strokeWidth: 0.8,
        },
      }),
    },
  },
}
