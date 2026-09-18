/**
 * Справочники.
 *
 * Записи справочников не удаляются, а архивируются: на них ссылается журнал, и
 * удаление подразделения стёрло бы смысл прошлых операций.
 */

/** Подразделение: цех, лаборатория, метрология. За ним прибор числится. */
export interface Department {
  readonly id: string
  readonly name: string
  readonly code: string | null
  readonly isArchived: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

/**
 * Место хранения: шкаф, полка, участок.
 *
 * С подразделением не смешивается: подразделение — «Лаборатория», место —
 * «Шкаф №4». Место может не принадлежать никому (общий склад), поэтому
 * departmentId допускает NULL.
 */
export interface StorageLocation {
  readonly id: string
  readonly name: string
  readonly code: string | null
  readonly departmentId: string | null
  readonly note: string | null
  readonly isArchived: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

export interface Employee {
  readonly id: string
  readonly fullName: string
  readonly personnelNumber: string | null
  readonly departmentId: string | null
  readonly position: string | null
  readonly phone: string | null
  readonly isActive: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

/**
 * Тип прибора.
 *
 * `requiresVerification` решает, показывать ли блок «Метрология» в форме: у
 * отвёртки поверки нет, и спрашивать про свидетельство незачем.
 */
export interface InstrumentType {
  readonly id: string
  readonly name: string
  readonly requiresVerification: boolean
  readonly defaultVerificationIntervalMonths: number | null
  readonly isArchived: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

export type DepartmentDraft = Omit<Department, "id" | "createdAt" | "updatedAt" | "isArchived">
export type StorageLocationDraft = Omit<StorageLocation, "id" | "createdAt" | "updatedAt" | "isArchived">
export type EmployeeDraft = Omit<Employee, "id" | "createdAt" | "updatedAt" | "isActive">
export type InstrumentTypeDraft = Omit<InstrumentType, "id" | "createdAt" | "updatedAt" | "isArchived">

export interface EmployeeQuery {
  readonly text?: string
  readonly departmentId?: string
  readonly includeInactive?: boolean
}

/** Строка сводки по подразделению — для дашборда и отчёта о загрузке. */
export interface DepartmentSummary {
  readonly departmentId: string
  readonly name: string
  readonly total: number
  readonly available: number
  readonly checkedOut: number
  readonly inRepair: number
  readonly inVerification: number
}
