import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles"
import { colorSchemes, shadows, shape, typography } from "./themePrimitives"
import { inputsCustomizations } from "./customizations/inputs"
import { dataDisplayCustomizations } from "./customizations/dataDisplay"
import { feedbackCustomizations } from "./customizations/feedback"
import { navigationCustomizations } from "./customizations/navigation"
import { surfacesCustomizations } from "./customizations/surfaces"
import { chartsCustomizations } from "./customizations/charts"
import { dataGridCustomizations } from "./customizations/dataGrid"
import { treeViewCustomizations } from "./customizations/treeView"

/**
 * Тема приложения.
 *
 * Это тема шаблона MUI Dashboard целиком, вместе с настройками чартов, таблицы
 * и дерева. Облик того дашборда дают именно они — градиентные заливки под
 * линиями, скруглённые столбцы, тонкие оси. Без этих файлов вышли бы обычные
 * чарты MUI: похожие, но не те.
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
      ...treeViewCustomizations,
    },
  } as ThemeOptions)
}
