import type { ReactNode } from "react"
import DashboardIcon from "@mui/icons-material/Dashboard"
import StraightenIcon from "@mui/icons-material/Straighten"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import BadgeIcon from "@mui/icons-material/Badge"
import ApartmentIcon from "@mui/icons-material/Apartment"
import Inventory2Icon from "@mui/icons-material/Inventory2"
import CategoryIcon from "@mui/icons-material/Category"
import BarChartIcon from "@mui/icons-material/BarChart"
import SettingsIcon from "@mui/icons-material/Settings"
import { ROUTES } from "./routes"

export interface NavItem {
  readonly path: string
  readonly title: string
  readonly icon: ReactNode
}

export interface NavSection {
  readonly title: string | null
  readonly items: readonly NavItem[]
}

export const NAVIGATION: readonly NavSection[] = [
  {
    title: "Учёт",
    items: [
      { path: ROUTES.dashboard, title: "Дашборд", icon: <DashboardIcon/> },
      { path: ROUTES.instruments, title: "Приборы", icon: <StraightenIcon/> },
      { path: ROUTES.operations, title: "Операции", icon: <SwapHorizIcon/> },
    ],
  },
  {
    title: "Справочники",
    items: [
      { path: ROUTES.employees, title: "Сотрудники", icon: <BadgeIcon/> },
      { path: ROUTES.departments, title: "Подразделения", icon: <ApartmentIcon/> },
      { path: ROUTES.locations, title: "Места хранения", icon: <Inventory2Icon/> },
      { path: ROUTES.instrumentTypes, title: "Типы приборов", icon: <CategoryIcon/> },
    ],
  },
  {
    title: null,
    items: [
      { path: ROUTES.reports, title: "Отчёты", icon: <BarChartIcon/> },
      { path: ROUTES.settings, title: "Настройки", icon: <SettingsIcon/> },
    ],
  },
]

const ALL_ITEMS = NAVIGATION.flatMap((section) => section.items)

/**
 * Какой пункт меню отвечает за этот адрес.
 *
 * Берётся самое длинное совпадение по началу пути: карточка прибора
 * `/instruments/PR-1` должна подсвечивать «Приборы», а не «Дашборд», у
 * которого путь «/» подходит ко всему.
 */
export function activeItem(pathname: string): NavItem | null {
  let best: NavItem | null = null
  for (const item of ALL_ITEMS) {
    const matches = item.path === "/"
      ? pathname === "/"
      : pathname === item.path || pathname.startsWith(`${ item.path }/`)
    if (matches && (!best || item.path.length > best.path.length)) best = item
  }
  return best
}
