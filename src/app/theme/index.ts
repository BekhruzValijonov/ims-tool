import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles"
import { ruRU as coreRu } from "@mui/material/locale"
import { ruRU as dataGridRu } from "@mui/x-data-grid/locales"
import { BRAND, COLORS, RADIUS, SANS, SIZE, STATE, STATE_LIGHT } from "./tokens"
import { components } from "./components"
import { chartsCustomizations } from "./customizations/charts"

/**
 * Чего не хватает русской локали таблицы.
 *
 * В @mui/x-data-grid перевод paginationDisplayedRows закомментирован, поэтому
 * подвал говорит «1–8 of 8» посреди русского интерфейса. Подмешивается
 * последним — иначе его перекроет сама локаль.
 */
const dataGridRuPatch = {
  components: {
    MuiDataGrid: {
      defaultProps: {
        localeText: {
          paginationDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
            `${ from }–${ to } из ${ count === -1 ? `более чем ${ to }` : count }`,
        },
      },
    },
  },
}

/** Тени только у того, что действительно всплывает над страницей. */
const shadows = [
  "none",
  ...Array.from({ length: 7 }, () => "none"),
  "0 12px 32px rgba(0, 0, 0, 0.4)",
  ...Array.from({ length: 16 }, () => "0 24px 60px rgba(0, 0, 0, 0.5)"),
]

const typography = {
  fontFamily: SANS,
  h4: { fontSize: SIZE.page, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 },
  h5: { fontSize: SIZE.section, fontWeight: 500, lineHeight: 1.35 },
  h6: { fontSize: SIZE.body, fontWeight: 500, lineHeight: 1.45 },
  subtitle1: { fontSize: SIZE.body, fontWeight: 500, lineHeight: 1.45 },
  subtitle2: { fontSize: SIZE.small, fontWeight: 500, lineHeight: 1.45 },
  body1: { fontSize: SIZE.body, lineHeight: 1.55 },
  body2: { fontSize: SIZE.small, lineHeight: 1.55 },
  caption: { fontSize: SIZE.caption, lineHeight: 1.45 },
  button: { fontSize: SIZE.small, fontWeight: 500, textTransform: "none" as const },
}

function statusColors(state: typeof STATE | typeof STATE_LIGHT) {
  return {
    success: { main: state.ok, light: state.okSoft, contrastText: "#ffffff" },
    info: { main: state.work, light: state.workSoft, contrastText: "#ffffff" },
    warning: { main: state.wait, light: state.waitSoft, contrastText: "#ffffff" },
    error: { main: state.signal, light: state.signalSoft, contrastText: "#ffffff" },
  }
}

/**
 * Тема приложения.
 *
 * Облик admin-шаблона Corona: тёмный холст по умолчанию, панели с тонкой
 * границей, фирменный фиолетовый у действий. Светлая схема — не огрызок, а
 * равноправная альтернатива: заводской монитор под лампами дневного света
 * бывает удобнее читать по светлому.
 */
export function createAppTheme(): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
    defaultColorScheme: "dark",
    colorSchemes: {
      dark: {
        palette: {
          mode: "dark",
          background: { default: COLORS.canvasDark, paper: COLORS.surfaceDark },
          text: { primary: COLORS.textDark, secondary: COLORS.mutedDark, disabled: COLORS.mutedDark },
          divider: COLORS.borderDark,
          primary: { main: BRAND.main, contrastText: "#ffffff" },
          ...statusColors(STATE),
        },
      },
      light: {
        palette: {
          mode: "light",
          background: { default: COLORS.canvasLight, paper: COLORS.surfaceLight },
          text: { primary: COLORS.textLight, secondary: COLORS.mutedLight, disabled: COLORS.mutedLight },
          divider: COLORS.borderLight,
          primary: { main: BRAND.main, contrastText: "#ffffff" },
          ...statusColors(STATE_LIGHT),
        },
      },
    },
    shape: { borderRadius: RADIUS },
    shadows,
    typography,
    components: { ...components, ...chartsCustomizations },
  } as ThemeOptions, coreRu, dataGridRu, dataGridRuPatch as ThemeOptions)
}
