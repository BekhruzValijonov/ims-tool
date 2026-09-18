import type { Components, Theme } from "@mui/material/styles"
import { alpha } from "@mui/material/styles"
import type {} from "@mui/x-data-grid/themeAugmentation"
import type {} from "@mui/x-date-pickers/themeAugmentation"
import { BADGE_RADIUS, BRAND, COLORS, MONO, RADIUS, SIZE, TABULAR } from "./tokens"

/**
 * Оформление компонентов.
 *
 * Геометрия Corona: панель с тонкой границей вместо тени, скругление 4,
 * приподнятая поверхность у полей ввода и наведения. Тень остаётся только у
 * того, что действительно всплывает над страницей, — у диалогов и меню.
 */
export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      body: {
        backgroundColor: (theme.vars || theme).palette.background.default,
        WebkitFontSmoothing: "antialiased",
      },
      /* Коды и даты в колонках: цифры одной ширины выстраиваются друг под
         другом, и столбец читается взглядом, а не посимвольно. */
      ".data-mono": {
        fontFamily: MONO,
        fontSize: SIZE.small,
        ...TABULAR,
      },
      "*:focus-visible": {
        outline: `2px solid ${ BRAND.main }`,
        outlineOffset: 2,
      },
      "::selection": { backgroundColor: BRAND.soft },
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
    styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } },
  },

  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: RADIUS,
        textTransform: "none",
        fontWeight: 500,
        paddingInline: 14,
      },
    },
    variants: [
      {
        // Фиолетовый Corona закреплён за действием и нигде больше не появляется.
        props: { variant: "contained", color: "primary" },
        style: {
          backgroundColor: BRAND.main,
          color: "#ffffff",
          "&:hover": { backgroundColor: BRAND.hover },
        },
      },
      {
        props: { variant: "outlined" },
        style: ({ theme }) => ({
          borderColor: (theme.vars || theme).palette.divider,
          color: (theme.vars || theme).palette.text.primary,
          "&:hover": {
            borderColor: BRAND.main,
            backgroundColor: BRAND.soft,
          },
        }),
      },
      {
        props: { variant: "text" },
        style: { "&:hover": { backgroundColor: BRAND.soft } },
      },
    ],
  },

  MuiLink: {
    defaultProps: { underline: "hover" },
    styleOverrides: {
      root: ({ theme }) => ({
        color: "inherit",
        textDecorationColor: (theme.vars || theme).palette.text.secondary,
        textUnderlineOffset: 3,
        fontWeight: 500,
        cursor: "pointer",
        "&:hover": { color: BRAND.main, textDecorationColor: BRAND.main },
      }),
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        backgroundColor: COLORS.raisedDark,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: (theme.vars || theme).palette.divider,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: (theme.vars || theme).palette.text.secondary,
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderWidth: 1,
          borderColor: BRAND.main,
        },
        ...theme.applyStyles("light", { backgroundColor: COLORS.raisedLight }),
      }),
    },
  },

  MuiPickersOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        backgroundColor: COLORS.raisedDark,
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: (theme.vars || theme).palette.divider,
        },
        ...theme.applyStyles("light", { backgroundColor: COLORS.raisedLight }),
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
      paper: { borderRadius: RADIUS, boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)" },
    },
  },

  MuiMenu: {
    styleOverrides: { paper: { boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)" } },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: COLORS.raisedDark,
        color: COLORS.textDark,
        border: `1px solid ${ (theme.vars || theme).palette.divider }`,
        fontSize: SIZE.caption,
        borderRadius: RADIUS,
        ...theme.applyStyles("light", {
          backgroundColor: COLORS.textLight,
          color: COLORS.surfaceLight,
        }),
      }),
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: RADIUS,
        paddingBlock: 9,
        gap: 12,
        "&:hover": { backgroundColor: COLORS.raisedDark },
        /* Текущий раздел: подложка и планка слева, как в Corona. Работает и
           при выключенном цвете — форма отличается, а не только оттенок. */
        "&.Mui-selected": {
          backgroundColor: COLORS.raisedDark,
          boxShadow: `inset 3px 0 0 ${ BRAND.main }`,
          "&:hover": { backgroundColor: COLORS.raisedDark },
        },
        ...theme.applyStyles("light", {
          "&:hover": { backgroundColor: COLORS.raisedLight },
          "&.Mui-selected": {
            backgroundColor: BRAND.soft,
            boxShadow: `inset 3px 0 0 ${ BRAND.main }`,
            "&:hover": { backgroundColor: BRAND.soft },
          },
        }),
      }),
    },
  },

  MuiAlert: {
    styleOverrides: { root: { borderRadius: RADIUS, fontSize: SIZE.small } },
  },

  MuiAvatar: {
    styleOverrides: { rounded: { borderRadius: BADGE_RADIUS } },
  },

  MuiDataGrid: {
    styleOverrides: {
      root: ({ theme }) => ({
        border: "none",
        fontSize: SIZE.small,
        "--DataGrid-rowBorderColor": (theme.vars || theme).palette.divider,
        "--DataGrid-overlayHeight": "232px",
        "& .MuiDataGrid-columnHeaders": {
          borderBottom: `1px solid ${ (theme.vars || theme).palette.divider }`,
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 500,
          fontSize: SIZE.caption,
          color: (theme.vars || theme).palette.text.secondary,
        },
        "& .MuiDataGrid-cell": { borderTop: "none" },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: alpha(BRAND.main, 0.07),
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: `1px solid ${ (theme.vars || theme).palette.divider }`,
          minHeight: 46,
        },
        "& .MuiTablePagination-root": { fontSize: SIZE.caption },
      }),
    },
  },
}
