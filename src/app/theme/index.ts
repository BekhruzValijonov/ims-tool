import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles"
import { ruRU as coreRu } from "@mui/material/locale"
import { ruRU as dataGridRu } from "@mui/x-data-grid/locales"

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
import { colorSchemes, shadows, shape, typography } from "./themePrimitives"
import { inputsCustomizations } from "./customizations/inputs"
import { dataDisplayCustomizations } from "./customizations/dataDisplay"
import { feedbackCustomizations } from "./customizations/feedback"
import { navigationCustomizations } from "./customizations/navigation"
import { surfacesCustomizations } from "./customizations/surfaces"
import { chartsCustomizations } from "./customizations/charts"
import { dataGridCustomizations } from "./customizations/dataGrid"
import { treeViewCustomizations } from "./customizations/treeView"
import { datePickersCustomizations } from "./customizations/datePickers"

/**
 * Тема приложения.
 *
 * Это тема шаблона MUI Dashboard целиком, вместе с настройками чартов, таблицы
 * и дерева. Облик того дашборда дают именно они — градиентные заливки под
 * линиями, скруглённые столбцы, тонкие оси. Без этих файлов вышли бы обычные
 * чарты MUI: похожие, но не те.
 *
 * Русские локали подмешиваются здесь же: без них подвал таблицы говорит
 * «Rows per page: 1–8 of 8» посреди русского интерфейса.
 */
export function createAppTheme(): Theme {
  return createTheme({
    cssVariables: {
      colorSchemeSelector: "data-mui-color-scheme",
      cssVarPrefix: "template",
    },
    colorSchemes,
    typography,
    shadows,
    shape,
    components: {
      ...inputsCustomizations,
      ...dataDisplayCustomizations,
      ...feedbackCustomizations,
      ...navigationCustomizations,
      ...surfacesCustomizations,
      ...chartsCustomizations,
      ...dataGridCustomizations,
      ...datePickersCustomizations,
      ...treeViewCustomizations,
    },
  } as ThemeOptions, coreRu, dataGridRu, dataGridRuPatch as ThemeOptions)
}
