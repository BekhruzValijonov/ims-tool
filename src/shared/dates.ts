/**
 * Даты.
 *
 * Везде, где речь о календарном дне, берётся ЛОКАЛЬНАЯ дата, а не UTC-сутки:
 * выдача в 23:40 обязана попасть в тот день, когда её сделали, иначе график
 * движения съедет на сутки у половины смен.
 */
export const DAY_MS = 24 * 60 * 60 * 1000

/** YYYY-MM-DD по местному времени. */
export function toLocalDate(timestamp: number): string {
  const d = new Date(timestamp)
  const month = `${ d.getMonth() + 1 }`.padStart(2, "0")
  const day = `${ d.getDate() }`.padStart(2, "0")
  return `${ d.getFullYear() }-${ month }-${ day }`
}

export function startOfLocalDay(timestamp: number): number {
  const d = new Date(timestamp)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfLocalDay(timestamp: number): number {
  const d = new Date(timestamp)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/** Список календарных дат от и до включительно — чтобы в графике не пропадали дни без операций. */
export function localDateRange(from: number, to: number): string[] {
  const dates: string[] = []
  // Шагаем календарным днём, а не прибавлением 24 часов: на переходе времени
  // сутки короче или длиннее, и арифметика по миллисекундам теряет или двоит день.
  const cursor = new Date(startOfLocalDay(from))
  while (cursor.getTime() <= to) {
    dates.push(toLocalDate(cursor.getTime()))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function addMonths(timestamp: number, months: number): number {
  const d = new Date(timestamp)
  d.setMonth(d.getMonth() + months)
  return d.getTime()
}

/** Человеческая дата: 17.09.2026 */
export function formatDate(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return "—"
  return new Date(timestamp).toLocaleDateString("ru-RU")
}

/** Человеческая дата со временем: 17.09.2026, 14:32 */
export function formatDateTime(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return "—"
  return new Date(timestamp).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
