import type { TourStep } from "../startTour"
import branding from "./branding"
import dashboard from "./dashboard"
import departments from "./departments"
import employee from "./employee"
import employees from "./employees"
import instrument from "./instrument"
import instrumentForm from "./instrumentForm"
import instrumentTypes from "./instrumentTypes"
import instruments from "./instruments"
import locations from "./locations"
import operations from "./operations"
import reports from "./reports"
import settings from "./settings"

/**
 * Реестр обходов: имя обхода — шаги того экрана.
 *
 * Имя попадает в разметку свойством `tour` у заголовка страницы. Тексты
 * русские, названия элементов интерфейса цитируются так, как написаны на
 * экране: подсказка, которая называет кнопку иначе, чем она подписана,
 * мешает сильнее, чем её отсутствие.
 */
export const TOURS = {
  dashboard,
  instruments,
  instrument,
  instrumentForm,
  operations,
  employees,
  employee,
  departments,
  locations,
  instrumentTypes,
  reports,
  branding,
  settings,
} as const satisfies Record<string, readonly TourStep[]>

export type TourId = keyof typeof TOURS
