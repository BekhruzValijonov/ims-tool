import type { Page } from "../shared/paging"
import type { Result } from "../shared/result"
import type {
  Instrument,
  InstrumentDraft,
  InstrumentPatch,
  InstrumentQuery,
} from "../features/instruments/domain/types"
import type {
  Department,
  DepartmentDraft,
  DepartmentSummary,
  Employee,
  EmployeeDraft,
  EmployeeQuery,
  InstrumentType,
  InstrumentTypeDraft,
  StorageLocation,
  StorageLocationDraft,
} from "../features/directories/domain/types"
import type {
  InstrumentEvent,
  JournalQuery,
  OperationCommand,
  OperationError,
} from "../features/operations/domain/types"
import type {
  NewVerificationRecord,
  VerificationRecord,
} from "../features/verification/domain/types"
import type { Counters, DailyFlow, StatusSlice } from "../features/dashboard/domain/types"

/** Какое хранилище обслуживает сессию. Показывается в настройках. */
export type StorageBackend = "sqlite" | "memory"

/** Отказ записи, который человеку нужно показать словами, а не как сбой. */
export type WriteError =
  | { readonly code: "DUPLICATE_INVENTORY_NUMBER"; readonly inventoryNumber: string }
  | { readonly code: "NAME_REQUIRED" }
  | { readonly code: "INVENTORY_NUMBER_REQUIRED" }
  | { readonly code: "NOT_FOUND"; readonly id: string }

export interface InstrumentRepo {
  list(query?: InstrumentQuery): Promise<Page<Instrument>>
  getById(id: string): Promise<Instrument | null>
  getByInventoryNumber(inventoryNumber: string): Promise<Instrument | null>
  /** Заводит прибор в статусе AVAILABLE и пишет в журнал событие CREATE. */
  create(draft: InstrumentDraft, operatorName: string): Promise<Result<Instrument, WriteError>>
  /** Правит паспорт. Статус и держателя не трогает — для этого есть операции. */
  update(id: string, patch: InstrumentPatch, operatorName: string): Promise<Result<Instrument, WriteError>>
}

export interface OperationOutcomeRecord {
  readonly instrument: Instrument
  readonly event: InstrumentEvent
  readonly verification: VerificationRecord | null
}

export interface OperationRepo {
  /**
   * Единственный путь изменения состояния прибора.
   *
   * Строка журнала и обновление прибора идут одной транзакцией: иначе
   * денормализованный статус разойдётся с историей.
   */
  execute(command: OperationCommand): Promise<Result<OperationOutcomeRecord, OperationError>>
  historyOf(instrumentId: string): Promise<readonly InstrumentEvent[]>
  journal(query?: JournalQuery): Promise<Page<InstrumentEvent>>
}

export interface DirectoryRepo {
  departments(includeArchived?: boolean): Promise<readonly Department[]>
  createDepartment(draft: DepartmentDraft): Promise<Department>
  updateDepartment(id: string, patch: Partial<DepartmentDraft>): Promise<Department>
  archiveDepartment(id: string, archived: boolean): Promise<void>

  locations(includeArchived?: boolean): Promise<readonly StorageLocation[]>
  createLocation(draft: StorageLocationDraft): Promise<StorageLocation>
  updateLocation(id: string, patch: Partial<StorageLocationDraft>): Promise<StorageLocation>
  archiveLocation(id: string, archived: boolean): Promise<void>

  employees(query?: EmployeeQuery): Promise<readonly Employee[]>
  createEmployee(draft: EmployeeDraft): Promise<Employee>
  updateEmployee(id: string, patch: Partial<EmployeeDraft>): Promise<Employee>
  setEmployeeActive(id: string, active: boolean): Promise<void>
  /** Что сейчас на руках у сотрудника. */
  instrumentsOf(employeeId: string): Promise<readonly Instrument[]>

  instrumentTypes(includeArchived?: boolean): Promise<readonly InstrumentType[]>
  createInstrumentType(draft: InstrumentTypeDraft): Promise<InstrumentType>
  updateInstrumentType(id: string, patch: Partial<InstrumentTypeDraft>): Promise<InstrumentType>
  archiveInstrumentType(id: string, archived: boolean): Promise<void>

  departmentSummary(): Promise<readonly DepartmentSummary[]>
}

export interface VerificationRepo {
  listFor(instrumentId: string): Promise<readonly VerificationRecord[]>
  /** Заносит свидетельство и пересчитывает срок в карточке прибора. */
  add(record: NewVerificationRecord): Promise<VerificationRecord>
  /** Приборы, у которых поверка истекает до указанного момента. */
  dueBefore(timestamp: number): Promise<readonly Instrument[]>
}

export interface DashboardRepo {
  /** `now` передаётся снаружи: просрочка не должна зависеть от часов внутри слоя данных. */
  counters(now: number): Promise<Counters>
  flow(from: number, to: number): Promise<readonly DailyFlow[]>
  recent(limit: number): Promise<readonly InstrumentEvent[]>
  statusBreakdown(): Promise<readonly StatusSlice[]>
}

export interface SettingsRepo {
  operatorName(): Promise<string | null>
  setOperatorName(name: string): Promise<void>
}

export interface AppRepo {
  readonly backend: StorageBackend
  readonly instruments: InstrumentRepo
  readonly operations: OperationRepo
  readonly directories: DirectoryRepo
  readonly verification: VerificationRepo
  readonly dashboard: DashboardRepo
  readonly settings: SettingsRepo
}
