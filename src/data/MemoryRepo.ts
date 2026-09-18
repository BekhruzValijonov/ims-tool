import { DEFAULT_PAGE_SIZE, type Page } from "../shared/paging"
import { err, ok, type Result } from "../shared/result"
import { localDateRange, toLocalDate } from "../shared/dates"
import { applyOperation } from "../features/operations/domain/transitions"
import type {
  Instrument,
  InstrumentDraft,
  InstrumentPatch,
  InstrumentQuery,
  InstrumentStatus,
} from "../features/instruments/domain/types"
import { INSTRUMENT_STATUSES } from "../features/instruments/domain/types"
import type {
  Department,
  DepartmentSummary,
  Employee,
  EmployeeQuery,
  InstrumentType,
  StorageLocation,
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
import { buildStatusHistory } from "../features/dashboard/domain/history"
import type {
  AppRepo,
  DashboardRepo,
  DirectoryRepo,
  InstrumentRepo,
  OperationOutcomeRecord,
  OperationRepo,
  SettingsRepo,
  StorageBackend,
  VerificationRepo,
  WriteError,
} from "./AppRepo"
import { generateId } from "./uuid"
import { OPERATOR_NAME_KEY, VERIFICATION_HORIZON_MS } from "./settingsKeys"

/**
 * Реализация порта в памяти.
 *
 * Нужна дважды: для браузерного дев-сервера, где нет Tauri и нечем открыть
 * SQLite, и для тестов. Требования к ней те же, что к SqliteRepo, и проверяются
 * они одним набором (repoContract.ts) — иначе реализации разъедутся, и ошибка
 * вылезет только на устройстве, где её дороже всего ловить.
 */
export class MemoryRepo implements AppRepo {
  readonly backend: StorageBackend = "memory"

  private instrumentRows: Instrument[] = []
  private eventRows: InstrumentEvent[] = []
  private verificationRows: VerificationRecord[] = []
  private departmentRows: Department[] = []
  private locationRows: StorageLocation[] = []
  private employeeRows: Employee[] = []
  private typeRows: InstrumentType[] = []
  private settingsMap = new Map<string, string>()

  /** Часы внедряются снаружи: тест не должен зависеть от текущего момента. */
  constructor(private readonly clock: () => number = Date.now) {}

  readonly instruments: InstrumentRepo = {
    list: async (query = {}) => this.listInstruments(query),
    getById: async (id) => this.instrumentRows.find((row) => row.id === id) ?? null,
    getByInventoryNumber: async (inventoryNumber) =>
      this.instrumentRows.find((row) => row.inventoryNumber === inventoryNumber) ?? null,
    create: async (draft, operatorName) => this.createInstrument(draft, operatorName),
    update: async (id, patch, operatorName) => this.updateInstrument(id, patch, operatorName),
  }

  readonly operations: OperationRepo = {
    execute: async (command) => this.execute(command),
    historyOf: async (instrumentId) =>
      this.eventRows
        .filter((row) => row.instrumentId === instrumentId)
        .sort((a, b) => b.occurredAt - a.occurredAt),
    journal: async (query = {}) => this.listJournal(query),
  }

  readonly directories: DirectoryRepo = {
    departments: async (includeArchived = false) =>
      this.departmentRows
        .filter((row) => includeArchived || !row.isArchived)
        .sort(byName),
    createDepartment: async (draft) => {
      const row: Department = { ...draft, id: generateId(), isArchived: false, ...this.stamps() }
      this.departmentRows.push(row)
      return row
    },
    updateDepartment: async (id, patch) => this.patchRow(this.departmentRows, id, patch),
    archiveDepartment: async (id, archived) => {
      this.patchRow(this.departmentRows, id, { isArchived: archived } as Partial<Department>)
    },

    locations: async (includeArchived = false) =>
      this.locationRows.filter((row) => includeArchived || !row.isArchived).sort(byName),
    createLocation: async (draft) => {
      const row: StorageLocation = { ...draft, id: generateId(), isArchived: false, ...this.stamps() }
      this.locationRows.push(row)
      return row
    },
    updateLocation: async (id, patch) => this.patchRow(this.locationRows, id, patch),
    archiveLocation: async (id, archived) => {
      this.patchRow(this.locationRows, id, { isArchived: archived } as Partial<StorageLocation>)
    },

    employees: async (query = {}) => this.listEmployees(query),
    createEmployee: async (draft) => {
      const row: Employee = { ...draft, id: generateId(), isActive: true, ...this.stamps() }
      this.employeeRows.push(row)
      return row
    },
    updateEmployee: async (id, patch) => this.patchRow(this.employeeRows, id, patch),
    setEmployeeActive: async (id, active) => {
      this.patchRow(this.employeeRows, id, { isActive: active } as Partial<Employee>)
    },
    instrumentsOf: async (employeeId) =>
      this.instrumentRows
        .filter((row) => row.currentEmployeeId === employeeId)
        .sort((a, b) => (a.issuedAt ?? 0) - (b.issuedAt ?? 0)),

    instrumentTypes: async (includeArchived = false) =>
      this.typeRows.filter((row) => includeArchived || !row.isArchived).sort(byName),
    createInstrumentType: async (draft) => {
      const row: InstrumentType = { ...draft, id: generateId(), isArchived: false, ...this.stamps() }
      this.typeRows.push(row)
      return row
    },
    updateInstrumentType: async (id, patch) => this.patchRow(this.typeRows, id, patch),
    archiveInstrumentType: async (id, archived) => {
      this.patchRow(this.typeRows, id, { isArchived: archived } as Partial<InstrumentType>)
    },

    departmentSummary: async () => this.departmentSummary(),
    locationSummary: async () => this.locationRows
      .filter((location) => !location.isArchived)
      .map((location) => ({
        locationId: location.id,
        name: location.name,
        departmentId: location.departmentId,
        total: this.instrumentRows.filter(
          (row) => row.currentLocationId === location.id && row.status !== "WRITTEN_OFF").length,
      }))
      .sort(byName),
  }

  readonly verification: VerificationRepo = {
    listFor: async (instrumentId) =>
      this.verificationRows
        .filter((row) => row.instrumentId === instrumentId)
        .sort((a, b) => b.performedAt - a.performedAt),
    add: async (record) => this.addVerification(record),
    dueBefore: async (timestamp) =>
      this.instrumentRows
        .filter((row) => row.status !== "WRITTEN_OFF")
        .filter((row) => row.nextVerificationAt !== null && row.nextVerificationAt <= timestamp)
        .sort((a, b) => (a.nextVerificationAt ?? 0) - (b.nextVerificationAt ?? 0)),
  }

  readonly dashboard: DashboardRepo = {
    counters: async (now) => this.counters(now),
    flow: async (from, to) => this.flow(from, to),
    statusHistory: async (from, to) => buildStatusHistory(
      this.instrumentRows.map((row) => ({ id: row.id, status: row.status })),
      /* Верхней границы нет намеренно: состояние отматывается от нынешнего, и
         события после запрошенного окна тоже нужно отмотать. */
      this.eventRows.filter((row) => row.occurredAt >= from),
      from,
      to,
    ),
    recent: async (limit) =>
      [...this.eventRows].sort((a, b) => b.occurredAt - a.occurredAt).slice(0, limit),
    statusBreakdown: async () => this.statusBreakdown(),
  }

  readonly settings: SettingsRepo = {
    operatorName: async () => this.settingsMap.get(OPERATOR_NAME_KEY) ?? null,
    setOperatorName: async (name) => {
      this.settingsMap.set(OPERATOR_NAME_KEY, name.trim())
    },
  }

  // ——— внутреннее ———

  private stamps() {
    const now = this.clock()
    return { createdAt: now, updatedAt: now }
  }

  private patchRow<T extends { id: string; updatedAt: number }>(
    rows: T[],
    id: string,
    patch: Partial<NoInfer<T>>,
  ): T {
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) throw new Error(`запись ${ id } не найдена`)
    const updated = { ...rows[index], ...patch, updatedAt: this.clock() }
    rows[index] = updated
    return updated
  }

  private listInstruments(query: InstrumentQuery): Page<Instrument> {
    const filtered = this.instrumentRows.filter((row) => matchesInstrument(row, query, this.clock()))
    const sorted = sortInstruments(filtered, query)
    return paginate(sorted, query.page, query.pageSize)
  }

  private listEmployees(query: EmployeeQuery): Employee[] {
    const text = query.text?.trim().toLowerCase()
    return this.employeeRows
      .filter((row) => query.includeInactive || row.isActive)
      .filter((row) => !query.departmentId || row.departmentId === query.departmentId)
      .filter((row) => !text || row.fullName.toLowerCase().includes(text) ||
        (row.personnelNumber ?? "").toLowerCase().includes(text))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"))
  }

  private async createInstrument(
    draft: InstrumentDraft,
    operatorName: string,
  ): Promise<Result<Instrument, WriteError>> {
    const inventoryNumber = draft.inventoryNumber.trim()
    if (inventoryNumber === "") return err({ code: "INVENTORY_NUMBER_REQUIRED" })
    if (draft.name.trim() === "") return err({ code: "NAME_REQUIRED" })
    if (this.instrumentRows.some((row) => row.inventoryNumber === inventoryNumber)) {
      return err({ code: "DUPLICATE_INVENTORY_NUMBER", inventoryNumber })
    }

    const now = this.clock()
    const instrument: Instrument = {
      id: generateId(),
      inventoryNumber,
      name: draft.name.trim(),
      typeId: draft.typeId,
      serialNumber: draft.serialNumber ?? null,
      manufacturer: draft.manufacturer ?? null,
      model: draft.model ?? null,
      status: "AVAILABLE",
      ownerDepartmentId: draft.ownerDepartmentId,
      baseLocationId: draft.baseLocationId,
      currentDepartmentId: draft.ownerDepartmentId,
      currentLocationId: draft.baseLocationId,
      currentEmployeeId: null,
      responsibleEmployeeId: draft.responsibleEmployeeId ?? null,
      issuedAt: null,
      expectedReturnAt: null,
      nextVerificationAt: null,
      nextCalibrationAt: null,
      purchasedAt: draft.purchasedAt ?? null,
      priceMinor: draft.priceMinor ?? null,
      currency: draft.currency ?? null,
      description: draft.description ?? null,
      note: draft.note ?? null,
      source: draft.source ?? "manual",
      externalRef: draft.externalRef ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.instrumentRows.push(instrument)
    this.eventRows.push({
      id: generateId(),
      instrumentId: instrument.id,
      kind: "CREATE",
      occurredAt: now,
      statusBefore: null,
      statusAfter: "AVAILABLE",
      employeeId: null,
      fromLocationId: null,
      toLocationId: instrument.baseLocationId,
      fromDepartmentId: null,
      toDepartmentId: instrument.ownerDepartmentId,
      expectedReturnAt: null,
      condition: null,
      reason: null,
      note: null,
      operatorName,
      payload: null,
    })
    return ok(instrument)
  }

  private async updateInstrument(
    id: string,
    patch: InstrumentPatch,
    operatorName: string,
  ): Promise<Result<Instrument, WriteError>> {
    const current = this.instrumentRows.find((row) => row.id === id)
    if (!current) return err({ code: "NOT_FOUND", id })

    if (patch.inventoryNumber !== undefined) {
      const inventoryNumber = patch.inventoryNumber.trim()
      if (inventoryNumber === "") return err({ code: "INVENTORY_NUMBER_REQUIRED" })
      if (this.instrumentRows.some((row) => row.id !== id && row.inventoryNumber === inventoryNumber)) {
        return err({ code: "DUPLICATE_INVENTORY_NUMBER", inventoryNumber })
      }
    }
    if (patch.name !== undefined && patch.name.trim() === "") return err({ code: "NAME_REQUIRED" })

    const now = this.clock()
    const next: Instrument = { ...current, ...stripUndefined(patch), updatedAt: now }
    this.instrumentRows = this.instrumentRows.map((row) => (row.id === id ? next : row))

    const changed = diffFields(current, next)
    if (Object.keys(changed).length > 0) {
      this.eventRows.push({
        id: generateId(),
        instrumentId: id,
        kind: "EDIT",
        occurredAt: now,
        statusBefore: current.status,
        statusAfter: next.status,
        employeeId: null,
        fromLocationId: current.currentLocationId,
        toLocationId: next.currentLocationId,
        fromDepartmentId: current.currentDepartmentId,
        toDepartmentId: next.currentDepartmentId,
        expectedReturnAt: null,
        condition: null,
        reason: null,
        note: null,
        operatorName,
        payload: changed,
      })
    }
    return ok(next)
  }

  private async execute(command: OperationCommand): Promise<Result<OperationOutcomeRecord, OperationError>> {
    const instrument = this.instrumentRows.find((row) => row.id === command.instrumentId)
    if (!instrument) return err({ code: "INSTRUMENT_NOT_FOUND", instrumentId: command.instrumentId })

    if (command.kind === "CHECK_OUT") {
      const employee = this.employeeRows.find((row) => row.id === command.employeeId)
      if (!employee) return err({ code: "EMPLOYEE_NOT_FOUND", employeeId: command.employeeId })
      if (!employee.isActive) return err({ code: "EMPLOYEE_INACTIVE", employeeId: command.employeeId })
    }

    const outcome = applyOperation(instrument, command, this.clock())
    if (!outcome.ok) return outcome

    const { next, event, verification } = outcome.value
    this.instrumentRows = this.instrumentRows.map((row) => (row.id === next.id ? next : row))
    const storedEvent: InstrumentEvent = { ...event, id: generateId() }
    this.eventRows.push(storedEvent)

    let storedVerification: VerificationRecord | null = null
    if (verification) {
      storedVerification = { ...verification, id: generateId(), createdAt: this.clock() }
      this.verificationRows.push(storedVerification)
    }

    return ok({ instrument: next, event: storedEvent, verification: storedVerification })
  }

  private listJournal(query: JournalQuery): Page<InstrumentEvent> {
    const filtered = this.eventRows
      .filter((row) => !query.kinds || query.kinds.includes(row.kind))
      .filter((row) => !query.instrumentId || row.instrumentId === query.instrumentId)
      .filter((row) => !query.employeeId || row.employeeId === query.employeeId)
      .filter((row) =>
        !query.departmentId ||
        row.toDepartmentId === query.departmentId ||
        row.fromDepartmentId === query.departmentId)
      .filter((row) => query.from === undefined || row.occurredAt >= query.from)
      .filter((row) => query.to === undefined || row.occurredAt <= query.to)
      .sort((a, b) => b.occurredAt - a.occurredAt)
    return paginate(filtered, query.page, query.pageSize)
  }

  private async addVerification(record: NewVerificationRecord): Promise<VerificationRecord> {
    const stored: VerificationRecord = { ...record, id: generateId(), createdAt: this.clock() }
    this.verificationRows.push(stored)

    const instrument = this.instrumentRows.find((row) => row.id === record.instrumentId)
    if (instrument && record.result === "PASS") {
      const field = record.kind === "CALIBRATION" ? "nextCalibrationAt" : "nextVerificationAt"
      this.instrumentRows = this.instrumentRows.map((row) =>
        row.id === instrument.id ? { ...row, [field]: record.validUntil, updatedAt: this.clock() } : row)
    }
    return stored
  }

  private counters(now: number): Counters {
    const live = this.instrumentRows.filter((row) => row.status !== "WRITTEN_OFF")
    const countBy = (status: InstrumentStatus) => live.filter((row) => row.status === status).length
    return {
      total: live.length,
      available: countBy("AVAILABLE"),
      checkedOut: countBy("CHECKED_OUT"),
      inRepair: countBy("IN_REPAIR"),
      overdue: live.filter((row) =>
        row.status === "CHECKED_OUT" && row.expectedReturnAt !== null && row.expectedReturnAt < now).length,
      verificationDue: live.filter((row) =>
        row.nextVerificationAt !== null && row.nextVerificationAt <= now + VERIFICATION_HORIZON_MS).length,
      writtenOff: this.instrumentRows.filter((row) => row.status === "WRITTEN_OFF").length,
    }
  }

  private flow(from: number, to: number): DailyFlow[] {
    const buckets = new Map<string, { checkedOut: number; returned: number }>()
    for (const date of localDateRange(from, to)) buckets.set(date, { checkedOut: 0, returned: 0 })

    for (const event of this.eventRows) {
      if (event.occurredAt < from || event.occurredAt > to) continue
      const bucket = buckets.get(toLocalDate(event.occurredAt))
      if (!bucket) continue
      if (event.kind === "CHECK_OUT") bucket.checkedOut += 1
      if (event.kind === "RETURN") bucket.returned += 1
    }

    return [...buckets.entries()].map(([date, value]) => ({ date, ...value }))
  }

  private statusBreakdown(): StatusSlice[] {
    return INSTRUMENT_STATUSES.map((status) => ({
      status,
      count: this.instrumentRows.filter((row) => row.status === status).length,
    })).filter((slice) => slice.count > 0)
  }

  private departmentSummary(): DepartmentSummary[] {
    return this.departmentRows
      .filter((department) => !department.isArchived)
      .map((department) => {
        const own = this.instrumentRows.filter(
          (row) => row.ownerDepartmentId === department.id && row.status !== "WRITTEN_OFF")
        const countBy = (status: InstrumentStatus) => own.filter((row) => row.status === status).length
        return {
          departmentId: department.id,
          name: department.name,
          total: own.length,
          available: countBy("AVAILABLE"),
          checkedOut: countBy("CHECKED_OUT"),
          inRepair: countBy("IN_REPAIR"),
          inVerification: countBy("IN_VERIFICATION"),
        }
      })
      .sort(byName)
  }
}

// ——— общие помощники выборки ———

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "ru")
}

function stripUndefined<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>
}

/** Что именно поменялось в карточке — для payload события EDIT. */
function diffFields(before: Instrument, after: Instrument): Record<string, unknown> {
  const changed: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof Instrument)[]) {
    if (key === "updatedAt") continue
    if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] }
  }
  return changed
}

export function matchesInstrument(row: Instrument, query: InstrumentQuery, now: number): boolean {
  const text = query.text?.trim().toLowerCase()
  if (text) {
    const haystack = [row.name, row.inventoryNumber, row.serialNumber ?? ""].join(" ").toLowerCase()
    if (!haystack.includes(text)) return false
  }
  if (query.statuses && query.statuses.length > 0 && !query.statuses.includes(row.status)) return false
  if (query.typeId && row.typeId !== query.typeId) return false
  if (query.departmentId && row.currentDepartmentId !== query.departmentId) return false
  if (query.locationId && row.currentLocationId !== query.locationId) return false
  if (query.employeeId && row.currentEmployeeId !== query.employeeId) return false
  if (query.createdFrom !== undefined && row.createdAt < query.createdFrom) return false
  if (query.createdTo !== undefined && row.createdAt > query.createdTo) return false
  if (query.overdueOnly) {
    if (row.status !== "CHECKED_OUT") return false
    if (row.expectedReturnAt === null || row.expectedReturnAt >= now) return false
  }
  if (query.verificationDueBefore !== undefined) {
    if (row.nextVerificationAt === null || row.nextVerificationAt > query.verificationDueBefore) return false
  }
  return true
}

function sortInstruments(rows: readonly Instrument[], query: InstrumentQuery): Instrument[] {
  const field = query.sort ?? "inventoryNumber"
  const direction = query.desc ? -1 : 1
  return [...rows].sort((a, b) => {
    const left = a[field]
    const right = b[field]
    if (left === right) return a.inventoryNumber.localeCompare(b.inventoryNumber, "ru")
    if (left === null) return 1
    if (right === null) return -1
    if (typeof left === "number" && typeof right === "number") return (left - right) * direction
    return String(left).localeCompare(String(right), "ru") * direction
  })
}

function paginate<T>(rows: readonly T[], page = 0, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  const start = page * pageSize
  return { rows: rows.slice(start, start + pageSize), total: rows.length, page, pageSize }
}
