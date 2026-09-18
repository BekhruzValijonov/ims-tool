import type { InstrumentStatus } from "../../instruments/domain/types"
import type { VerificationKind, VerificationOutcome } from "../../verification/domain/types"

/**
 * Вид записи журнала.
 *
 * Совпадает с набором операций один в один плюс CREATE и EDIT: по журналу
 * должно быть видно не только движение, но и то, что прибор вообще завели или
 * поправили его паспорт.
 */
export type EventKind =
  | "CREATE"
  | "CHECK_OUT"
  | "RETURN"
  | "TRANSFER"
  | "REPAIR_SEND"
  | "REPAIR_DONE"
  | "VERIFY_SEND"
  | "VERIFY_DONE"
  | "WRITE_OFF"
  | "EDIT"

/**
 * Состояние прибора при возврате.
 *
 * DAMAGED и NEEDS_REPAIR дают один и тот же статус IN_REPAIR. Различие нужно
 * отчёту по ремонтам: «повреждён при эксплуатации» и «вышел из строя» — разные
 * причины, хотя прибор в обоих случаях едет к слесарю.
 */
export type ReturnCondition = "OK" | "DAMAGED" | "NEEDS_REPAIR"

export interface InstrumentEvent {
  readonly id: string
  readonly instrumentId: string
  readonly kind: EventKind
  readonly occurredAt: number
  readonly statusBefore: InstrumentStatus | null
  readonly statusAfter: InstrumentStatus | null
  readonly employeeId: string | null
  readonly fromLocationId: string | null
  readonly toLocationId: string | null
  readonly fromDepartmentId: string | null
  readonly toDepartmentId: string | null
  readonly expectedReturnAt: number | null
  readonly condition: ReturnCondition | null
  readonly reason: string | null
  readonly note: string | null
  /**
   * ФИО того, кто внёс запись — строкой, а не ссылкой.
   *
   * Оператор не сущность базы, а подпись. Если ФИО в настройках поменяют, уже
   * сделанные записи обязаны остаться подписанными тем, кто их сделал.
   */
  readonly operatorName: string
  /** Заполняется только у EDIT: что именно поменяли в карточке. */
  readonly payload: Readonly<Record<string, unknown>> | null
}

export type NewInstrumentEvent = Omit<InstrumentEvent, "id">

/** Операции, меняющие состояние прибора. CREATE и EDIT сюда не входят — они не движение. */
export type OperationKind = Exclude<EventKind, "CREATE" | "EDIT">

interface CommandBase {
  readonly instrumentId: string
  readonly operatorName: string
  readonly note?: string | null
}

/**
 * Команда операции.
 *
 * Одно размеченное объединение, а не шесть методов репозитория: новая операция
 * — это новый вариант здесь и новая ветка в чистой функции переходов, без
 * правки интерфейса базы.
 */
export type OperationCommand =
  | (CommandBase & {
      readonly kind: "CHECK_OUT"
      readonly employeeId: string
      readonly toDepartmentId?: string | null
      readonly expectedReturnAt: number | null
    })
  | (CommandBase & { readonly kind: "RETURN"; readonly condition: ReturnCondition })
  | (CommandBase & {
      readonly kind: "TRANSFER"
      readonly toDepartmentId: string | null
      readonly toLocationId: string | null
      /** Взведён — прибор передан насовсем: меняется и балансовая принадлежность, и место возврата. */
      readonly permanent: boolean
      readonly reason?: string | null
    })
  | (CommandBase & {
      readonly kind: "REPAIR_SEND"
      readonly toLocationId: string | null
      readonly reason?: string | null
    })
  | (CommandBase & { readonly kind: "REPAIR_DONE" })
  | (CommandBase & {
      readonly kind: "VERIFY_SEND"
      readonly verificationKind: VerificationKind
      readonly toLocationId: string | null
    })
  | (CommandBase & { readonly kind: "VERIFY_DONE"; readonly outcome: VerificationOutcome })
  | (CommandBase & { readonly kind: "WRITE_OFF"; readonly reason: string })

export type OperationError =
  | { readonly code: "INSTRUMENT_NOT_FOUND"; readonly instrumentId: string }
  | {
      readonly code: "WRONG_STATUS"
      readonly operation: OperationKind
      readonly actual: InstrumentStatus
      readonly allowed: readonly InstrumentStatus[]
    }
  | { readonly code: "WRITTEN_OFF_IS_FINAL" }
  | { readonly code: "WRITE_OFF_OF_CHECKED_OUT" }
  | { readonly code: "OPERATOR_NAME_REQUIRED" }
  | { readonly code: "EMPLOYEE_NOT_FOUND"; readonly employeeId: string }
  | { readonly code: "EMPLOYEE_INACTIVE"; readonly employeeId: string }
  | { readonly code: "RETURN_DATE_IN_PAST"; readonly expectedReturnAt: number }
  | { readonly code: "SAME_LOCATION" }
  | { readonly code: "REASON_REQUIRED" }

export interface JournalQuery {
  readonly kinds?: readonly EventKind[]
  readonly instrumentId?: string
  readonly employeeId?: string
  readonly departmentId?: string
  readonly from?: number
  readonly to?: number
  readonly page?: number
  readonly pageSize?: number
}
