import { localDateRange, startOfLocalDay, toLocalDate } from "../../../shared/dates"
import type { InstrumentStatus } from "../../instruments/domain/types"
import type { InstrumentEvent } from "../../operations/domain/types"

/** Сколько приборов в каком состоянии было на конец этого дня. */
export interface DailyStatus {
  readonly date: string
  readonly total: number
  readonly available: number
  readonly checkedOut: number
  readonly inRepair: number
  readonly inVerification: number
}

export type StatusSnapshot = { readonly id: string; readonly status: InstrumentStatus }

type HistoryEvent = Pick<InstrumentEvent, "instrumentId" | "occurredAt" | "kind" | "statusBefore">

/**
 * История состояний по дням.
 *
 * Считается обратным проходом: берётся сегодняшнее состояние и отматывается
 * назад по журналу — каждое событие знает, каким статус был до него. Так число
 * на графике всегда совпадает с тем, что показывает плитка, и не зависит от
 * отдельного счётчика, который может разойтись с реальностью.
 *
 * Прибор, у которого в окне встретилось CREATE, до этого момента просто не
 * существовал и в «всего» не попадает — иначе месячный график показывал бы
 * сегодняшний парк приборов растянутым на прошлое.
 */
export function buildStatusHistory(
  current: readonly StatusSnapshot[],
  events: readonly HistoryEvent[],
  from: number,
  to: number,
): DailyStatus[] {
  const statuses = new Map<string, InstrumentStatus>(current.map((row) => [row.id, row.status]))
  // От свежих к старым: именно в этом порядке состояние отматывается назад.
  const ordered = [...events].sort((a, b) => b.occurredAt - a.occurredAt)
  let cursor = 0

  const dates = localDateRange(from, to)
  const result: DailyStatus[] = []

  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const endOfDay = startOfLocalDay(dateToTimestamp(dates[i])) + 24 * 60 * 60 * 1000 - 1

    // Отматываем всё, что случилось позже конца этого дня.
    while (cursor < ordered.length && ordered[cursor].occurredAt > endOfDay) {
      const event = ordered[cursor]
      if (event.kind === "CREATE") statuses.delete(event.instrumentId)
      else if (event.statusBefore) statuses.set(event.instrumentId, event.statusBefore)
      cursor += 1
    }

    result.push({ date: dates[i], ...countByStatus(statuses) })
  }

  return result.reverse()
}

function countByStatus(statuses: ReadonlyMap<string, InstrumentStatus>) {
  let total = 0
  let available = 0
  let checkedOut = 0
  let inRepair = 0
  let inVerification = 0

  for (const status of statuses.values()) {
    if (status !== "WRITTEN_OFF") total += 1
    if (status === "AVAILABLE") available += 1
    else if (status === "CHECKED_OUT") checkedOut += 1
    else if (status === "IN_REPAIR") inRepair += 1
    else if (status === "IN_VERIFICATION") inVerification += 1
  }

  return { total, available, checkedOut, inRepair, inVerification }
}

/** YYYY-MM-DD обратно в местное время. */
function dateToTimestamp(date: string): number {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day).getTime()
}

/** Обратное преобразование для проверок: дата дня, в который попала метка. */
export function dayOf(timestamp: number): string {
  return toLocalDate(timestamp)
}
