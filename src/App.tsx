import { RouterProvider } from "react-router-dom"
import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider } from "@mui/material/styles"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { ruRU as pickersRu } from "@mui/x-date-pickers/locales"
import "dayjs/locale/ru"
import { AppProvider } from "./app/AppContext"
import { createAppTheme } from "./app/theme"
import { router } from "./app/router"

import "./App.css"

const theme = createAppTheme()

/**
 * Провайдеры стоят выше загрузки данных намеренно: экран ожидания и сообщение
 * о недоступной базе тоже должны быть оформлены темой приложения, а не
 * умолчаниями MUI.
 */
export default function App() {
  return (
    <ThemeProvider theme={ theme } defaultMode="dark" disableTransitionOnChange>
      <CssBaseline enableColorScheme/>
      <LocalizationProvider
        dateAdapter={ AdapterDayjs }
        adapterLocale="ru"
        localeText={ pickersRu.components.MuiLocalizationProvider.defaultProps.localeText }
      >
        <AppProvider>
          <RouterProvider router={ router }/>
        </AppProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
