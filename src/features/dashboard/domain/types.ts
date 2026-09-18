import type { InstrumentStatus } from "../../instruments/domain/types"

/** Пять плиток дашборда. */
export interface Counters {
  readonly total: number
  readonly available: number
  readonly checkedOut: number
  readonly inRepair: number
  /** Невозврат в срок: выдан и срок возврата в прошлом. */
  readonly overdue: number
  /** Истекает поверка — отдельное «просрочено», нарочно не смешанное с невозвратом. */
  readonly verificationDue: number
  readonly writtenOff: number
}

/** Точка графика «Движение приборов»: сколько выдач и возвратов было в этот день. */
export interface DailyFlow {
  /** Локальная календарная дата, YYYY-MM-DD. */
  readonly date: string
  readonly checkedOut: number
  readonly returned: number
}

export interface StatusSlice {
  readonly status: InstrumentStatus
  readonly count: number
}
