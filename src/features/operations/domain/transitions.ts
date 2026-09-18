import { err, ok, type Result } from "../../../shared/result"
import type { Instrument, InstrumentStatus } from "../../instruments/domain/types"
import type { NewVerificationRecord } from "../../verification/domain/types"
import type {
  NewInstrumentEvent,
  OperationCommand,
  OperationError,
  OperationKind,
} from "./types"

/**
 * Из каких статусов какая операция разрешена.
 *
 * Таблица одна на всё приложение: по ней гасятся кнопки на экране и по ней же
 * проверяется команда. Двух источников правды про допустимость операции быть не
 * должно — иначе экран предложит то, что база отвергнет.
 */
export const ALLOWED_STATUSES: Readonly<Record<OperationKind, readonly InstrumentStatus[]>> = {
  CHECK_OUT: ["AVAILABLE"],
  RETURN: ["CHECKED_OUT"],
  TRANSFER: ["AVAILABLE", "CHECKED_OUT"],
  REPAIR_SEND: ["AVAILABLE", "CHECKED_OUT"],
  REPAIR_DONE: ["IN_REPAIR"],
  VERIFY_SEND: ["AVAILABLE"],
  VERIFY_DONE: ["IN_VERIFICATION"],
  WRITE_OFF: ["AVAILABLE", "IN_REPAIR", "IN_VERIFICATION"],
}

export function isOperationAllowed(status: InstrumentStatus, kind: OperationKind): boolean {
  return ALLOWED_STATUSES[kind].includes(status)
}

export interface OperationOutcome {
  readonly next: Instrument
  readonly event: NewInstrumentEvent
  /** Заполняется только у VERIFY_DONE: свидетельство пишется той же транзакцией. */
  readonly verification?: NewVerificationRecord
}

/**
 * Единственное место, где решается, каким станет прибор после операции.
 *
 * Функция чистая: ни базы, ни времени изнутри, ни React. Репозиторий только
 * сохраняет её результат одной транзакцией, поэтому проверять поведение можно
 * без запуска приложения.
 *
 * Чего функция не проверяет: существование сотрудника и то, не уволен ли он.
 * Это знание живёт в базе, а не в приборе, поэтому EMPLOYEE_NOT_FOUND и
 * EMPLOYEE_INACTIVE возвращает репозиторий перед вызовом.
 */
export function applyOperation(
  instrument: Instrument,
  command: OperationCommand,
  now: number,
): Result<OperationOutcome, OperationError> {
  if (command.operatorName.trim() === "") {
    return err({ code: "OPERATOR_NAME_REQUIRED" })
  }

  if (instrument.status === "WRITTEN_OFF") {
    return err({ code: "WRITTEN_OFF_IS_FINAL" })
  }

  /* Списание выданного прибора запрещено отдельной ошибкой, а не общим
     «неподходящим статусом»: человеку нужно понять, что сначала возврат, а не
     что «операция недоступна». */
  if (command.kind === "WRITE_OFF" && instrument.status === "CHECKED_OUT") {
    return err({ code: "WRITE_OFF_OF_CHECKED_OUT" })
  }

  const allowed = ALLOWED_STATUSES[command.kind]
  if (!allowed.includes(instrument.status)) {
    return err({
      code: "WRONG_STATUS",
      operation: command.kind,
      actual: instrument.status,
      allowed,
    })
  }

  const base = {
    instrumentId: instrument.id,
    kind: command.kind,
    occurredAt: now,
    statusBefore: instrument.status,
    employeeId: null,
    fromLocationId: instrument.currentLocationId,
    toLocationId: instrument.currentLocationId,
    fromDepartmentId: instrument.currentDepartmentId,
    toDepartmentId: instrument.currentDepartmentId,
    expectedReturnAt: null,
    condition: null,
    reason: null,
    note: command.note ?? null,
    operatorName: command.operatorName,
    payload: null,
  } satisfies Omit<NewInstrumentEvent, "statusAfter">

  switch (command.kind) {
    case "CHECK_OUT": {
      if (command.expectedReturnAt !== null && command.expectedReturnAt < now) {
        return err({ code: "RETURN_DATE_IN_PAST", expectedReturnAt: command.expectedReturnAt })
      }
      const toDepartment = command.toDepartmentId ?? instrument.currentDepartmentId
      return ok({
        next: {
          ...instrument,
          status: "CHECKED_OUT",
          currentEmployeeId: command.employeeId,
          currentDepartmentId: toDepartment,
          issuedAt: now,
          expectedReturnAt: command.expectedReturnAt,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter: "CHECKED_OUT",
          employeeId: command.employeeId,
          toDepartmentId: toDepartment,
          expectedReturnAt: command.expectedReturnAt,
        },
      })
    }

    case "RETURN": {
      /* Повреждённый и требующий ремонта дают один статус, но в журнале
         остаются разными: отчёту по ремонтам нужна причина, а не только факт. */
      const statusAfter: InstrumentStatus = command.condition === "OK" ? "AVAILABLE" : "IN_REPAIR"
      return ok({
        next: {
          ...instrument,
          status: statusAfter,
          currentEmployeeId: null,
          currentDepartmentId: instrument.ownerDepartmentId,
          currentLocationId: instrument.baseLocationId,
          issuedAt: null,
          expectedReturnAt: null,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter,
          employeeId: instrument.currentEmployeeId,
          condition: command.condition,
          toLocationId: instrument.baseLocationId,
          toDepartmentId: instrument.ownerDepartmentId,
        },
      })
    }

    case "TRANSFER": {
      const toDepartment = command.toDepartmentId ?? instrument.currentDepartmentId
      const toLocation = command.toLocationId ?? instrument.currentLocationId
      if (toDepartment === instrument.currentDepartmentId && toLocation === instrument.currentLocationId) {
        return err({ code: "SAME_LOCATION" })
      }
      return ok({
        next: {
          ...instrument,
          currentDepartmentId: toDepartment,
          currentLocationId: toLocation,
          ownerDepartmentId: command.permanent ? toDepartment : instrument.ownerDepartmentId,
          baseLocationId: command.permanent ? toLocation : instrument.baseLocationId,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter: instrument.status,
          employeeId: instrument.currentEmployeeId,
          toDepartmentId: toDepartment,
          toLocationId: toLocation,
          reason: command.reason ?? null,
          payload: { permanent: command.permanent },
        },
      })
    }

    case "REPAIR_SEND": {
      const toLocation = command.toLocationId ?? instrument.currentLocationId
      return ok({
        next: {
          ...instrument,
          status: "IN_REPAIR",
          currentEmployeeId: null,
          currentLocationId: toLocation,
          issuedAt: null,
          expectedReturnAt: null,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter: "IN_REPAIR",
          employeeId: instrument.currentEmployeeId,
          toLocationId: toLocation,
          reason: command.reason ?? null,
        },
      })
    }

    case "REPAIR_DONE":
      return ok({
        next: {
          ...instrument,
          status: "AVAILABLE",
          currentLocationId: instrument.baseLocationId,
          currentDepartmentId: instrument.ownerDepartmentId,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter: "AVAILABLE",
          toLocationId: instrument.baseLocationId,
          toDepartmentId: instrument.ownerDepartmentId,
        },
      })

    case "VERIFY_SEND": {
      const toLocation = command.toLocationId ?? instrument.currentLocationId
      return ok({
        next: {
          ...instrument,
          status: "IN_VERIFICATION",
          currentLocationId: toLocation,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter: "IN_VERIFICATION",
          toLocationId: toLocation,
          payload: { verificationKind: command.verificationKind },
        },
      })
    }

    case "VERIFY_DONE": {
      const { outcome } = command
      /* Непройденная поверка не возвращает прибор в строй: пользоваться им
         нельзя, и следующий же кладовщик выдал бы его, увидев «в наличии». */
      const statusAfter: InstrumentStatus = outcome.result === "PASS" ? "AVAILABLE" : "IN_REPAIR"
      const extends_ = outcome.result === "PASS"
      const isCalibration = outcome.kind === "CALIBRATION"
      return ok({
        next: {
          ...instrument,
          status: statusAfter,
          currentLocationId: instrument.baseLocationId,
          nextVerificationAt: extends_ && !isCalibration ? outcome.validUntil : instrument.nextVerificationAt,
          nextCalibrationAt: extends_ && isCalibration ? outcome.validUntil : instrument.nextCalibrationAt,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter,
          toLocationId: instrument.baseLocationId,
          payload: {
            verificationKind: outcome.kind,
            result: outcome.result,
            certificateNumber: outcome.certificateNumber,
          },
        },
        verification: { ...outcome, instrumentId: instrument.id },
      })
    }

    case "WRITE_OFF": {
      if (command.reason.trim() === "") {
        return err({ code: "REASON_REQUIRED" })
      }
      return ok({
        next: {
          ...instrument,
          status: "WRITTEN_OFF",
          currentEmployeeId: null,
          currentLocationId: null,
          currentDepartmentId: null,
          issuedAt: null,
          expectedReturnAt: null,
          nextVerificationAt: null,
          nextCalibrationAt: null,
          updatedAt: now,
        },
        event: {
          ...base,
          statusAfter: "WRITTEN_OFF",
          toLocationId: null,
          toDepartmentId: null,
          reason: command.reason,
        },
      })
    }
  }
}
