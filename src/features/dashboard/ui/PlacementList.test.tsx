import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PlacementList } from "./PlacementList"
import type { DepartmentSummary, LocationSummary } from "../../directories/domain/types"

/**
 * Места хранения спрятаны под подразделением, и заметить, что они перестали
 * появляться вовсе, по одному взгляду на дашборд нельзя: свёрнутый список
 * выглядит одинаково и с местами, и без них.
 */

function department(id: string, name: string, total: number): DepartmentSummary {
  return { departmentId: id, name, total, available: total, checkedOut: 0, inRepair: 0, inVerification: 0 }
}

function place(id: string, name: string, departmentId: string | null, total: number): LocationSummary {
  return { locationId: id, name, departmentId, total }
}

const DEPARTMENTS = [department("shop", "Цех №1", 9), department("lab", "Лаборатория", 0)]
const LOCATIONS = [place("shelf", "Шкаф №1", "shop", 5), place("bench", "Верстак", "shop", 4)]

describe("где приборы сейчас", () => {
  it("свёрнут: показывает подразделения с их итогом", () => {
    render(<PlacementList departments={ DEPARTMENTS } locations={ LOCATIONS }/>)

    expect(screen.getByRole("button", { name: /Цех №1/ })).toHaveTextContent("9")
    expect(screen.queryByText("Шкаф №1")).not.toBeInTheDocument()
  })

  it("раскрывает места хранения подразделения", async () => {
    render(<PlacementList departments={ DEPARTMENTS } locations={ LOCATIONS }/>)

    await userEvent.click(screen.getByRole("button", { name: /Цех №1/ }))

    expect(screen.getByText("Шкаф №1")).toBeInTheDocument()
    expect(screen.getByText("Верстак")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Цех №1/ })).toHaveAttribute("aria-expanded", "true")
  })

  it("подразделение без мест хранения не притворяется раскрывающимся", () => {
    render(<PlacementList departments={ DEPARTMENTS } locations={ LOCATIONS }/>)

    expect(screen.queryByRole("button", { name: /Лаборатория/ })).not.toBeInTheDocument()
    expect(screen.getByText("Лаборатория")).toBeInTheDocument()
  })

  it("места без подразделения собираются в отдельную группу", async () => {
    render(
      <PlacementList
        departments={ DEPARTMENTS }
        locations={ [...LOCATIONS, place("common", "Общий склад", null, 3)] }
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Вне подразделений/ }))

    expect(screen.getByText("Общий склад")).toBeInTheDocument()
  })
})
