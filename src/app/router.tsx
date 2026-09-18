import { createHashRouter, Navigate } from "react-router-dom"
import { AppShell } from "./AppShell"
import { DashboardPage } from "../pages/DashboardPage"
import { InstrumentsPage } from "../pages/InstrumentsPage"
import { InstrumentPage } from "../pages/InstrumentPage"
import { InstrumentFormPage } from "../pages/InstrumentFormPage"
import { OperationsPage } from "../pages/OperationsPage"
import { EmployeesPage } from "../pages/EmployeesPage"
import { EmployeePage } from "../pages/EmployeePage"
import { DepartmentsPage } from "../pages/DepartmentsPage"
import { LocationsPage } from "../pages/LocationsPage"
import { InstrumentTypesPage } from "../pages/InstrumentTypesPage"
import { ReportsPage } from "../pages/ReportsPage"
import { SettingsPage } from "../pages/SettingsPage"

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
      { path: "instruments", element: <InstrumentsPage/> },
      /* Заведение прибора переехало в окно на списке; прежний адрес ведёт
         туда же, чтобы сохранённые ссылки не ломались. Правило «раньше :id»
         остаётся: иначе «new» опознаётся как идентификатор прибора. */
      { path: "instruments/new", element: <Navigate to="/instruments?new=1" replace/> },
      { path: "instruments/:id", element: <InstrumentPage/> },
      { path: "instruments/:id/edit", element: <InstrumentFormPage/> },
      { path: "operations", element: <OperationsPage/> },
      { path: "employees", element: <EmployeesPage/> },
      { path: "employees/:id", element: <EmployeePage/> },
      { path: "departments", element: <DepartmentsPage/> },
      { path: "locations", element: <LocationsPage/> },
      { path: "instrument-types", element: <InstrumentTypesPage/> },
      { path: "reports", element: <ReportsPage/> },
      { path: "settings", element: <SettingsPage/> },
    ],
  },
])
