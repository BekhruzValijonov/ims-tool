import { RouterProvider } from "react-router-dom"
import { ThemeModeProvider } from "./app/ThemeMode"
import { AppProvider } from "./app/AppContext"
import { BrandingProvider } from "./features/branding/ui/BrandingProvider"
import { router } from "./app/router"

/**
 * Схема оформления включается выше загрузки данных: экран ожидания и
 * сообщение о недоступной базе тоже должны быть в теме приложения.
 *
 * Брендирование — ниже: оно хранится в самой базе, и до того, как та открыта,
 * его неоткуда взять. До первого чтения работают исходные токены.
 */
export default function App() {
  return (
    <ThemeModeProvider>
      <AppProvider>
        <BrandingProvider>
          <RouterProvider router={ router }/>
        </BrandingProvider>
      </AppProvider>
    </ThemeModeProvider>
  )
}
