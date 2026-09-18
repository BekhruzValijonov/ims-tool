import type { ReactNode } from "react"
import {
  IconDashboard, IconInstrument, IconOperations, IconEmployees,
  IconDepartments, IconLocations, IconTypes, IconReports, IconSettings,
} from "../ui/icons"
import { ROUTES } from "./routes"

export interface NavItem {
  readonly path: string
  readonly title: string
  readonly icon: ReactNode
}

export interface NavSection {
  readonly title: string
  readonly items: readonly NavItem[]
}

export const NAVIGATION: readonly NavSection[] = [
  {
    title: "Учёт",
    items: [
      { path: ROUTES.dashboard, title: "Дашборд", icon: <IconDashboard size={ 22 }/> },
      { path: ROUTES.instruments, title: "Приборы", icon: <IconInstrument size={ 22 }/> },
      { path: ROUTES.operations, title: "Операции", icon: <IconOperations size={ 22 }/> },
    ],
  },
  {
    title: "Справочники",
    items: [
      { path: ROUTES.employees, title: "Сотрудники", icon: <IconEmployees size={ 22 }/> },
      { path: ROUTES.departments, title: "Подразделения", icon: <IconDepartments size={ 22 }/> },
      { path: ROUTES.locations, title: "Места хранения", icon: <IconLocations size={ 22 }/> },
      { path: ROUTES.instrumentTypes, title: "Типы приборов", icon: <IconTypes size={ 22 }/> },
    ],
  },
  {
    title: "Прочее",
    items: [
      { path: ROUTES.reports, title: "Отчёты", icon: <IconReports size={ 22 }/> },
      { path: ROUTES.settings, title: "Настройки", icon: <IconSettings size={ 22 }/> },
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
