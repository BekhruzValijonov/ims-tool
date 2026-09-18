import { RouterProvider } from "react-router-dom"
import { ThemeModeProvider } from "./app/ThemeMode"
import { AppProvider } from "./app/AppContext"
import { router } from "./app/router"

/**
 * Схема оформления включается выше загрузки данных: экран ожидания и
 * сообщение о недоступной базе тоже должны быть в теме приложения.
 */
export default function App() {
  return (
    <ThemeModeProvider>
      <AppProvider>
        <RouterProvider router={ router }/>
      </AppProvider>
    </ThemeModeProvider>
  )
}
