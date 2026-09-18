import { describe, expect, it } from "vitest"
import { buildStatusHistory } from "./history"
import type { InstrumentEvent } from "../../operations/domain/types"
import { DAY } from "../../../test/factories"

const NOON = new Date(2026, 8, 18, 12, 0, 0).getTime()

function event(over: Partial<InstrumentEvent> & Pick<InstrumentEvent, "instrumentId" | "occurredAt" | "kind">) {
  return { statusBefore: null, ...over } as InstrumentEvent
}

describe("история состояний", () => {
  it("отматывает выдачу назад: вчера прибор был в наличии", () => {
    const history = buildStatusHistory(
      [{ id: "i1", status: "CHECKED_OUT" }],
      [event({ instrumentId: "i1", occurredAt: NOON, kind: "CHECK_OUT", statusBefore: "AVAILABLE" })],
      NOON - 2 * DAY,
      NOON,
    )

    expect(history).toHaveLength(3)
    expect(history[0]).toMatchObject({ available: 1, checkedOut: 0, total: 1 })
    expect(history[1]).toMatchObject({ available: 1, checkedOut: 0 })
    expect(history[2]).toMatchObject({ available: 0, checkedOut: 1, total: 1 })
  })

  it("не считает прибор до того, как его завели", () => {
    const history = buildStatusHistory(
      [{ id: "i1", status: "AVAILABLE" }],
      [event({ instrumentId: "i1", occurredAt: NOON, kind: "CREATE", statusBefore: null })],
      NOON - 2 * DAY,
      NOON,
    )

    expect(history[0].total).toBe(0)
    expect(history[1].total).toBe(0)
    expect(history[2].total).toBe(1)
  })

  it("списанный прибор выпадает из общего числа, но не из истории", () => {
    const history = buildStatusHistory(
      [{ id: "i1", status: "WRITTEN_OFF" }],
      [event({ instrumentId: "i1", occurredAt: NOON, kind: "WRITE_OFF", statusBefore: "IN_REPAIR" })],
      NOON - DAY,
      NOON,
    )

    expect(history[0]).toMatchObject({ total: 1, inRepair: 1 })
    expect(history[1]).toMatchObject({ total: 0, inRepair: 0 })
  })

  it("проходит цепочку из нескольких событий за один день", () => {
    const history = buildStatusHistory(
      [{ id: "i1", status: "AVAILABLE" }],
      [
        event({ instrumentId: "i1", occurredAt: NOON - 2 * DAY, kind: "CREATE", statusBefore: null }),
        event({ instrumentId: "i1", occurredAt: NOON - DAY, kind: "CHECK_OUT", statusBefore: "AVAILABLE" }),
        event({ instrumentId: "i1", occurredAt: NOON - DAY + 3600_000, kind: "RETURN", statusBefore: "CHECKED_OUT" }),
      ],
      NOON - 3 * DAY,
      NOON,
    )

    expect(history.map((day) => day.total)).toEqual([0, 1, 1, 1])
    expect(history[2]).toMatchObject({ available: 1, checkedOut: 0 })
  })
})
