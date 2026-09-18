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
/** Ячейка приборной панели: слово «Выдано» встречается и в легенде графика. */
function gauge(key: string): HTMLElement | null {
  return document.querySelector(`[data-gauge="${ key }"]`)
}

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

    await waitFor(() => expect(gauge("total")).not.toBeNull())

    expect(gauge("total")).toHaveTextContent("3")
    expect(gauge("checked-out")).toHaveTextContent("1")
    expect(gauge("available")).toHaveTextContent("2")

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

    await waitFor(() => expect(gauge("total")).not.toBeNull())

    expect(gauge("total")).toHaveTextContent("2")

    // Число в центре бублика — то же самое «всего», и расходиться оно не имеет права.
    const park = screen.getByText("Состояние парка").closest(".MuiPaper-root")
    expect(park).toHaveTextContent("2")
    expect(park).toHaveTextContent("Списано за всё время: 1")
  })

  it("на пустой базе показывает порядок действий, а не нули и пустые графики", async () => {
    await withRepo()

    await waitFor(() =>
      expect(screen.getByText("В базе пока нет ни одного прибора")).toBeInTheDocument())

    // Ни счётчиков, ни демо-чисел шаблона.
    expect(gauge("total")).toBeNull()
    expect(screen.queryByText("13,277")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Добавить прибор" })).toBeInTheDocument()
  })
})
