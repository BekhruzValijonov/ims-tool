import { useMemo } from "react"
import { useRepo } from "../../../app/AppContext"
import { useAsync } from "../../../shared/useAsync"
import type {
  Department,
  Employee,
  InstrumentType,
  StorageLocation,
} from "../domain/types"

export interface Directories {
  readonly departments: readonly Department[]
  readonly locations: readonly StorageLocation[]
  readonly employees: readonly Employee[]
  readonly types: readonly InstrumentType[]
  departmentName(id: string | null): string
  locationName(id: string | null): string
  employeeName(id: string | null): string
  typeName(id: string | null): string
  typeById(id: string | null): InstrumentType | null
  employeeById(id: string | null): Employee | null
}

const EMPTY = "—"

/**
 * Справочники целиком.
 *
 * Их немного — десятки записей, — а нужны они почти на каждом экране, чтобы
 * показать вместо идентификатора имя. Поэтому грузятся разом, а не запросом на
 * каждую строку таблицы.
 */
export function useDirectories() {
  const repo = useRepo()
  const state = useAsync(async () => {
    const [departments, locations, employees, types] = await Promise.all([
      repo.directories.departments(true),
      repo.directories.locations(true),
      repo.directories.employees({ includeInactive: true }),
      repo.directories.instrumentTypes(true),
    ])
    return { departments, locations, employees, types }
  }, [repo])

  const data = useMemo<Directories | null>(() => {
    if (!state.data) return null
    const { departments, locations, employees, types } = state.data
    const byId = <T extends { id: string }>(rows: readonly T[]) => new Map(rows.map((row) => [row.id, row]))
    const departmentMap = byId(departments)
    const locationMap = byId(locations)
    const employeeMap = byId(employees)
    const typeMap = byId(types)

    return {
      departments,
      locations,
      employees,
      types,
      departmentName: (id) => (id && departmentMap.get(id)?.name) || EMPTY,
      locationName: (id) => (id && locationMap.get(id)?.name) || EMPTY,
      employeeName: (id) => (id && employeeMap.get(id)?.fullName) || EMPTY,
      typeName: (id) => (id && typeMap.get(id)?.name) || EMPTY,
      typeById: (id) => (id ? typeMap.get(id) ?? null : null),
      employeeById: (id) => (id ? employeeMap.get(id) ?? null : null),
    }
  }, [state.data])

  return { ...state, data }
}
