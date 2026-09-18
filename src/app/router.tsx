import { createHashRouter } from "react-router-dom"
import { AppShell } from "./AppShell"
import { DashboardPage } from "../pages/DashboardPage"

/**
 * Хеш-роутер, а не браузерный: в собранном Tauri приложение открывается по
 * своему протоколу, и обычная история переходов там ведёт себя непредсказуемо.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell/>,
    children: [
      { index: true, element: <DashboardPage/> },
    ],
  },
])
