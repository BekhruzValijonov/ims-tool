import { describe, expect, it } from "vitest"
import { DAY, makeInstrument, NOW } from "../../../test/factories"
import { applyOperation } from "./transitions"
import type { OperationCommand } from "./types"

const OPERATOR = "Петров Пётр Петрович"

function run(instrument = makeInstrument(), command: Partial<OperationCommand> & { kind: OperationCommand["kind"] }) {
  return applyOperation(
    instrument,
    { instrumentId: instrument.id, operatorName: OPERATOR, ...command } as OperationCommand,
    NOW,
  )
}

function expectOk<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`ожидался успех, получен отказ: ${ JSON.stringify(result.error) }`)
  return result.value
}

function expectErr<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error("ожидался отказ, операция прошла")
  return result.error
}

describe("выдача", () => {
  it("переводит прибор на сотрудника и записывает срок возврата", () => {
    const due = NOW + 3 * DAY
    const { next, event } = expectOk(run(undefined, {
      kind: "CHECK_OUT",
      employeeId: "emp-1",
      toDepartmentId: "dep-2",
      expectedReturnAt: due,
    }))

    expect(next.status).toBe("CHECKED_OUT")
    expect(next.currentEmployeeId).toBe("emp-1")
    expect(next.currentDepartmentId).toBe("dep-2")
    expect(next.issuedAt).toBe(NOW)
    expect(next.expectedReturnAt).toBe(due)
    expect(next.updatedAt).toBe(NOW)

    expect(event.kind).toBe("CHECK_OUT")
    expect(event.statusBefore).toBe("AVAILABLE")
    expect(event.statusAfter).toBe("CHECKED_OUT")
    expect(event.employeeId).toBe("emp-1")
    expect(event.operatorName).toBe(OPERATOR)
    expect(event.occurredAt).toBe(NOW)
  })

  it("не выдаёт уже выданный прибор", () => {
    const error = expectErr(run(makeInstrument({ status: "CHECKED_OUT", currentEmployeeId: "emp-9" }), {
      kind: "CHECK_OUT",
      employeeId: "emp-1",
      expectedReturnAt: null,
    }))

    expect(error).toEqual({
      code: "WRONG_STATUS",
      operation: "CHECK_OUT",
      actual: "CHECKED_OUT",
      allowed: ["AVAILABLE"],
    })
  })

  it("не принимает срок возврата в прошлом", () => {
    const error = expectErr(run(undefined, {
      kind: "CHECK_OUT",
      employeeId: "emp-1",
      expectedReturnAt: NOW - DAY,
    }))

    expect(error.code).toBe("RETURN_DATE_IN_PAST")
  })

  it("разрешает выдачу без срока возврата", () => {
    const { next } = expectOk(run(undefined, { kind: "CHECK_OUT", employeeId: "emp-1", expectedReturnAt: null }))
    expect(next.expectedReturnAt).toBeNull()
  })
})

describe("возврат", () => {
  const issued = makeInstrument({
    status: "CHECKED_OUT",
    currentEmployeeId: "emp-1",
    currentDepartmentId: "dep-2",
    currentLocationId: "loc-9",
    issuedAt: NOW - DAY,
    expectedReturnAt: NOW + DAY,
  })

  it("исправный прибор возвращается на своё место и снимается с сотрудника", () => {
    const { next, event } = expectOk(run(issued, { kind: "RETURN", condition: "OK" }))

    expect(next.status).toBe("AVAILABLE")
    expect(next.currentEmployeeId).toBeNull()
    expect(next.issuedAt).toBeNull()
    expect(next.expectedReturnAt).toBeNull()
    expect(next.currentLocationId).toBe(issued.baseLocationId)
    expect(next.currentDepartmentId).toBe(issued.ownerDepartmentId)
    expect(event.condition).toBe("OK")
    expect(event.employeeId).toBe("emp-1")
  })

  it("повреждённый прибор уходит в ремонт", () => {
    const { next, event } = expectOk(run(issued, { kind: "RETURN", condition: "DAMAGED" }))
    expect(next.status).toBe("IN_REPAIR")
    expect(event.condition).toBe("DAMAGED")
  })

  it("требующий ремонта прибор уходит в ремонт", () => {
    const { next } = expectOk(run(issued, { kind: "RETURN", condition: "NEEDS_REPAIR" }))
    expect(next.status).toBe("IN_REPAIR")
  })

  it("нельзя вернуть то, что не выдавали", () => {
    const error = expectErr(run(undefined, { kind: "RETURN", condition: "OK" }))
    expect(error).toMatchObject({ code: "WRONG_STATUS", allowed: ["CHECKED_OUT"] })
  })
})

describe("перемещение", () => {
  it("временное меняет только текущее размещение", () => {
    const { next, event } = expectOk(run(undefined, {
      kind: "TRANSFER",
      toDepartmentId: "dep-2",
      toLocationId: "loc-2",
      permanent: false,
    }))

    expect(next.status).toBe("AVAILABLE")
    expect(next.currentDepartmentId).toBe("dep-2")
    expect(next.currentLocationId).toBe("loc-2")
    expect(next.ownerDepartmentId).toBe("dep-1")
    expect(next.baseLocationId).toBe("loc-1")
    expect(event.fromLocationId).toBe("loc-1")
    expect(event.toLocationId).toBe("loc-2")
  })

  it("постоянное меняет и балансовую принадлежность, и место возврата", () => {
    const { next } = expectOk(run(undefined, {
      kind: "TRANSFER",
      toDepartmentId: "dep-2",
      toLocationId: "loc-2",
      permanent: true,
    }))

    expect(next.ownerDepartmentId).toBe("dep-2")
    expect(next.baseLocationId).toBe("loc-2")
  })

  it("не меняет статус выданного прибора", () => {
    const issued = makeInstrument({ status: "CHECKED_OUT", currentEmployeeId: "emp-1" })
    const { next } = expectOk(run(issued, {
      kind: "TRANSFER",
      toDepartmentId: "dep-2",
      toLocationId: "loc-2",
      permanent: false,
    }))

    expect(next.status).toBe("CHECKED_OUT")
    expect(next.currentEmployeeId).toBe("emp-1")
  })

  it("отказывает, когда перемещать некуда", () => {
    const error = expectErr(run(undefined, {
      kind: "TRANSFER",
      toDepartmentId: "dep-1",
      toLocationId: "loc-1",
      permanent: false,
    }))

    expect(error.code).toBe("SAME_LOCATION")
  })
})

describe("ремонт", () => {
  it("забирает прибор у сотрудника", () => {
    const issued = makeInstrument({ status: "CHECKED_OUT", currentEmployeeId: "emp-1", issuedAt: NOW - DAY })
    const { next } = expectOk(run(issued, { kind: "REPAIR_SEND", toLocationId: "loc-repair", reason: "Не держит давление" }))

    expect(next.status).toBe("IN_REPAIR")
    expect(next.currentEmployeeId).toBeNull()
    expect(next.issuedAt).toBeNull()
    expect(next.currentLocationId).toBe("loc-repair")
  })

  it("возвращает прибор в строй на его место", () => {
    const repairing = makeInstrument({ status: "IN_REPAIR", currentLocationId: "loc-repair" })
    const { next } = expectOk(run(repairing, { kind: "REPAIR_DONE" }))

    expect(next.status).toBe("AVAILABLE")
    expect(next.currentLocationId).toBe("loc-1")
  })
})

describe("поверка", () => {
  it("отправляет на поверку только свободный прибор", () => {
    const { next } = expectOk(run(undefined, {
      kind: "VERIFY_SEND",
      verificationKind: "VERIFICATION",
      toLocationId: "loc-metro",
    }))
    expect(next.status).toBe("IN_VERIFICATION")

    const error = expectErr(run(makeInstrument({ status: "CHECKED_OUT" }), {
      kind: "VERIFY_SEND",
      verificationKind: "VERIFICATION",
      toLocationId: null,
    }))
    expect(error).toMatchObject({ code: "WRONG_STATUS", allowed: ["AVAILABLE"] })
  })

  it("успешная поверка продлевает срок и возвращает прибор в строй", () => {
    const until = NOW + 365 * DAY
    const sent = makeInstrument({ status: "IN_VERIFICATION" })
    const { next, verification } = expectOk(run(sent, {
      kind: "VERIFY_DONE",
      outcome: {
        kind: "VERIFICATION",
        performedAt: NOW,
        validUntil: until,
        certificateNumber: "СП-2026/114",
        organization: "Узстандарт",
        result: "PASS",
        note: null,
      },
    }))

    expect(next.status).toBe("AVAILABLE")
    expect(next.nextVerificationAt).toBe(until)
    expect(next.nextCalibrationAt).toBeNull()
    expect(verification?.certificateNumber).toBe("СП-2026/114")
    expect(verification?.instrumentId).toBe(sent.id)
  })

  it("калибровка кладёт срок в свою колонку", () => {
    const until = NOW + 180 * DAY
    const { next } = expectOk(run(makeInstrument({ status: "IN_VERIFICATION" }), {
      kind: "VERIFY_DONE",
      outcome: {
        kind: "CALIBRATION",
        performedAt: NOW,
        validUntil: until,
        certificateNumber: null,
        organization: null,
        result: "PASS",
        note: null,
      },
    }))

    expect(next.nextCalibrationAt).toBe(until)
    expect(next.nextVerificationAt).toBeNull()
  })

  it("непройденная поверка отправляет прибор в ремонт, а не в строй", () => {
    const { next } = expectOk(run(makeInstrument({ status: "IN_VERIFICATION" }), {
      kind: "VERIFY_DONE",
      outcome: {
        kind: "VERIFICATION",
        performedAt: NOW,
        validUntil: null,
        certificateNumber: null,
        organization: null,
        result: "FAIL",
        note: "Погрешность выше допустимой",
      },
    }))

    expect(next.status).toBe("IN_REPAIR")
    expect(next.nextVerificationAt).toBeNull()
  })
})

describe("списание", () => {
  it("списывает свободный прибор и обнуляет размещение", () => {
    const { next } = expectOk(run(undefined, { kind: "WRITE_OFF", reason: "Не подлежит ремонту" }))

    expect(next.status).toBe("WRITTEN_OFF")
    expect(next.currentEmployeeId).toBeNull()
    expect(next.currentLocationId).toBeNull()
    expect(next.nextVerificationAt).toBeNull()
  })

  it("не даёт списать прибор, который сейчас на руках", () => {
    const issued = makeInstrument({ status: "CHECKED_OUT", currentEmployeeId: "emp-1" })
    const error = expectErr(run(issued, { kind: "WRITE_OFF", reason: "Утерян" }))

    expect(error.code).toBe("WRITE_OFF_OF_CHECKED_OUT")
  })

  it("требует причину списания", () => {
    const error = expectErr(run(undefined, { kind: "WRITE_OFF", reason: "   " }))
    expect(error.code).toBe("REASON_REQUIRED")
  })

  it("списанный прибор больше ничего не принимает", () => {
    const written = makeInstrument({ status: "WRITTEN_OFF" })
    const error = expectErr(run(written, { kind: "CHECK_OUT", employeeId: "emp-1", expectedReturnAt: null }))

    expect(error.code).toBe("WRITTEN_OFF_IS_FINAL")
  })
})

describe("подпись оператора", () => {
  it("без ФИО операция не проходит", () => {
    const result = applyOperation(
      makeInstrument(),
      { kind: "REPAIR_DONE", instrumentId: "inst-1", operatorName: "  " },
      NOW,
    )
    expect(expectErr(result).code).toBe("OPERATOR_NAME_REQUIRED")
  })
})
