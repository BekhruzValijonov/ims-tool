import type { Components, Theme } from "@mui/material/styles"
import { alpha } from "@mui/material/styles"
import type {} from "@mui/x-data-grid/themeAugmentation"
import type {} from "@mui/x-date-pickers/themeAugmentation"
import { MONO, RADIUS, SIZE, TABULAR } from "./tokens"

/**
 * Оформление компонентов.
 *
 * Общее правило: разделяем линиями и воздухом, а не тенями и карточками.
 * Тень остаётся только у того, что действительно всплывает над страницей —
 * у диалогов и меню. Скругление одно на всё и небольшое: инженерно, а не
 * «дружелюбно».
 */
export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      body: {
        backgroundColor: (theme.vars || theme).palette.background.default,
        WebkitFontSmoothing: "antialiased",
      },
      /* Цифры в колонках обязаны быть одной ширины — иначе столбец
         инвентарных номеров приходится читать посимвольно. */
      ".data-mono": {
        fontFamily: MONO,
        fontSize: SIZE.small,
        ...TABULAR,
      },
      "*:focus-visible": {
        outline: `2px solid ${ (theme.vars || theme).palette.text.primary }`,
        outlineOffset: 2,
      },
    }),
  },

  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: "none",
        borderRadius: RADIUS,
        border: `1px solid ${ (theme.vars || theme).palette.divider }`,
      }),
    },
  },

  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        boxShadow: "none",
        border: `1px solid ${ (theme.vars || theme).palette.divider }`,
        borderRadius: RADIUS,
      }),
    },
  },

  MuiCardContent: {
    styleOverrides: {
      root: { padding: 16, "&:last-child": { paddingBottom: 16 } },
    },
  },

  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: RADIUS,
        textTransform: "none",
        fontWeight: 500,
        paddingInline: 12,
      },
    },
    variants: [
      {
        /* Главное действие — графитовое, а не синее: синий на этом экране
           означает «выдан», и кнопка не должна спорить со статусом. */
        props: { variant: "contained", color: "primary" },
        style: ({ theme }) => ({
          backgroundColor: (theme.vars || theme).palette.text.primary,
          color: (theme.vars || theme).palette.background.paper,
          "&:hover": { backgroundColor: alpha(theme.palette.text.primary, 0.85) },
        }),
      },
      {
        props: { variant: "outlined" },
        style: ({ theme }) => ({
          borderColor: (theme.vars || theme).palette.divider,
          color: (theme.vars || theme).palette.text.primary,
          "&:hover": {
            borderColor: (theme.vars || theme).palette.text.secondary,
            backgroundColor: alpha(theme.palette.text.primary, 0.04),
          },
        }),
      },
    ],
  },

  MuiLink: {
    defaultProps: { underline: "hover" },
    styleOverrides: {
      /* Ссылка опознаётся подчёркиванием, а не цветом: цвет здесь занят
         состояниями приборов. */
      root: ({ theme }) => ({
        color: "inherit",
        textDecorationColor: (theme.vars || theme).palette.text.secondary,
        textUnderlineOffset: 3,
        fontWeight: 500,
        cursor: "pointer",
        "&:hover": { textDecorationColor: (theme.vars || theme).palette.text.primary },
      }),
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        backgroundColor: (theme.vars || theme).palette.background.paper,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: (theme.vars || theme).palette.divider,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: (theme.vars || theme).palette.text.secondary,
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderWidth: 1,
          borderColor: (theme.vars || theme).palette.text.primary,
        },
      }),
    },
  },

  MuiPickersOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: (theme.vars || theme).palette.divider,
        },
      }),
    },
  },

  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 3, fontWeight: 500 },
      sizeSmall: { height: 22, fontSize: SIZE.caption },
    },
  },

  MuiDivider: {
    styleOverrides: {
      root: ({ theme }) => ({ borderColor: (theme.vars || theme).palette.divider }),
    },
  },

  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: RADIUS,
        // Всплывающее над страницей — единственное, чему тень положена.
        boxShadow: `0 16px 40px ${ alpha(theme.palette.common.black, 0.18) }`,
      }),
    },
  },

  MuiMenu: {
    styleOverrides: {
      paper: ({ theme }) => ({
        boxShadow: `0 8px 24px ${ alpha(theme.palette.common.black, 0.14) }`,
      }),
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: (theme.vars || theme).palette.text.primary,
        fontSize: SIZE.caption,
        borderRadius: RADIUS,
      }),
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        paddingBlock: 6,
        /* Текущий раздел отмечен вертикальной планкой, как указатель на
           панели прибора: работает и при выключенном цвете. */
        "&.Mui-selected": {
          backgroundColor: alpha(theme.palette.text.primary, 0.06),
          boxShadow: `inset 3px 0 0 ${ (theme.vars || theme).palette.text.primary }`,
          "&:hover": { backgroundColor: alpha(theme.palette.text.primary, 0.09) },
        },
      }),
    },
  },

  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: RADIUS, fontSize: SIZE.small },
    },
  },

  MuiDataGrid: {
    styleOverrides: {
      root: ({ theme }) => ({
        border: "none",
        fontSize: SIZE.small,
        "--DataGrid-rowBorderColor": (theme.vars || theme).palette.divider,
        "--DataGrid-overlayHeight": "232px",
        "& .MuiDataGrid-columnHeaders": {
          borderBottom: `1px solid ${ (theme.vars || theme).palette.text.primary }`,
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 500,
          fontSize: SIZE.caption,
          color: (theme.vars || theme).palette.text.secondary,
        },
        "& .MuiDataGrid-cell": { borderTop: "none" },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: alpha(theme.palette.text.primary, 0.035),
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: `1px solid ${ (theme.vars || theme).palette.divider }`,
          minHeight: 44,
        },
        "& .MuiTablePagination-root": { fontSize: SIZE.caption },
      }),
    },
  },
}
