import type { EventKind, OperationKind, ReturnCondition } from "./types"

export const EVENT_LABELS: Readonly<Record<EventKind, string>> = {
  CREATE: "Заведён",
  CHECK_OUT: "Выдача",
  RETURN: "Возврат",
  TRANSFER: "Перемещение",
  REPAIR_SEND: "В ремонт",
  REPAIR_DONE: "Из ремонта",
  VERIFY_SEND: "На поверку",
  VERIFY_DONE: "С поверки",
  WRITE_OFF: "Списание",
  EDIT: "Правка",
}

/** Подписи кнопок операций — повелительное наклонение, как их видит кладовщик. */
export const OPERATION_LABELS: Readonly<Record<OperationKind, string>> = {
  CHECK_OUT: "Выдать",
  RETURN: "Вернуть",
  TRANSFER: "Переместить",
  REPAIR_SEND: "Отправить в ремонт",
  REPAIR_DONE: "Вернуть из ремонта",
  VERIFY_SEND: "Отправить на поверку",
  VERIFY_DONE: "Принять с поверки",
  WRITE_OFF: "Списать",
}

export const CONDITION_LABELS: Readonly<Record<ReturnCondition, string>> = {
  OK: "Исправен",
  DAMAGED: "Повреждён",
  NEEDS_REPAIR: "Требуется ремонт",
}

/** Человеческое объяснение отказа. Кладовщик не должен видеть код ошибки. */
export function operationErrorText(error: { code: string } & Record<string, unknown>): string {
  switch (error.code) {
    case "WRONG_STATUS":
      return "Операция недоступна в текущем состоянии прибора"
    case "WRITTEN_OFF_IS_FINAL":
      return "Прибор списан — с ним больше нельзя работать"
    case "WRITE_OFF_OF_CHECKED_OUT":
      return "Прибор на руках у сотрудника. Сначала оформите возврат"
    case "EMPLOYEE_INACTIVE":
      return "Сотрудник больше не работает — выдать ему прибор нельзя"
    case "EMPLOYEE_NOT_FOUND":
      return "Сотрудник не найден"
    case "INSTRUMENT_NOT_FOUND":
      return "Прибор не найден"
    case "RETURN_DATE_IN_PAST":
      return "Срок возврата уже прошёл — укажите будущую дату"
    case "SAME_LOCATION":
      return "Прибор уже находится там"
    case "REASON_REQUIRED":
      return "Укажите причину"
    case "OPERATOR_NAME_REQUIRED":
      return "Не заполнено ФИО оператора — укажите его в настройках"
    default:
      return "Операция не выполнена"
  }
}
