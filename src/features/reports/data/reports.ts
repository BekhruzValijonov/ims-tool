import type { Column } from "../../../ui/DataTable"
import type { AppRepo } from "../../../data/AppRepo"
import type { Directories } from "../../directories/ui/useDirectories"
import type { CsvColumn } from "../../../shared/csv"
import type { Instrument } from "../../instruments/domain/types"
import { STATUS_LABELS, formatPrice } from "../../instruments/domain/labels"
import { EVENT_LABELS, CONDITION_LABELS } from "../../operations/domain/labels"
import { DAY_MS, formatDate, formatDateTime } from "../../../shared/dates"
import { toOperationRows } from "../../operations/ui/operationRows"


/** Что спрашивать у человека перед построением. */
export type ReportParam = "period" | "horizon" | "instrument"

export interface ReportInput {
  readonly from: number
  readonly to: number
  readonly horizonDays: number
  readonly instrumentId: string | null
}

export interface ReportResult {
  readonly columns: readonly Column<Record<string, unknown>>[]
  readonly rows: readonly Record<string, unknown>[]
  readonly csv: readonly CsvColumn<Record<string, unknown>>[]
  readonly fileName: string
  /** Одна строка под таблицей: что именно посчитано. */
  readonly summary: string
}

export interface ReportDefinition {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly params: readonly ReportParam[]
  run(repo: AppRepo, directories: Directories, input: ReportInput): Promise<ReportResult>
}

/** Колонки таблицы и колонки выгрузки — одно и то же: расходиться им незачем. */
function mirror(
  spec: readonly { field: string; header: string; width?: number; flex?: number; mono?: boolean }[],
): { columns: Column<Record<string, unknown>>[]; csv: CsvColumn<Record<string, unknown>>[] } {
  return {
    columns: spec.map((column) => ({
      key: column.field,
      header: column.header,
      width: column.flex ? undefined : column.width,
      minWidth: column.flex ? 140 : undefined,
      mono: column.mono,
      render: (row) => String(row[column.field] ?? ""),
    })),
    csv: spec.map((column) => ({
      header: column.header,
      value: (row: Record<string, unknown>) => (row[column.field] ?? "") as string,
    })),
  }
}

function withId<T extends object>(rows: readonly T[]): Record<string, unknown>[] {
  return rows.map((row, index) => ({ id: index, ...row }))
}

const registry: ReportDefinition = {
  id: "registry",
  title: "Ведомость приборов",
  description: "Весь реестр на текущий момент — то, с чем сверяются при инвентаризации.",
  params: [],
  async run(repo, directories) {
    const page = await repo.instruments.list({ pageSize: 100000 })
    const spec = [
      { field: "inventoryNumber", header: "Инвентарный номер", width: 160, mono: true },
      { field: "name", header: "Наименование", flex: 1 },
      { field: "type", header: "Тип", width: 150 },
      { field: "serialNumber", header: "Серийный номер", width: 150, mono: true },
      { field: "status", header: "Статус", width: 130 },
      { field: "department", header: "Подразделение", width: 160 },
      { field: "location", header: "Место хранения", width: 170 },
      { field: "employee", header: "У кого", width: 180 },
      { field: "price", header: "Стоимость", width: 140, mono: true },
    ]
    const rows = withId(page.rows.map((instrument) => ({
      inventoryNumber: instrument.inventoryNumber,
      name: instrument.name,
      type: directories.typeName(instrument.typeId),
      serialNumber: instrument.serialNumber ?? "",
      status: STATUS_LABELS[instrument.status],
      department: directories.departmentName(instrument.currentDepartmentId),
      location: directories.locationName(instrument.currentLocationId),
      employee: instrument.currentEmployeeId ? directories.employeeName(instrument.currentEmployeeId) : "",
      price: formatPrice(instrument.priceMinor, instrument.currency),
    })))

    return { ...mirror(spec), rows, fileName: "vedomost-priborov", summary: `Приборов в реестре: ${ page.total }` }
  },
}

const onHands: ReportDefinition = {
  id: "on-hands",
  title: "На руках у сотрудников",
  description: "Кто что держит, с какого числа и сколько дней просрочено.",
  params: [],
  async run(repo, directories) {
    const page = await repo.instruments.list({ statuses: ["CHECKED_OUT"], pageSize: 100000 })
    const now = Date.now()
    const spec = [
      { field: "employee", header: "Сотрудник", flex: 1 },
      { field: "department", header: "Подразделение", width: 170 },
      { field: "inventoryNumber", header: "Инвентарный номер", width: 160, mono: true },
      { field: "name", header: "Прибор", flex: 1 },
      { field: "issuedAt", header: "Выдан", width: 120, mono: true },
      { field: "dueAt", header: "Вернуть до", width: 130, mono: true },
      { field: "overdueDays", header: "Просрочено, дней", width: 160, mono: true },
    ]

    const mapped = page.rows.map((instrument: Instrument) => {
      const due = instrument.expectedReturnAt
      const overdue = due !== null && due < now ? Math.floor((now - due) / DAY_MS) : 0
      return {
        employee: instrument.currentEmployeeId ? directories.employeeName(instrument.currentEmployeeId) : "—",
        department: directories.departmentName(instrument.currentDepartmentId),
        inventoryNumber: instrument.inventoryNumber,
        name: instrument.name,
        issuedAt: formatDate(instrument.issuedAt),
        dueAt: due === null ? "без срока" : formatDate(due),
        overdueDays: overdue === 0 ? "" : overdue,
      }
    })
    mapped.sort((a, b) => Number(b.overdueDays || 0) - Number(a.overdueDays || 0))

    const overdueCount = mapped.filter((row) => row.overdueDays !== "").length
    return {
      ...mirror(spec),
      rows: withId(mapped),
      fileName: "na-rukah",
      summary: `Выдано приборов: ${ mapped.length }, из них просрочено: ${ overdueCount }`,
    }
  },
}

const journal: ReportDefinition = {
  id: "journal",
  title: "Журнал операций за период",
  description: "Всё движение приборов между двумя датами.",
  params: ["period"],
  async run(repo, directories, input) {
    const page = await repo.operations.journal({ from: input.from, to: input.to, pageSize: 100000 })
    const ids = [...new Set(page.rows.map((event) => event.instrumentId))]
    const loaded = await Promise.all(ids.map((id) => repo.instruments.getById(id)))
    const instruments = new Map<string, Instrument>()
    for (const instrument of loaded) if (instrument) instruments.set(instrument.id, instrument)

    const spec = [
      { field: "occurredAt", header: "Когда", width: 160, mono: true },
      { field: "inventoryNumber", header: "Инвентарный номер", width: 160, mono: true },
      { field: "instrumentName", header: "Прибор", flex: 1 },
      { field: "kind", header: "Операция", width: 130 },
      { field: "employee", header: "Сотрудник", flex: 1 },
      { field: "place", header: "Место", flex: 1 },
      { field: "operator", header: "Внёс", flex: 1 },
      { field: "note", header: "Примечание", flex: 1 },
    ]
    const rows = withId(toOperationRows(page.rows, instruments, directories).map((row) => ({
      ...row,
      occurredAt: formatDateTime(row.occurredAt),
    })))

    return {
      ...mirror(spec),
      rows,
      fileName: "zhurnal-operaciy",
      summary: `Операций за период: ${ page.total }`,
    }
  },
}

const verification: ReportDefinition = {
  id: "verification",
  title: "График поверок",
  description: "Что уже просрочено и что истекает в ближайшее время.",
  params: ["horizon"],
  async run(repo, directories, input) {
    const now = Date.now()
    const due = await repo.verification.dueBefore(now + input.horizonDays * DAY_MS)
    const spec = [
      { field: "inventoryNumber", header: "Инвентарный номер", width: 160, mono: true },
      { field: "name", header: "Прибор", flex: 1 },
      { field: "type", header: "Тип", width: 150 },
      { field: "department", header: "Подразделение", width: 170 },
      { field: "validUntil", header: "Поверка до", width: 130, mono: true },
      { field: "daysLeft", header: "Осталось дней", width: 140, mono: true },
      { field: "state", header: "Состояние", width: 140 },
    ]

    const mapped = due.map((instrument) => {
      const until = instrument.nextVerificationAt ?? 0
      const days = Math.ceil((until - now) / DAY_MS)
      return {
        inventoryNumber: instrument.inventoryNumber,
        name: instrument.name,
        type: directories.typeName(instrument.typeId),
        department: directories.departmentName(instrument.currentDepartmentId),
        validUntil: formatDate(until),
        daysLeft: days,
        state: days < 0 ? "просрочена" : "истекает",
      }
    })

    const expired = mapped.filter((row) => row.daysLeft < 0).length
    return {
      ...mirror(spec),
      rows: withId(mapped),
      fileName: "grafik-poverok",
      summary: `Приборов в списке: ${ mapped.length }, уже просрочено: ${ expired }`,
    }
  },
}

const departments: ReportDefinition = {
  id: "departments",
  title: "Загрузка подразделений",
  description: "Сколько за подразделением числится и в каком состоянии приборы.",
  params: [],
  async run(repo) {
    const summary = await repo.directories.departmentSummary()
    const spec = [
      { field: "name", header: "Подразделение", flex: 1 },
      { field: "total", header: "Числится", width: 120, mono: true },
      { field: "available", header: "В наличии", width: 130, mono: true },
      { field: "checkedOut", header: "Выдано", width: 120, mono: true },
      { field: "inRepair", header: "В ремонте", width: 130, mono: true },
      { field: "inVerification", header: "На поверке", width: 140, mono: true },
    ]
    const rows = withId(summary.map((row) => ({
      name: row.name,
      total: row.total,
      available: row.available,
      checkedOut: row.checkedOut,
      inRepair: row.inRepair,
      inVerification: row.inVerification,
    })))

    const total = summary.reduce((sum, row) => sum + row.total, 0)
    return { ...mirror(spec), rows, fileName: "zagruzka-podrazdeleniy", summary: `Всего приборов: ${ total }` }
  },
}

const passport: ReportDefinition = {
  id: "passport",
  title: "Паспорт движения прибора",
  description: "Вся история одного прибора одним документом.",
  params: ["instrument"],
  async run(repo, directories, input) {
    const spec = [
      { field: "occurredAt", header: "Когда", width: 160, mono: true },
      { field: "kind", header: "Операция", width: 140 },
      { field: "employee", header: "Сотрудник", flex: 1 },
      { field: "place", header: "Место", flex: 1 },
      { field: "condition", header: "Состояние", width: 150 },
      { field: "reason", header: "Причина", flex: 1 },
      { field: "operator", header: "Внёс", flex: 1 },
    ]

    if (!input.instrumentId) {
      return { ...mirror(spec), rows: [], fileName: "pasport-pribora", summary: "Выберите прибор" }
    }

    const [instrument, history] = await Promise.all([
      repo.instruments.getById(input.instrumentId),
      repo.operations.historyOf(input.instrumentId),
    ])

    const rows = withId(history.map((event) => ({
      occurredAt: formatDateTime(event.occurredAt),
      kind: EVENT_LABELS[event.kind],
      employee: event.employeeId ? directories.employeeName(event.employeeId) : "",
      place: directories.locationName(event.toLocationId),
      condition: event.condition ? CONDITION_LABELS[event.condition] : "",
      reason: event.reason ?? "",
      operator: event.operatorName,
    })))

    return {
      ...mirror(spec),
      rows,
      fileName: `pasport-${ instrument?.inventoryNumber ?? "pribora" }`,
      summary: instrument
        ? `${ instrument.inventoryNumber } · ${ instrument.name } — записей в истории: ${ history.length }`
        : "Прибор не найден",
    }
  },
}

export const REPORTS: readonly ReportDefinition[] = [
  registry, onHands, journal, verification, departments, passport,
]
