import { describe, expect, it } from "vitest"
import { MemoryRepo, SNAPSHOT_VERSION } from "./MemoryRepo"
import { NOW } from "../test/factories"

/**
 * Снимок нужен витрине в браузере: без него всё, что оператор завёл или
 * настроил, пропадает на первом же обновлении страницы. Проверяется, что
 * восстановленный репозиторий отвечает то же, что исходный, — иначе забытое
 * при снятии поле обнаружится не здесь, а на чужом экране.
 */
async function filled(): Promise<MemoryRepo> {
  const repo = new MemoryRepo(() => NOW)
  const shop = await repo.directories.createDepartment({ name: "Цех №1", code: "Ц1" })
  const shelf = await repo.directories.createLocation({
    name: "Шкаф №1", code: null, departmentId: shop.id, note: null,
  })
  const type = await repo.directories.createInstrumentType({
    name: "Манометр", requiresVerification: true, defaultVerificationIntervalMonths: 12,
  })
  const ivan = await repo.directories.createEmployee({
    fullName: "Иванов Иван Иванович", personnelNumber: "1024",
    departmentId: shop.id, position: null, phone: null,
  })
  const created = await repo.instruments.create({
    inventoryNumber: "PR-001", name: "Манометр Fluke", typeId: type.id,
    ownerDepartmentId: shop.id, baseLocationId: shelf.id,
  }, "Петров Пётр Петрович")
  if (!created.ok) throw new Error("прибор не заведён")

  const issued = await repo.operations.execute({
    kind: "CHECK_OUT", instrumentId: created.value.id, operatorName: "Петров Пётр Петрович",
    employeeId: ivan.id, expectedReturnAt: NOW + 86_400_000,
  })
  if (!issued.ok) throw new Error("прибор не выдан")
  await repo.settings.setOperatorName("Петров Пётр Петрович")
  await repo.settings.set("branding", '{"accent":"#0E6F7A"}')
  return repo
}

describe("снимок содержимого", () => {
  it("переживает перенос в новый репозиторий", async () => {
    const source = await filled()
    const restored = new MemoryRepo(() => NOW)
    restored.restore(JSON.parse(JSON.stringify(source.snapshot())))

    expect((await restored.instruments.list()).rows).toEqual((await source.instruments.list()).rows)
    expect((await restored.operations.journal()).rows).toEqual((await source.operations.journal()).rows)
    expect(await restored.directories.departments()).toEqual(await source.directories.departments())
    expect(await restored.directories.locations()).toEqual(await source.directories.locations())
    expect(await restored.directories.employees()).toEqual(await source.directories.employees())
    expect(await restored.directories.instrumentTypes()).toEqual(await source.directories.instrumentTypes())
    expect(await restored.settings.operatorName()).toBe("Петров Пётр Петрович")
    expect(await restored.settings.get("branding")).toBe('{"accent":"#0E6F7A"}')
    expect(await restored.dashboard.counters(NOW)).toEqual(await source.dashboard.counters(NOW))
  })

  it("помечен версией: чужую схему читать нельзя", async () => {
    expect((await filled()).snapshot().version).toBe(SNAPSHOT_VERSION)
  })

  it("восстановление вытесняет прежнее содержимое, а не дополняет его", async () => {
    const source = await filled()
    const other = new MemoryRepo(() => NOW)
    await other.directories.createDepartment({ name: "Лаборатория", code: null })

    other.restore(source.snapshot())

    const departments = await other.directories.departments()
    expect(departments.map((row) => row.name)).toEqual(["Цех №1"])
  })
})
