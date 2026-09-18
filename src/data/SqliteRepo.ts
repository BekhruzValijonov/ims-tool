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
import { buildSearchText, normalizeSearchQuery } from "../features/instruments/domain/search"
import type {
  Department,
  DepartmentSummary,
  Employee,
  EmployeeQuery,
  InstrumentType,
  StorageLocation,
} from "../features/directories/domain/types"
import type {
  EventKind,
  InstrumentEvent,
  JournalQuery,
  OperationCommand,
  OperationError,
  ReturnCondition,
} from "../features/operations/domain/types"
import type {
  NewVerificationRecord,
  VerificationKind,
  VerificationRecord,
  VerificationResult,
} from "../features/verification/domain/types"
import type { Counters, DailyFlow, StatusSlice } from "../features/dashboard/domain/types"
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
import { MIGRATIONS } from "./migrations"
import { generateId } from "./uuid"
import { OPERATOR_NAME_KEY, VERIFICATION_HORIZON_MS } from "./settingsKeys"

/**
 * Минимум, который нужен от драйвера базы.
 *
 * Ровно этот интерфейс реализует `Database` из `@tauri-apps/plugin-sql`.
 * Отдельный тип нужен, чтобы репозиторий можно было собрать и проверить без
 * запуска Tauri: тесты подсовывают сюда node:sqlite и гоняют по настоящему
 * движку тот же SQL, который пойдёт на устройстве.
 */
export interface SqlDriver {
  execute(sql: string, params?: unknown[]): Promise<unknown>

  select<T>(sql: string, params?: unknown[]): Promise<T>
}

type Row = Record<string, unknown>

export class SqliteRepo implements AppRepo {
  readonly backend: StorageBackend = "sqlite"

  /**
   * Очередь записи.
   *
   * У плагина sql нет своего API транзакций, а запросы идут через пул sqlx:
   * BEGIN и COMMIT, отправленные порознь, в принципе могут попасть на разные
   * соединения. Пул отдаёт свободное соединение и создаёт новое только когда
   * свободных нет — значит достаточно не допускать двух одновременных записей.
   * Эта очередь и есть такая гарантия: все изменяющие операции идут строго по
   * одной.
   */
  private writeQueue: Promise<unknown> = Promise.resolve()

  private constructor(
    private readonly db: SqlDriver,
    private readonly clock: () => number,
  ) {}

  /** Боевой путь: база лежит файлом в каталоге данных приложения. */
  static async load(): Promise<SqliteRepo> {
    const { default: Database } = await import("@tauri-apps/plugin-sql")
    const db = await Database.load("sqlite:ims.db")
    return SqliteRepo.open(db as unknown as SqlDriver)
  }

  /** Путь для тестов и для любого другого драйвера с тем же интерфейсом. */
  static async open(db: SqlDriver, clock: () => number = Date.now): Promise<SqliteRepo> {
    const repo = new SqliteRepo(db, clock)
    await repo.migrate()
    return repo
  }

  /**
   * Применяет недостающие миграции.
   *
   * Версия хранится в PRAGMA user_version, поэтому повторный запуск ничего не
   * переделывает, а миграции, попавшие в сборку, больше не редактируются.
   */
  private async migrate(): Promise<void> {
    await this.db.execute("PRAGMA foreign_keys = ON;")
    const rows = await this.db.select<Row[]>("PRAGMA user_version;")
    const current = Number(rows[0]?.user_version ?? 0)

    for (const migration of MIGRATIONS) {
      if (migration.id <= current) continue
      for (const statement of migration.statements) {
        await this.db.execute(statement)
      }
      // Номер подставляется прямо в текст: PRAGMA не принимает параметров, а
      // значение наше собственное и не приходит снаружи.
      await this.db.execute(`PRAGMA user_version = ${ migration.id };`)
    }
  }

  /** Ставит запись в очередь и оборачивает её в транзакцию. */
  private write<T>(work: () => Promise<T>): Promise<T> {
    const next = this.writeQueue.then(async () => {
      await this.db.execute("BEGIN IMMEDIATE;")
      try {
        const value = await work()
        await this.db.execute("COMMIT;")
        return value
      } catch (error) {
        await this.db.execute("ROLLBACK;").catch(() => {
          // Откат уже невозможен — исходная ошибка важнее.
        })
        throw error
      }
    })
    // Очередь не должна вставать из-за упавшей операции.
    this.writeQueue = next.catch(() => undefined)
    return next
  }

  readonly instruments: InstrumentRepo = {
    list: async (query = {}) => this.listInstruments(query),
    getById: async (id) => {
      const rows = await this.db.select<Row[]>("SELECT * FROM instrument WHERE id = ?;", [id])
      return rows[0] ? toInstrument(rows[0]) : null
    },
    getByInventoryNumber: async (inventoryNumber) => {
      const rows = await this.db.select<Row[]>(
        "SELECT * FROM instrument WHERE inventory_number = ?;", [inventoryNumber])
      return rows[0] ? toInstrument(rows[0]) : null
    },
    create: async (draft, operatorName) => this.createInstrument(draft, operatorName),
    update: async (id, patch, operatorName) => this.updateInstrument(id, patch, operatorName),
  }

  readonly operations: OperationRepo = {
    execute: async (command) => this.execute(command),
    historyOf: async (instrumentId) => {
      const rows = await this.db.select<Row[]>(
        "SELECT * FROM instrument_event WHERE instrument_id = ? ORDER BY occurred_at DESC, rowid DESC;",
        [instrumentId])
      return rows.map(toEvent)
    },
    journal: async (query = {}) => this.listJournal(query),
  }

  readonly directories: DirectoryRepo = {
    departments: async (includeArchived = false) => {
      const rows = await this.db.select<Row[]>(
        `SELECT * FROM department ${ includeArchived ? "" : "WHERE is_archived = 0" } ORDER BY name;`)
      return rows.map(toDepartment)
    },
    createDepartment: async (draft) => this.write(async () => {
      const row = { ...draft, id: generateId(), isArchived: false, ...this.stamps() }
      await this.db.execute(
        `INSERT INTO department (id, name, code, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?);`,
        [row.id, row.name, row.code, row.createdAt, row.updatedAt])
      return row as Department
    }),
    updateDepartment: async (id, patch) => this.write(async () => {
      await this.patch("department", id, {
        name: patch.name,
        code: patch.code,
      })
      return this.requireOne("department", id, toDepartment)
    }),
    archiveDepartment: async (id, archived) => {
      await this.write(() => this.patch("department", id, { is_archived: archived }))
    },

    locations: async (includeArchived = false) => {
      const rows = await this.db.select<Row[]>(
        `SELECT * FROM location ${ includeArchived ? "" : "WHERE is_archived = 0" } ORDER BY name;`)
      return rows.map(toLocation)
    },
    createLocation: async (draft) => this.write(async () => {
      const row = { ...draft, id: generateId(), isArchived: false, ...this.stamps() }
      await this.db.execute(
        `INSERT INTO location (id, name, code, department_id, note, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
        [row.id, row.name, row.code, row.departmentId, row.note, row.createdAt, row.updatedAt])
      return row as StorageLocation
    }),
    updateLocation: async (id, patch) => this.write(async () => {
      await this.patch("location", id, {
        name: patch.name,
        code: patch.code,
        department_id: patch.departmentId,
        note: patch.note,
      })
      return this.requireOne("location", id, toLocation)
    }),
    archiveLocation: async (id, archived) => {
      await this.write(() => this.patch("location", id, { is_archived: archived }))
    },

    employees: async (query = {}) => this.listEmployees(query),
    createEmployee: async (draft) => this.write(async () => {
      const row = { ...draft, id: generateId(), isActive: true, ...this.stamps() }
      await this.db.execute(
        `INSERT INTO employee
           (id, full_name, personnel_number, department_id, position, phone, search_text,
            is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [row.id, row.fullName, row.personnelNumber, row.departmentId, row.position, row.phone,
          buildSearchText(row.fullName, row.personnelNumber), row.createdAt, row.updatedAt])
      return row as Employee
    }),
    updateEmployee: async (id, patch) => this.write(async () => {
      const current = await this.requireOne("employee", id, toEmployee)
      const next = { ...current, ...stripUndefined(patch) }
      await this.patch("employee", id, {
        full_name: patch.fullName,
        personnel_number: patch.personnelNumber,
        department_id: patch.departmentId,
        position: patch.position,
        phone: patch.phone,
        search_text: buildSearchText(next.fullName, next.personnelNumber),
      })
      return this.requireOne("employee", id, toEmployee)
    }),
    setEmployeeActive: async (id, active) => {
      await this.write(() => this.patch("employee", id, { is_active: active }))
    },
    instrumentsOf: async (employeeId) => {
      const rows = await this.db.select<Row[]>(
        "SELECT * FROM instrument WHERE current_employee_id = ? ORDER BY issued_at;", [employeeId])
      return rows.map(toInstrument)
    },

    instrumentTypes: async (includeArchived = false) => {
      const rows = await this.db.select<Row[]>(
        `SELECT * FROM instrument_type ${ includeArchived ? "" : "WHERE is_archived = 0" } ORDER BY name;`)
      return rows.map(toInstrumentType)
    },
    createInstrumentType: async (draft) => this.write(async () => {
      const row = { ...draft, id: generateId(), isArchived: false, ...this.stamps() }
      await this.db.execute(
        `INSERT INTO instrument_type
           (id, name, requires_verification, default_verification_interval_months,
            is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?);`,
        [row.id, row.name, bool(row.requiresVerification), row.defaultVerificationIntervalMonths,
          row.createdAt, row.updatedAt])
      return row as InstrumentType
    }),
    updateInstrumentType: async (id, patch) => this.write(async () => {
      await this.patch("instrument_type", id, {
        name: patch.name,
        requires_verification: patch.requiresVerification,
        default_verification_interval_months: patch.defaultVerificationIntervalMonths,
      })
      return this.requireOne("instrument_type", id, toInstrumentType)
    }),
    archiveInstrumentType: async (id, archived) => {
      await this.write(() => this.patch("instrument_type", id, { is_archived: archived }))
    },

    departmentSummary: async () => this.departmentSummary(),
  }

  readonly verification: VerificationRepo = {
    listFor: async (instrumentId) => {
      const rows = await this.db.select<Row[]>(
        "SELECT * FROM verification WHERE instrument_id = ? ORDER BY performed_at DESC;", [instrumentId])
      return rows.map(toVerification)
    },
    add: async (record) => this.write(() => this.insertVerification(record)),
    dueBefore: async (timestamp) => {
      const rows = await this.db.select<Row[]>(
        `SELECT * FROM instrument
         WHERE status <> 'WRITTEN_OFF'
           AND next_verification_at IS NOT NULL
           AND next_verification_at <= ?
         ORDER BY next_verification_at;`,
        [timestamp])
      return rows.map(toInstrument)
    },
  }

  readonly dashboard: DashboardRepo = {
    counters: async (now) => this.counters(now),
    flow: async (from, to) => this.flow(from, to),
    recent: async (limit) => {
      const rows = await this.db.select<Row[]>(
        "SELECT * FROM instrument_event ORDER BY occurred_at DESC, rowid DESC LIMIT ?;", [limit])
      return rows.map(toEvent)
    },
    statusBreakdown: async () => this.statusBreakdown(),
  }

  readonly settings: SettingsRepo = {
    operatorName: async () => {
      const rows = await this.db.select<Row[]>(
        "SELECT value FROM settings WHERE key = ?;", [OPERATOR_NAME_KEY])
      return rows[0] ? String(rows[0].value) : null
    },
    setOperatorName: async (name) => {
      await this.write(async () => {
        await this.db.execute(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
          [OPERATOR_NAME_KEY, name.trim()])
      })
    },
  }

  // ——— внутреннее ———

  private stamps() {
    const now = this.clock()
    return { createdAt: now, updatedAt: now }
  }

  private async patch(table: string, id: string, columns: Record<string, unknown>): Promise<void> {
    const entries = Object.entries(columns).filter(([, value]) => value !== undefined)
    const assignments = entries.map(([column]) => `${ column } = ?`)
    assignments.push("updated_at = ?")
    const values = entries.map(([, value]) => (typeof value === "boolean" ? bool(value) : value))
    values.push(this.clock(), id)
    await this.db.execute(`UPDATE ${ table } SET ${ assignments.join(", ") } WHERE id = ?;`, values)
  }

  private async requireOne<T>(table: string, id: string, map: (row: Row) => T): Promise<T> {
    const rows = await this.db.select<Row[]>(`SELECT * FROM ${ table } WHERE id = ?;`, [id])
    if (!rows[0]) throw new Error(`запись ${ id } в ${ table } не найдена`)
    return map(rows[0])
  }

  private async listInstruments(query: InstrumentQuery): Promise<Page<Instrument>> {
    const where: string[] = []
    const params: unknown[] = []

    if (query.text?.trim()) {
      where.push("search_text LIKE ?")
      params.push(`%${ normalizeSearchQuery(query.text) }%`)
    }
    if (query.statuses && query.statuses.length > 0) {
      where.push(`status IN (${ query.statuses.map(() => "?").join(", ") })`)
      params.push(...query.statuses)
    }
    if (query.typeId) { where.push("type_id = ?"); params.push(query.typeId) }
    if (query.departmentId) { where.push("current_department_id = ?"); params.push(query.departmentId) }
    if (query.locationId) { where.push("current_location_id = ?"); params.push(query.locationId) }
    if (query.employeeId) { where.push("current_employee_id = ?"); params.push(query.employeeId) }
    if (query.createdFrom !== undefined) { where.push("created_at >= ?"); params.push(query.createdFrom) }
    if (query.createdTo !== undefined) { where.push("created_at <= ?"); params.push(query.createdTo) }
    if (query.overdueOnly) {
      where.push("status = 'CHECKED_OUT' AND expected_return_at IS NOT NULL AND expected_return_at < ?")
      params.push(this.clock())
    }
    if (query.verificationDueBefore !== undefined) {
      where.push("next_verification_at IS NOT NULL AND next_verification_at <= ?")
      params.push(query.verificationDueBefore)
    }

    const clause = where.length > 0 ? `WHERE ${ where.join(" AND ") }` : ""
    const totals = await this.db.select<Row[]>(
      `SELECT count(*) AS total FROM instrument ${ clause };`, params)
    const total = Number(totals[0]?.total ?? 0)

    const page = query.page ?? 0
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM instrument ${ clause } ORDER BY ${ orderBy(query) } LIMIT ? OFFSET ?;`,
      [...params, pageSize, page * pageSize])

    return { rows: rows.map(toInstrument), total, page, pageSize }
  }

  private async listEmployees(query: EmployeeQuery): Promise<readonly Employee[]> {
    const where: string[] = []
    const params: unknown[] = []
    if (!query.includeInactive) where.push("is_active = 1")
    if (query.departmentId) { where.push("department_id = ?"); params.push(query.departmentId) }
    if (query.text?.trim()) {
      where.push("search_text LIKE ?")
      params.push(`%${ normalizeSearchQuery(query.text) }%`)
    }
    const clause = where.length > 0 ? `WHERE ${ where.join(" AND ") }` : ""
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM employee ${ clause } ORDER BY full_name;`, params)
    return rows.map(toEmployee)
  }

  private async createInstrument(
    draft: InstrumentDraft,
    operatorName: string,
  ): Promise<Result<Instrument, WriteError>> {
    const inventoryNumber = draft.inventoryNumber.trim()
    if (inventoryNumber === "") return err({ code: "INVENTORY_NUMBER_REQUIRED" })
    if (draft.name.trim() === "") return err({ code: "NAME_REQUIRED" })

    const existing = await this.db.select<Row[]>(
      "SELECT id FROM instrument WHERE inventory_number = ?;", [inventoryNumber])
    if (existing.length > 0) return err({ code: "DUPLICATE_INVENTORY_NUMBER", inventoryNumber })

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

    await this.write(async () => {
      await this.insertInstrument(instrument)
      await this.insertEvent({
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
    })
    return ok(instrument)
  }

  private async updateInstrument(
    id: string,
    patch: InstrumentPatch,
    operatorName: string,
  ): Promise<Result<Instrument, WriteError>> {
    const current = await this.instruments.getById(id)
    if (!current) return err({ code: "NOT_FOUND", id })

    if (patch.inventoryNumber !== undefined) {
      const inventoryNumber = patch.inventoryNumber.trim()
      if (inventoryNumber === "") return err({ code: "INVENTORY_NUMBER_REQUIRED" })
      const clash = await this.db.select<Row[]>(
        "SELECT id FROM instrument WHERE inventory_number = ? AND id <> ?;", [inventoryNumber, id])
      if (clash.length > 0) return err({ code: "DUPLICATE_INVENTORY_NUMBER", inventoryNumber })
    }
    if (patch.name !== undefined && patch.name.trim() === "") return err({ code: "NAME_REQUIRED" })

    const now = this.clock()
    const next: Instrument = { ...current, ...stripUndefined(patch), updatedAt: now }
    const changed = diffFields(current, next)

    await this.write(async () => {
      await this.patch("instrument", id, {
        inventory_number: next.inventoryNumber,
        name: next.name,
        type_id: next.typeId,
        serial_number: next.serialNumber,
        manufacturer: next.manufacturer,
        model: next.model,
        owner_department_id: next.ownerDepartmentId,
        base_location_id: next.baseLocationId,
        responsible_employee_id: next.responsibleEmployeeId,
        purchased_at: next.purchasedAt,
        price_minor: next.priceMinor,
        currency: next.currency,
        description: next.description,
        note: next.note,
        search_text: buildSearchText(next.name, next.inventoryNumber, next.serialNumber),
      })
      if (Object.keys(changed).length > 0) {
        await this.insertEvent({
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
    })
    return ok(next)
  }

  private async execute(command: OperationCommand): Promise<Result<OperationOutcomeRecord, OperationError>> {
    const instrument = await this.instruments.getById(command.instrumentId)
    if (!instrument) return err({ code: "INSTRUMENT_NOT_FOUND", instrumentId: command.instrumentId })

    if (command.kind === "CHECK_OUT") {
      const rows = await this.db.select<Row[]>(
        "SELECT * FROM employee WHERE id = ?;", [command.employeeId])
      if (!rows[0]) return err({ code: "EMPLOYEE_NOT_FOUND", employeeId: command.employeeId })
      if (Number(rows[0].is_active) !== 1) {
        return err({ code: "EMPLOYEE_INACTIVE", employeeId: command.employeeId })
      }
    }

    const outcome = applyOperation(instrument, command, this.clock())
    if (!outcome.ok) return outcome

    const { next, event, verification } = outcome.value
    const stored = await this.write(async () => {
      /* Журнал пишется раньше карточки: он источник истины, и если запись
         оборвётся между двумя операторами, восстановиться можно по нему. */
      const storedEvent = await this.insertEvent(event)
      await this.updateInstrumentState(next)
      const storedVerification = verification ? await this.insertVerification(verification, false) : null
      return { instrument: next, event: storedEvent, verification: storedVerification }
    })
    return ok(stored)
  }

  private async insertInstrument(instrument: Instrument): Promise<void> {
    await this.db.execute(
      `INSERT INTO instrument (
         id, inventory_number, name, type_id, serial_number, manufacturer, model, status,
         owner_department_id, base_location_id, current_department_id, current_location_id,
         current_employee_id, responsible_employee_id, issued_at, expected_return_at,
         next_verification_at, next_calibration_at, purchased_at, price_minor, currency,
         description, note, search_text, source, external_ref, created_at, updated_at
       ) VALUES (${ placeholders(28) });`,
      [
        instrument.id, instrument.inventoryNumber, instrument.name, instrument.typeId,
        instrument.serialNumber, instrument.manufacturer, instrument.model, instrument.status,
        instrument.ownerDepartmentId, instrument.baseLocationId, instrument.currentDepartmentId,
        instrument.currentLocationId, instrument.currentEmployeeId, instrument.responsibleEmployeeId,
        instrument.issuedAt, instrument.expectedReturnAt, instrument.nextVerificationAt,
        instrument.nextCalibrationAt, instrument.purchasedAt, instrument.priceMinor, instrument.currency,
        instrument.description, instrument.note,
        buildSearchText(instrument.name, instrument.inventoryNumber, instrument.serialNumber),
        instrument.source, instrument.externalRef, instrument.createdAt, instrument.updatedAt,
      ])
  }

  /** Колонки, которыми распоряжаются операции. Паспортные поля тут не трогаются. */
  private async updateInstrumentState(instrument: Instrument): Promise<void> {
    await this.db.execute(
      `UPDATE instrument SET
         status = ?, owner_department_id = ?, base_location_id = ?, current_department_id = ?,
         current_location_id = ?, current_employee_id = ?, issued_at = ?, expected_return_at = ?,
         next_verification_at = ?, next_calibration_at = ?, updated_at = ?
       WHERE id = ?;`,
      [
        instrument.status, instrument.ownerDepartmentId, instrument.baseLocationId,
        instrument.currentDepartmentId, instrument.currentLocationId, instrument.currentEmployeeId,
        instrument.issuedAt, instrument.expectedReturnAt, instrument.nextVerificationAt,
        instrument.nextCalibrationAt, instrument.updatedAt, instrument.id,
      ])
  }

  private async insertEvent(event: Omit<InstrumentEvent, "id">): Promise<InstrumentEvent> {
    const stored: InstrumentEvent = { ...event, id: generateId() }
    await this.db.execute(
      `INSERT INTO instrument_event (
         id, instrument_id, kind, occurred_at, status_before, status_after, employee_id,
         from_location_id, to_location_id, from_department_id, to_department_id,
         expected_return_at, condition, reason, note, operator_name, payload_json
       ) VALUES (${ placeholders(17) });`,
      [
        stored.id, stored.instrumentId, stored.kind, stored.occurredAt, stored.statusBefore,
        stored.statusAfter, stored.employeeId, stored.fromLocationId, stored.toLocationId,
        stored.fromDepartmentId, stored.toDepartmentId, stored.expectedReturnAt, stored.condition,
        stored.reason, stored.note, stored.operatorName,
        stored.payload ? JSON.stringify(stored.payload) : null,
      ])
    return stored
  }

  /**
   * `syncInstrument` выключается, когда срок в карточке уже посчитан переходом:
   * иначе одно и то же значение писалось бы дважды.
   */
  private async insertVerification(
    record: NewVerificationRecord,
    syncInstrument = true,
  ): Promise<VerificationRecord> {
    const stored: VerificationRecord = { ...record, id: generateId(), createdAt: this.clock() }
    await this.db.execute(
      `INSERT INTO verification (
         id, instrument_id, kind, performed_at, valid_until, certificate_number,
         organization, result, note, created_at
       ) VALUES (${ placeholders(10) });`,
      [
        stored.id, stored.instrumentId, stored.kind, stored.performedAt, stored.validUntil,
        stored.certificateNumber, stored.organization, stored.result, stored.note, stored.createdAt,
      ])

    if (syncInstrument && stored.result === "PASS") {
      const column = stored.kind === "CALIBRATION" ? "next_calibration_at" : "next_verification_at"
      await this.db.execute(
        `UPDATE instrument SET ${ column } = ?, updated_at = ? WHERE id = ?;`,
        [stored.validUntil, this.clock(), stored.instrumentId])
    }
    return stored
  }

  private async listJournal(query: JournalQuery): Promise<Page<InstrumentEvent>> {
    const where: string[] = []
    const params: unknown[] = []

    if (query.kinds && query.kinds.length > 0) {
      where.push(`kind IN (${ query.kinds.map(() => "?").join(", ") })`)
      params.push(...query.kinds)
    }
    if (query.instrumentId) { where.push("instrument_id = ?"); params.push(query.instrumentId) }
    if (query.employeeId) { where.push("employee_id = ?"); params.push(query.employeeId) }
    if (query.departmentId) {
      where.push("(to_department_id = ? OR from_department_id = ?)")
      params.push(query.departmentId, query.departmentId)
    }
    if (query.from !== undefined) { where.push("occurred_at >= ?"); params.push(query.from) }
    if (query.to !== undefined) { where.push("occurred_at <= ?"); params.push(query.to) }

    const clause = where.length > 0 ? `WHERE ${ where.join(" AND ") }` : ""
    const totals = await this.db.select<Row[]>(
      `SELECT count(*) AS total FROM instrument_event ${ clause };`, params)
    const total = Number(totals[0]?.total ?? 0)

    const page = query.page ?? 0
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM instrument_event ${ clause } ORDER BY occurred_at DESC, rowid DESC LIMIT ? OFFSET ?;`,
      [...params, pageSize, page * pageSize])

    return { rows: rows.map(toEvent), total, page, pageSize }
  }

  private async counters(now: number): Promise<Counters> {
    const rows = await this.db.select<Row[]>(
      `SELECT
         sum(status <> 'WRITTEN_OFF')                                         AS total,
         sum(status = 'AVAILABLE')                                            AS available,
         sum(status = 'CHECKED_OUT')                                          AS checked_out,
         sum(status = 'IN_REPAIR')                                            AS in_repair,
         sum(status = 'WRITTEN_OFF')                                          AS written_off,
         sum(status = 'CHECKED_OUT' AND expected_return_at IS NOT NULL
             AND expected_return_at < ?)                                      AS overdue,
         sum(status <> 'WRITTEN_OFF' AND next_verification_at IS NOT NULL
             AND next_verification_at <= ?)                                   AS verification_due
       FROM instrument;`,
      [now, now + VERIFICATION_HORIZON_MS])

    const row = rows[0] ?? {}
    return {
      total: Number(row.total ?? 0),
      available: Number(row.available ?? 0),
      checkedOut: Number(row.checked_out ?? 0),
      inRepair: Number(row.in_repair ?? 0),
      overdue: Number(row.overdue ?? 0),
      verificationDue: Number(row.verification_due ?? 0),
      writtenOff: Number(row.written_off ?? 0),
    }
  }

  private async flow(from: number, to: number): Promise<DailyFlow[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT occurred_at, kind FROM instrument_event
       WHERE occurred_at BETWEEN ? AND ? AND kind IN ('CHECK_OUT', 'RETURN');`,
      [from, to])

    const buckets = new Map<string, { checkedOut: number; returned: number }>()
    for (const date of localDateRange(from, to)) buckets.set(date, { checkedOut: 0, returned: 0 })
    for (const row of rows) {
      const bucket = buckets.get(toLocalDate(Number(row.occurred_at)))
      if (!bucket) continue
      if (row.kind === "CHECK_OUT") bucket.checkedOut += 1
      else bucket.returned += 1
    }
    return [...buckets.entries()].map(([date, value]) => ({ date, ...value }))
  }

  private async statusBreakdown(): Promise<StatusSlice[]> {
    const rows = await this.db.select<Row[]>(
      "SELECT status, count(*) AS count FROM instrument GROUP BY status;")
    const counts = new Map(rows.map((row) => [String(row.status), Number(row.count)]))
    return INSTRUMENT_STATUSES
      .map((status) => ({ status, count: counts.get(status) ?? 0 }))
      .filter((slice) => slice.count > 0)
  }

  private async departmentSummary(): Promise<DepartmentSummary[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT d.id                                            AS department_id,
              d.name                                          AS name,
              count(i.id)                                     AS total,
              coalesce(sum(i.status = 'AVAILABLE'), 0)        AS available,
              coalesce(sum(i.status = 'CHECKED_OUT'), 0)      AS checked_out,
              coalesce(sum(i.status = 'IN_REPAIR'), 0)        AS in_repair,
              coalesce(sum(i.status = 'IN_VERIFICATION'), 0)  AS in_verification
       FROM department d
       LEFT JOIN instrument i
         ON i.owner_department_id = d.id AND i.status <> 'WRITTEN_OFF'
       WHERE d.is_archived = 0
       GROUP BY d.id, d.name
       ORDER BY d.name;`)

    return rows.map((row) => ({
      departmentId: String(row.department_id),
      name: String(row.name),
      total: Number(row.total),
      available: Number(row.available),
      checkedOut: Number(row.checked_out),
      inRepair: Number(row.in_repair),
      inVerification: Number(row.in_verification),
    }))
  }
}

// ——— преобразование строк ———

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ")
}

function bool(value: boolean): number {
  return value ? 1 : 0
}

function num(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value)
}

function str(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value)
}

function orderBy(query: InstrumentQuery): string {
  const columns: Record<NonNullable<InstrumentQuery["sort"]>, string> = {
    inventoryNumber: "inventory_number",
    name: "name",
    status: "status",
    createdAt: "created_at",
    expectedReturnAt: "expected_return_at",
  }
  const column = columns[query.sort ?? "inventoryNumber"]
  return `${ column } ${ query.desc ? "DESC" : "ASC" }, inventory_number ASC`
}

function toInstrument(row: Row): Instrument {
  return {
    id: String(row.id),
    inventoryNumber: String(row.inventory_number),
    name: String(row.name),
    typeId: str(row.type_id),
    serialNumber: str(row.serial_number),
    manufacturer: str(row.manufacturer),
    model: str(row.model),
    status: String(row.status) as InstrumentStatus,
    ownerDepartmentId: str(row.owner_department_id),
    baseLocationId: str(row.base_location_id),
    currentDepartmentId: str(row.current_department_id),
    currentLocationId: str(row.current_location_id),
    currentEmployeeId: str(row.current_employee_id),
    responsibleEmployeeId: str(row.responsible_employee_id),
    issuedAt: num(row.issued_at),
    expectedReturnAt: num(row.expected_return_at),
    nextVerificationAt: num(row.next_verification_at),
    nextCalibrationAt: num(row.next_calibration_at),
    purchasedAt: num(row.purchased_at),
    priceMinor: num(row.price_minor),
    currency: str(row.currency),
    description: str(row.description),
    note: str(row.note),
    source: String(row.source) as Instrument["source"],
    externalRef: str(row.external_ref),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function toEvent(row: Row): InstrumentEvent {
  return {
    id: String(row.id),
    instrumentId: String(row.instrument_id),
    kind: String(row.kind) as EventKind,
    occurredAt: Number(row.occurred_at),
    statusBefore: str(row.status_before) as InstrumentStatus | null,
    statusAfter: str(row.status_after) as InstrumentStatus | null,
    employeeId: str(row.employee_id),
    fromLocationId: str(row.from_location_id),
    toLocationId: str(row.to_location_id),
    fromDepartmentId: str(row.from_department_id),
    toDepartmentId: str(row.to_department_id),
    expectedReturnAt: num(row.expected_return_at),
    condition: str(row.condition) as ReturnCondition | null,
    reason: str(row.reason),
    note: str(row.note),
    operatorName: String(row.operator_name),
    payload: row.payload_json ? JSON.parse(String(row.payload_json)) : null,
  }
}

function toVerification(row: Row): VerificationRecord {
  return {
    id: String(row.id),
    instrumentId: String(row.instrument_id),
    kind: String(row.kind) as VerificationKind,
    performedAt: Number(row.performed_at),
    validUntil: num(row.valid_until),
    certificateNumber: str(row.certificate_number),
    organization: str(row.organization),
    result: String(row.result) as VerificationResult,
    note: str(row.note),
    createdAt: Number(row.created_at),
  }
}

function toDepartment(row: Row): Department {
  return {
    id: String(row.id),
    name: String(row.name),
    code: str(row.code),
    isArchived: Number(row.is_archived) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function toLocation(row: Row): StorageLocation {
  return {
    id: String(row.id),
    name: String(row.name),
    code: str(row.code),
    departmentId: str(row.department_id),
    note: str(row.note),
    isArchived: Number(row.is_archived) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function toEmployee(row: Row): Employee {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    personnelNumber: str(row.personnel_number),
    departmentId: str(row.department_id),
    position: str(row.position),
    phone: str(row.phone),
    isActive: Number(row.is_active) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function toInstrumentType(row: Row): InstrumentType {
  return {
    id: String(row.id),
    name: String(row.name),
    requiresVerification: Number(row.requires_verification) === 1,
    defaultVerificationIntervalMonths: num(row.default_verification_interval_months),
    isArchived: Number(row.is_archived) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function stripUndefined<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>
}

function diffFields(before: Instrument, after: Instrument): Record<string, unknown> {
  const changed: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof Instrument)[]) {
    if (key === "updatedAt") continue
    if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] }
  }
  return changed
}
