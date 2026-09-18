import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles"
import { ruRU as coreRu } from "@mui/material/locale"
import { ruRU as dataGridRu } from "@mui/x-data-grid/locales"
import { COLORS, RADIUS, SANS, SIZE, STATE } from "./tokens"
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
  "0 8px 24px rgba(16, 24, 20, 0.14)",
  ...Array.from({ length: 15 }, () => "0 16px 40px rgba(16, 24, 20, 0.18)"),
  "0 16px 40px rgba(16, 24, 20, 0.18)",
]

const typography = {
  fontFamily: SANS,
  h4: { fontSize: SIZE.page, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 },
  h5: { fontSize: SIZE.section, fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.3 },
  h6: { fontSize: SIZE.body, fontWeight: 600, lineHeight: 1.4 },
  subtitle1: { fontSize: SIZE.body, fontWeight: 500, lineHeight: 1.45 },
  subtitle2: { fontSize: SIZE.small, fontWeight: 500, lineHeight: 1.45 },
  body1: { fontSize: SIZE.body, lineHeight: 1.55 },
  body2: { fontSize: SIZE.small, lineHeight: 1.5 },
  caption: { fontSize: SIZE.caption, lineHeight: 1.4 },
  button: { fontSize: SIZE.small, fontWeight: 500, textTransform: "none" as const },
}

const statusColors = {
  success: { main: STATE.ok, light: STATE.okSoft, contrastText: "#FFFFFF" },
  info: { main: STATE.work, light: STATE.workSoft, contrastText: "#FFFFFF" },
  warning: { main: STATE.wait, light: STATE.waitSoft, contrastText: "#FFFFFF" },
  error: { main: STATE.signal, light: STATE.signalSoft, contrastText: "#FFFFFF" },
}

/**
 * Тема приложения.
 *
 * Собрана своя, а не перенесена из шаблона: из шаблона MUI Dashboard взято
 * только оформление графиков — об этом и просили. Всё остальное подчинено
 * одному правилу: цвет означает состояние прибора, хром остаётся графитовым.
 */
export function createAppTheme(): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
    colorSchemes: {
      light: {
        palette: {
          mode: "light",
          background: { default: COLORS.panel, paper: COLORS.paper },
          text: { primary: COLORS.ink, secondary: COLORS.steel, disabled: COLORS.steel },
          divider: COLORS.line,
          primary: { main: COLORS.ink, contrastText: COLORS.paper },
          ...statusColors,
        },
      },
      dark: {
        palette: {
          mode: "dark",
          background: { default: COLORS.panelDark, paper: COLORS.paperDark },
          text: { primary: COLORS.inkDark, secondary: COLORS.steelDark, disabled: COLORS.steelDark },
          divider: COLORS.lineDark,
          primary: { main: COLORS.inkDark, contrastText: COLORS.panelDark },
          ...statusColors,
        },
      },
    },
    shape: { borderRadius: RADIUS },
    shadows,
    typography,
    components: { ...components, ...chartsCustomizations },
  } as ThemeOptions, coreRu, dataGridRu, dataGridRuPatch as ThemeOptions)
}
