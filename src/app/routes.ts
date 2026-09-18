/** Адреса экранов. Строки не разбредаются по компонентам. */
export const ROUTES = {
  dashboard: "/",
  instruments: "/instruments",
  instrument: (id: string) => `/instruments/${ id }`,
  operations: "/operations",
  employees: "/employees",
  employee: (id: string) => `/employees/${ id }`,
  departments: "/departments",
  locations: "/locations",
  instrumentTypes: "/instrument-types",
  reports: "/reports",
  settings: "/settings",
} as const
