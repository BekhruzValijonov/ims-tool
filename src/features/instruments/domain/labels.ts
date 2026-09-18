import type { InstrumentStatus } from "./types"

/** Русские названия статусов. Одно место на всё приложение. */
export const STATUS_LABELS: Readonly<Record<InstrumentStatus, string>> = {
  AVAILABLE: "В наличии",
  CHECKED_OUT: "Выдан",
  IN_REPAIR: "В ремонте",
  IN_VERIFICATION: "На поверке",
  WRITTEN_OFF: "Списан",
}

/** Цвет чипа статуса. */
export const STATUS_COLORS: Readonly<Record<InstrumentStatus, "success" | "info" | "warning" | "default" | "error">> = {
  AVAILABLE: "success",
  CHECKED_OUT: "info",
  IN_REPAIR: "warning",
  IN_VERIFICATION: "warning",
  WRITTEN_OFF: "default",
}

export function statusLabel(status: InstrumentStatus): string {
  return STATUS_LABELS[status]
}

/** Денежная сумма из тийинов в читаемый вид. */
export function formatPrice(priceMinor: number | null, currency: string | null): string {
  if (priceMinor === null) return "—"
  const amount = priceMinor / 100
  return `${ amount.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) } ${ currency ?? "" }`.trim()
}
