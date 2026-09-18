import { createTheme as createMuiTheme, type Theme, type ThemeOptions } from "@mui/material/styles"
import { ruRU as coreRu } from "@mui/material/locale"
import { ruRU as dataGridRu } from "@mui/x-data-grid/locales"
import { palette } from "./minimal/core/palette"
import { shadows } from "./minimal/core/shadows"
import { customShadows } from "./minimal/core/custom-shadows"
import { components as minimalComponents } from "./minimal/core/components"
import { typography } from "./minimal/core/typography"
import { themeConfig } from "./minimal/theme-config"
import { appComponents } from "./components"
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

/**
 * Тема приложения.
 *
 * Дизайн-система целиком перенесена из проекта dashboard-ui (шаблон Minimal):
 * палитра, типографика, тени и переопределения компонентов лежат в
 * `theme/minimal` и скопированы как есть. Поверх добавлено только то, чего в
 * том дашборде нет: таблица DataGrid, поля дат, графики и русская локаль.
 */
export function createAppTheme(): Theme {
  return createMuiTheme(
    {
      colorSchemes: {
        light: {
          palette: palette.light,
          shadows: shadows.light,
          customShadows: customShadows.light,
        },
        dark: {
          palette: palette.dark,
          shadows: shadows.dark,
          customShadows: customShadows.dark,
        },
      },
      components: { ...minimalComponents, ...appComponents, ...chartsCustomizations },
      typography,
      shape: { borderRadius: 8 },
      cssVariables: themeConfig.cssVariables,
      defaultColorScheme: "light",
    } as ThemeOptions,
    coreRu,
    dataGridRu,
    dataGridRuPatch as ThemeOptions,
  )
}
