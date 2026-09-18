import type { Theme } from "@mui/material/styles"
import { axisClasses, chartsGridClasses, legendClasses } from "@mui/x-charts"
import type { ChartsComponents } from "@mui/x-charts/themeAugmentation"
import { COLORS } from "../tokens"

/**
 * Оформление графиков.
 *
 * Единственное, что осознанно оставлено «как в шаблоне MUI Dashboard»:
 * тонкие оси без засечек, пунктирная сетка, скруглённые метки легенды и
 * градиентные заливки под линиями. Цвета подставлены свои, чтобы графики
 * говорили тем же языком, что и остальной интерфейс.
 */
export const chartsCustomizations: ChartsComponents<Theme> = {
  MuiChartsAxis: {
    styleOverrides: {
      root: ({ theme }) => ({
        [`& .${ axisClasses.line }`]: { stroke: COLORS.line },
        [`& .${ axisClasses.tick }`]: { stroke: COLORS.line },
        [`& .${ axisClasses.tickLabel }`]: {
          fill: COLORS.steel,
          fontWeight: 500,
          fontSize: 11,
        },
        ...theme.applyStyles("dark", {
          [`& .${ axisClasses.line }`]: { stroke: COLORS.lineDark },
          [`& .${ axisClasses.tick }`]: { stroke: COLORS.lineDark },
          [`& .${ axisClasses.tickLabel }`]: { fill: COLORS.steelDark, fontWeight: 500 },
        }),
      }),
    },
  },
  MuiChartsTooltip: {
    styleOverrides: {
      mark: ({ theme }) => ({
        ry: 3,
        boxShadow: "none",
        border: `1px solid ${ (theme.vars || theme).palette.divider }`,
      }),
      table: ({ theme }) => ({
        border: `1px solid ${ (theme.vars || theme).palette.divider }`,
        borderRadius: 4,
        background: COLORS.paper,
        ...theme.applyStyles("dark", { background: COLORS.paperDark }),
      }),
    },
  },
  MuiChartsLegend: {
    styleOverrides: {
      root: { [`& .${ legendClasses.mark }`]: { ry: 3 } },
    },
  },
  MuiChartsGrid: {
    styleOverrides: {
      root: ({ theme }) => ({
        [`& .${ chartsGridClasses.line }`]: {
          stroke: COLORS.line,
          strokeDasharray: "3 3",
          strokeWidth: 0.8,
        },
        ...theme.applyStyles("dark", {
          [`& .${ chartsGridClasses.line }`]: {
            stroke: COLORS.lineDark,
            strokeDasharray: "3 3",
            strokeWidth: 0.8,
          },
        }),
      }),
    },
  },
}
