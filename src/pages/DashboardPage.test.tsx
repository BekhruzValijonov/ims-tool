import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AppProvider } from "../app/AppContext"
import { DashboardPage } from "./DashboardPage"
import { MemoryRepo } from "../data/MemoryRepo"
import type { AppRepo } from "../data/AppRepo"

/**
 * Дашборд собран из семи блоков, и каждый показывает данные из базы. Проверка
 * в том, что ни один из них не остался с демо-цифрами шаблона и что экран
 * переживает пустую базу — в первый день на заводе она именно такая.
 */
async function withRepo(fill?: (repo: AppRepo) => Promise<void>) {
  const repo = new MemoryRepo()
  await repo.settings.setOperatorName("Петров Пётр Петрович")
  await fill?.(repo)

  render(
    <AppProvider repo={ repo }>
      <MemoryRouter>
        <DashboardPage/>
      </MemoryRouter>
    </AppProvider>,
  )
  return repo
}

describe("дашборд", () => {
  it("показывает состояние парка приборов", async () => {
    await withRepo(async (repo) => {
      const shop = await repo.directories.createDepartment({ name: "Цех №3", code: null })
      const shelf = await repo.directories.createLocation({
        name: "Шкаф №4", code: null, departmentId: shop.id, note: null,
      })
      const ivan = await repo.directories.createEmployee({
        fullName: "Иванов Иван Иванович", personnelNumber: "1024",
        departmentId: shop.id, position: null, phone: null,
      })

      for (const number of ["PR-001", "PR-002", "PR-003"]) {
        const created = await repo.instruments.create({
          inventoryNumber: number, name: `Манометр ${ number }`, typeId: null,
          ownerDepartmentId: shop.id, baseLocationId: shelf.id,
        }, "Петров Пётр Петрович")
        if (!created.ok) throw new Error("прибор не заведён")
        if (number === "PR-001") {
          await repo.operations.execute({
            kind: "CHECK_OUT", instrumentId: created.value.id, operatorName: "Петров Пётр Петрович",
            employeeId: ivan.id, expectedReturnAt: Date.now() + 86400000,
          })
        }
      }
    })

    await waitFor(() => expect(screen.getByText("Всего приборов")).toBeInTheDocument())

    const total = screen.getByText("Всего приборов").closest(".MuiCard-root")
    expect(total).toHaveTextContent("3")

    const issued = screen.getByText("Выдано").closest(".MuiCard-root")
    expect(issued).toHaveTextContent("1")

    // Журнал последних операций подтянул инвентарные номера, а не идентификаторы.
    await waitFor(() => expect(screen.getAllByText("PR-001").length).toBeGreaterThan(0))
    expect(screen.getByText("Выдача")).toBeInTheDocument()
    expect(screen.getAllByText("Иванов Иван Иванович").length).toBeGreaterThan(0)
  })

  it("не расходится в двух местах, где показано «всего»", async () => {
    await withRepo(async (repo) => {
      const shop = await repo.directories.createDepartment({ name: "Цех №1", code: null })
      for (const number of ["PR-001", "PR-002", "PR-003"]) {
        const created = await repo.instruments.create({
          inventoryNumber: number, name: "Манометр", typeId: null,
          ownerDepartmentId: shop.id, baseLocationId: null,
        }, "Петров Пётр Петрович")
        if (created.ok && number === "PR-003") {
          await repo.operations.execute({
            kind: "WRITE_OFF", instrumentId: created.value.id,
            operatorName: "Петров Пётр Петрович", reason: "Не подлежит ремонту",
          })
        }
      }
    })

    await waitFor(() => expect(screen.getByText("Всего приборов")).toBeInTheDocument())

    const total = screen.getByText("Всего приборов").closest(".MuiCard-root")
    expect(total).toHaveTextContent("2")

    // Число в центре бублика — то же самое «всего», и расходиться оно не имеет права.
    const park = screen.getByText("Состояние парка").closest(".MuiCard-root")
    expect(park).toHaveTextContent("2")
    expect(park).toHaveTextContent("Списано за всё время: 1")
  })

  it("переживает пустую базу и не показывает выдуманных чисел", async () => {
    await withRepo()

    await waitFor(() => expect(screen.getByText("Всего приборов")).toBeInTheDocument())

    const total = screen.getByText("Всего приборов").closest(".MuiCard-root")
    expect(total).toHaveTextContent("0")
    expect(screen.getByText("Требует внимания")).toBeInTheDocument()
    expect(screen.queryByText("13,277")).not.toBeInTheDocument()
  })
})
