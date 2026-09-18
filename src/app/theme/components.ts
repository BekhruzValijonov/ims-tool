import type { Components, Theme } from "@mui/material/styles"
import { varAlpha } from "minimal-shared/utils"
import type {} from "@mui/x-data-grid/themeAugmentation"
import type {} from "@mui/x-date-pickers/themeAugmentation"
import { MONO, RADIUS, SIZE, TABULAR } from "./tokens"

/**
 * Что добавлено к дизайн-системе Minimal.
 *
 * Сама она переопределяет кнопки, карточки, поля, ссылки и ячейки таблицы —
 * это скопировано из dashboard-ui без изменений. Здесь только то, чего в ней
 * нет, потому что в том дашборде нет таких экранов: таблица DataGrid, поля
 * дат, пункт бокового меню и моноширинные ячейки с инвентарными номерами.
 */
export const appComponents: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      body: { WebkitFontSmoothing: "antialiased" },
      /* Коды и даты в колонках: цифры одной ширины выстраиваются друг под
         другом, и столбец читается взглядом, а не посимвольно. */
      ".data-mono": {
        fontFamily: MONO,
        fontSize: SIZE.caption,
        ...TABULAR,
      },
      "*:focus-visible": {
        outline: `2px solid ${ theme.vars.palette.primary.main }`,
        outlineOffset: 2,
      },
    }),
  },

  MuiPickersOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: varAlpha(theme.vars.palette.grey["500Channel"], 0.2),
        },
      }),
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      /* Пункт меню Minimal: мягкая заливка фирменным цветом у текущего
         раздела вместо подложки и планки. */
      root: ({ theme }) => ({
        borderRadius: 6,
        minHeight: 44,
        gap: 16,
        paddingInline: 16,
        color: theme.vars.palette.text.secondary,
        "&.Mui-selected": {
          color: theme.vars.palette.primary.main,
          backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
          "&:hover": {
            backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
          },
        },
      }),
    },
  },

  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600 },
      sizeSmall: { height: 24, fontSize: SIZE.caption },
    },
  },

  MuiDataGrid: {
    styleOverrides: {
      root: ({ theme }) => ({
        border: "none",
        fontSize: SIZE.caption,
        "--DataGrid-rowBorderColor": varAlpha(theme.vars.palette.grey["500Channel"], 0.16),
        "--DataGrid-overlayHeight": "240px",
        /* Шапка на нейтральной подложке — так таблицы устроены в Minimal. */
        "& .MuiDataGrid-columnHeaders": { border: "none" },
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: theme.vars.palette.background.neutral,
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: theme.typography.fontWeightSemiBold,
          fontSize: SIZE.caption,
          color: theme.vars.palette.text.secondary,
        },
        "& .MuiDataGrid-cell": { borderTop: "none" },
        "& .MuiDataGrid-columnSeparator": { display: "none" },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: varAlpha(theme.vars.palette.grey["500Channel"], 0.08),
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: `1px dashed ${ varAlpha(theme.vars.palette.grey["500Channel"], 0.2) }`,
          minHeight: 48,
        },
        "& .MuiTablePagination-root": { fontSize: SIZE.caption },
      }),
    },
  },
}
