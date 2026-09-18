/**
 * Поверка и калибровка.
 *
 * Хранятся историей, а не двумя датами в карточке прибора: на вопрос «когда его
 * поверяли в прошлом году и по какому свидетельству» две перезаписываемые даты
 * ответить не могут.
 */
export type VerificationKind = "VERIFICATION" | "CALIBRATION"

export type VerificationResult = "PASS" | "FAIL"

export interface VerificationRecord {
  readonly id: string
  readonly instrumentId: string
  readonly kind: VerificationKind
  readonly performedAt: number
  readonly validUntil: number | null
  readonly certificateNumber: string | null
  readonly organization: string | null
  readonly result: VerificationResult
  readonly note: string | null
  readonly createdAt: number
}

export type NewVerificationRecord = Omit<VerificationRecord, "id" | "createdAt">

/** Данные свидетельства, которые оператор вводит при возврате с поверки. */
export type VerificationOutcome = Omit<NewVerificationRecord, "instrumentId">
