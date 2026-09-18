import type { Theme } from "@mui/material/styles"
import { axisClasses, chartsGridClasses, legendClasses } from "@mui/x-charts"
import type { ChartsComponents } from "@mui/x-charts/themeAugmentation"
import { COLORS, RADIUS } from "../tokens"

/**
 * Оформление графиков.
 *
 * Механика взята из шаблона MUI Dashboard и оставлена как есть — тонкие оси
 * без засечек, пунктирная сетка, скруглённые метки, градиентные заливки.
 * Цвета подставлены свои: графики говорят тем же языком состояний, что и
 * остальной интерфейс.
 */
export const chartsCustomizations: ChartsComponents<Theme> = {
  MuiChartsAxis: {
    styleOverrides: {
      root: ({ theme }) => ({
        [`& .${ axisClasses.line }`]: { stroke: COLORS.borderLight },
        [`& .${ axisClasses.tick }`]: { stroke: COLORS.borderLight },
        [`& .${ axisClasses.tickLabel }`]: {
          fill: COLORS.mutedLight,
          fontWeight: 400,
          fontSize: 11,
        },
        ...theme.applyStyles("dark", {
          [`& .${ axisClasses.line }`]: { stroke: COLORS.borderDark },
          [`& .${ axisClasses.tick }`]: { stroke: COLORS.borderDark },
          [`& .${ axisClasses.tickLabel }`]: { fill: COLORS.mutedDark, fontWeight: 400 },
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
        borderRadius: RADIUS,
        background: COLORS.surfaceLight,
        ...theme.applyStyles("dark", { background: COLORS.raisedDark }),
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
          stroke: COLORS.borderLight,
          strokeDasharray: "3 3",
          strokeWidth: 0.8,
        },
        ...theme.applyStyles("dark", {
          [`& .${ chartsGridClasses.line }`]: {
            stroke: COLORS.borderDark,
            strokeDasharray: "3 3",
            strokeWidth: 0.8,
          },
        }),
      }),
    },
  },
}
