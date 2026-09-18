import type { Instrument } from "../features/instruments/domain/types"
import type { Employee, InstrumentType, StorageLocation, Department } from "../features/directories/domain/types"

/**
 * Фабрики для тестов.
 *
 * Метки времени фиксированы: тест не должен зависеть от текущего момента,
 * иначе «просрочен» начнёт зависеть от того, когда запустили набор.
 */
export const T0 = Date.UTC(2026, 8, 1, 8, 0, 0)
export const NOW = Date.UTC(2026, 8, 18, 10, 0, 0)
export const DAY = 24 * 60 * 60 * 1000

export function makeInstrument(over: Partial<Instrument> = {}): Instrument {
  return {
    id: "inst-1",
    inventoryNumber: "PR-000123",
    name: "Манометр",
    typeId: "type-1",
    serialNumber: "SN123456",
    manufacturer: null,
    model: null,
    status: "AVAILABLE",
    ownerDepartmentId: "dep-1",
    baseLocationId: "loc-1",
    currentDepartmentId: "dep-1",
    currentLocationId: "loc-1",
    currentEmployeeId: null,
    responsibleEmployeeId: null,
    issuedAt: null,
    expectedReturnAt: null,
    nextVerificationAt: null,
    nextCalibrationAt: null,
    purchasedAt: null,
    priceMinor: null,
    currency: null,
    description: null,
    note: null,
    source: "manual",
    externalRef: null,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }
}

export function makeEmployee(over: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    fullName: "Иванов Иван Иванович",
    personnelNumber: "1024",
    departmentId: "dep-1",
    position: "Слесарь КИПиА",
    phone: null,
    isActive: true,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }
}

export function makeDepartment(over: Partial<Department> = {}): Department {
  return {
    id: "dep-1",
    name: "Цех №3",
    code: null,
    isArchived: false,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }
}

export function makeLocation(over: Partial<StorageLocation> = {}): StorageLocation {
  return {
    id: "loc-1",
    name: "Шкаф №4",
    code: null,
    departmentId: "dep-1",
    note: null,
    isArchived: false,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }
}

export function makeType(over: Partial<InstrumentType> = {}): InstrumentType {
  return {
    id: "type-1",
    name: "Манометр",
    requiresVerification: true,
    defaultVerificationIntervalMonths: 12,
    isArchived: false,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }
}
