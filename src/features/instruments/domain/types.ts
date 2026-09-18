/**
 * Статус прибора.
 *
 * Меняется только операцией (см. features/operations/domain/transitions.ts):
 * ни форма правки, ни репозиторий не дают выставить его напрямую. Именно это
 * убирает основную массу ошибок оператора — нельзя «просто поменять статус»
 * и оставить прибор числящимся за уволившимся сотрудником.
 */
export type InstrumentStatus =
  | "AVAILABLE"
  | "CHECKED_OUT"
  | "IN_REPAIR"
  | "IN_VERIFICATION"
  | "WRITTEN_OFF"

export const INSTRUMENT_STATUSES: readonly InstrumentStatus[] = [
  "AVAILABLE",
  "CHECKED_OUT",
  "IN_REPAIR",
  "IN_VERIFICATION",
  "WRITTEN_OFF",
]

/** Откуда приехала запись. Заполняется уже сейчас — задел под импорт. */
export type InstrumentSource = "manual" | "import"

/**
 * Прибор. Одна строка на один физический предмет с инвентарным номером.
 *
 * Метки времени — миллисекунды эпохи, как и везде в приложении.
 */
export interface Instrument {
  readonly id: string
  readonly inventoryNumber: string
  readonly name: string
  readonly typeId: string | null
  readonly serialNumber: string | null
  readonly manufacturer: string | null
  readonly model: string | null
  readonly status: InstrumentStatus

  /** За кем прибор числится постоянно. */
  readonly ownerDepartmentId: string | null
  /** Куда прибор возвращается: в форме возврата места нет, и система обязана знать его сама. */
  readonly baseLocationId: string | null
  readonly currentDepartmentId: string | null
  readonly currentLocationId: string | null
  /** У кого на руках. NULL, когда прибор на месте. */
  readonly currentEmployeeId: string | null
  /** Материально ответственное лицо — не меняется при выдаче. */
  readonly responsibleEmployeeId: string | null

  readonly issuedAt: number | null
  readonly expectedReturnAt: number | null
  readonly nextVerificationAt: number | null
  readonly nextCalibrationAt: number | null

  readonly purchasedAt: number | null
  /** Деньги целым числом в тийинах: REAL для стоимости рано или поздно даёт 1 249,9999. */
  readonly priceMinor: number | null
  readonly currency: string | null
  readonly description: string | null
  readonly note: string | null

  readonly source: InstrumentSource
  readonly externalRef: string | null
  readonly createdAt: number
  readonly updatedAt: number
}

/** Что заполняет человек в форме добавления. Статус и размещение выводятся системой. */
export interface InstrumentDraft {
  readonly inventoryNumber: string
  readonly name: string
  readonly typeId: string | null
  readonly serialNumber?: string | null
  readonly manufacturer?: string | null
  readonly model?: string | null
  readonly ownerDepartmentId: string | null
  readonly baseLocationId: string | null
  readonly responsibleEmployeeId?: string | null
  readonly purchasedAt?: number | null
  readonly priceMinor?: number | null
  readonly currency?: string | null
  readonly description?: string | null
  readonly note?: string | null
  readonly source?: InstrumentSource
  readonly externalRef?: string | null
}

/**
 * Что разрешено править в карточке.
 *
 * Ни статуса, ни текущего держателя, ни дат выдачи здесь нет намеренно: всё
 * это меняется операциями, иначе журнал разойдётся с реальностью.
 */
export type InstrumentPatch = Partial<
  Omit<InstrumentDraft, "source" | "externalRef">
>

export type InstrumentSort =
  | "inventoryNumber"
  | "name"
  | "status"
  | "createdAt"
  | "expectedReturnAt"

export interface InstrumentQuery {
  /** Поиск по названию, инвентарному и серийному номеру. */
  readonly text?: string
  readonly statuses?: readonly InstrumentStatus[]
  readonly typeId?: string
  readonly departmentId?: string
  readonly locationId?: string
  readonly employeeId?: string
  readonly createdFrom?: number
  readonly createdTo?: number
  /** Только невозвращённые в срок. */
  readonly overdueOnly?: boolean
  /** Только те, у кого поверка истекает до этого момента. */
  readonly verificationDueBefore?: number
  readonly sort?: InstrumentSort
  readonly desc?: boolean
  readonly page?: number
  readonly pageSize?: number
}
