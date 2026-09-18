import { beforeEach, describe, expect, it } from "vitest"
import type { AppRepo } from "./AppRepo"
import { DAY, NOW } from "../test/factories"
import type { Instrument } from "../features/instruments/domain/types"

/**
 * Один и тот же набор требований для всех реализаций порта.
 *
 * Смысл в том, что MemoryRepo (браузер, тесты) и SqliteRepo (устройство)
 * обязаны быть неотличимы для вызывающего кода. Проверять их разными тестами
 * нельзя: реализации разъедутся, и ошибка вылезет на устройстве — там, где её
 * дороже всего ловить.
 */
export type RepoFactory = (clock: () => number) => Promise<AppRepo>

export function describeRepoContract(name: string, createRepo: RepoFactory): void {
  describe(name, () => {
    let repo: AppRepo
    let now = NOW

    /** Справочники, нужные почти каждому тесту. */
    let shopId: string
    let labId: string
    let shelfId: string
    let repairBenchId: string
    let ivanId: string
    let typeId: string

    const OPERATOR = "Петров Пётр Петрович"

    async function addInstrument(over: Partial<{ inventoryNumber: string; name: string }> = {}) {
      const result = await repo.instruments.create({
        inventoryNumber: over.inventoryNumber ?? "PR-000123",
        name: over.name ?? "Манометр",
        typeId,
        ownerDepartmentId: shopId,
        baseLocationId: shelfId,
      }, OPERATOR)
      if (!result.ok) throw new Error(`не удалось завести прибор: ${ JSON.stringify(result.error) }`)
      return result.value
    }

    async function execute(command: Parameters<AppRepo["operations"]["execute"]>[0]) {
      const result = await repo.operations.execute(command)
      if (!result.ok) throw new Error(`операция отклонена: ${ JSON.stringify(result.error) }`)
      return result.value
    }

    beforeEach(async () => {
      now = NOW
      repo = await createRepo(() => now)
      const shop = await repo.directories.createDepartment({ name: "Цех №3", code: "C3" })
      const lab = await repo.directories.createDepartment({ name: "Лаборатория", code: null })
      shopId = shop.id
      labId = lab.id
      const shelf = await repo.directories.createLocation({
        name: "Шкаф №4", code: null, departmentId: shopId, note: null,
      })
      const bench = await repo.directories.createLocation({
        name: "Ремонтный участок", code: null, departmentId: null, note: null,
      })
      shelfId = shelf.id
      repairBenchId = bench.id
      const ivan = await repo.directories.createEmployee({
        fullName: "Иванов Иван Иванович", personnelNumber: "1024",
        departmentId: shopId, position: "Слесарь КИПиА", phone: null,
      })
      ivanId = ivan.id
      const type = await repo.directories.createInstrumentType({
        name: "Манометр", requiresVerification: true, defaultVerificationIntervalMonths: 12,
      })
      typeId = type.id
    })

    describe("реестр приборов", () => {
      it("новый прибор доступен и стоит на своём месте", async () => {
        const instrument = await addInstrument()

        expect(instrument.status).toBe("AVAILABLE")
        expect(instrument.currentLocationId).toBe(shelfId)
        expect(instrument.currentDepartmentId).toBe(shopId)
        expect(instrument.currentEmployeeId).toBeNull()

        const page = await repo.instruments.list()
        expect(page.total).toBe(1)
        expect(page.rows[0].inventoryNumber).toBe("PR-000123")
      })

      it("заведение прибора попадает в журнал с подписью оператора", async () => {
        const instrument = await addInstrument()
        const history = await repo.operations.historyOf(instrument.id)

        expect(history).toHaveLength(1)
        expect(history[0].kind).toBe("CREATE")
        expect(history[0].operatorName).toBe(OPERATOR)
        expect(history[0].statusAfter).toBe("AVAILABLE")
      })

      it("не заводит второй прибор с тем же инвентарным номером", async () => {
        await addInstrument()
        const again = await repo.instruments.create({
          inventoryNumber: "PR-000123", name: "Другой манометр",
          typeId, ownerDepartmentId: labId, baseLocationId: shelfId,
        }, OPERATOR)

        expect(again.ok).toBe(false)
        if (!again.ok) expect(again.error.code).toBe("DUPLICATE_INVENTORY_NUMBER")
      })

      it("находит прибор по инвентарному номеру", async () => {
        await addInstrument()
        const found = await repo.instruments.getByInventoryNumber("PR-000123")
        expect(found?.name).toBe("Манометр")
        expect(await repo.instruments.getByInventoryNumber("PR-999")).toBeNull()
      })

      it("правка паспорта пишет в журнал, что именно изменилось", async () => {
        const instrument = await addInstrument()
        now += DAY
        const updated = await repo.instruments.update(instrument.id, { name: "Манометр МП-100" }, OPERATOR)

        expect(updated.ok).toBe(true)
        const history = await repo.operations.historyOf(instrument.id)
        const edit = history.find((event) => event.kind === "EDIT")
        expect(edit).toBeDefined()
        expect(edit?.payload).toMatchObject({ name: { from: "Манометр", to: "Манометр МП-100" } })
      })

      it("фильтрует список по статусу и по сотруднику", async () => {
        const first = await addInstrument({ inventoryNumber: "PR-001" })
        await addInstrument({ inventoryNumber: "PR-002" })
        await execute({
          kind: "CHECK_OUT", instrumentId: first.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: now + DAY,
        })

        const issued = await repo.instruments.list({ statuses: ["CHECKED_OUT"] })
        expect(issued.total).toBe(1)
        expect(issued.rows[0].id).toBe(first.id)

        const ofIvan = await repo.instruments.list({ employeeId: ivanId })
        expect(ofIvan.total).toBe(1)

        const available = await repo.instruments.list({ statuses: ["AVAILABLE"] })
        expect(available.total).toBe(1)
        expect(available.rows[0].inventoryNumber).toBe("PR-002")
      })

      it("ищет по названию, инвентарному и серийному номеру", async () => {
        await addInstrument({ inventoryNumber: "PR-001", name: "Манометр" })
        await addInstrument({ inventoryNumber: "PR-002", name: "Мультиметр" })

        expect((await repo.instruments.list({ text: "мульти" })).total).toBe(1)
        expect((await repo.instruments.list({ text: "PR-00" })).total).toBe(2)
      })

      it("ищет сотрудника по русской фамилии в любом регистре", async () => {
        expect(await repo.directories.employees({ text: "иванов" })).toHaveLength(1)
        expect(await repo.directories.employees({ text: "ИВАНОВ" })).toHaveLength(1)
        expect(await repo.directories.employees({ text: "петров" })).toHaveLength(0)
      })

      it("обновляет поиск после переименования", async () => {
        const instrument = await addInstrument({ name: "Манометр" })
        await repo.instruments.update(instrument.id, { name: "Термометр" }, OPERATOR)

        expect((await repo.instruments.list({ text: "термо" })).total).toBe(1)
        expect((await repo.instruments.list({ text: "маноме" })).total).toBe(0)
      })
    })

    describe("движение прибора", () => {
      it("проходит цикл выдача — возврат с повреждением — ремонт — в строй", async () => {
        const instrument = await addInstrument()

        now += DAY
        const issued = await execute({
          kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
          employeeId: ivanId, toDepartmentId: labId, expectedReturnAt: now + 2 * DAY,
        })
        expect(issued.instrument.status).toBe("CHECKED_OUT")
        expect(issued.instrument.currentEmployeeId).toBe(ivanId)
        expect(issued.instrument.currentDepartmentId).toBe(labId)

        now += DAY
        const returned = await execute({
          kind: "RETURN", instrumentId: instrument.id, operatorName: OPERATOR, condition: "DAMAGED",
        })
        expect(returned.instrument.status).toBe("IN_REPAIR")
        expect(returned.instrument.currentEmployeeId).toBeNull()

        now += DAY
        const repaired = await execute({
          kind: "REPAIR_DONE", instrumentId: instrument.id, operatorName: OPERATOR,
        })
        expect(repaired.instrument.status).toBe("AVAILABLE")
        expect(repaired.instrument.currentLocationId).toBe(shelfId)

        const history = await repo.operations.historyOf(instrument.id)
        expect(history.map((event) => event.kind)).toEqual(["REPAIR_DONE", "RETURN", "CHECK_OUT", "CREATE"])
      })

      it("не выдаёт прибор уволенному сотруднику", async () => {
        const instrument = await addInstrument()
        await repo.directories.setEmployeeActive(ivanId, false)

        const result = await repo.operations.execute({
          kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: null,
        })

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe("EMPLOYEE_INACTIVE")
      })

      it("отказ операции ничего не меняет в базе", async () => {
        const instrument = await addInstrument()
        await execute({
          kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: null,
        })

        const rejected = await repo.operations.execute({
          kind: "WRITE_OFF", instrumentId: instrument.id, operatorName: OPERATOR, reason: "Утерян",
        })
        expect(rejected.ok).toBe(false)

        const after = await repo.instruments.getById(instrument.id)
        expect(after?.status).toBe("CHECKED_OUT")
        const history = await repo.operations.historyOf(instrument.id)
        expect(history.some((event) => event.kind === "WRITE_OFF")).toBe(false)
      })

      it("перемещение насовсем меняет и место возврата", async () => {
        const instrument = await addInstrument()
        const moved = await execute({
          kind: "TRANSFER", instrumentId: instrument.id, operatorName: OPERATOR,
          toDepartmentId: labId, toLocationId: repairBenchId, permanent: true,
        })

        expect(moved.instrument.ownerDepartmentId).toBe(labId)
        expect(moved.instrument.baseLocationId).toBe(repairBenchId)
        expect(moved.event.fromLocationId).toBe(shelfId)
        expect(moved.event.toLocationId).toBe(repairBenchId)
      })

      it("показывает, что сейчас на руках у сотрудника", async () => {
        const first = await addInstrument({ inventoryNumber: "PR-001" })
        const second = await addInstrument({ inventoryNumber: "PR-002" })
        for (const instrument of [first, second]) {
          await execute({
            kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
            employeeId: ivanId, expectedReturnAt: null,
          })
        }

        const onHands = await repo.directories.instrumentsOf(ivanId)
        expect(onHands.map((row: Instrument) => row.inventoryNumber).sort()).toEqual(["PR-001", "PR-002"])
      })
    })

    describe("поверка", () => {
      it("свидетельство продлевает срок и возвращает прибор в строй", async () => {
        const instrument = await addInstrument()
        await execute({
          kind: "VERIFY_SEND", instrumentId: instrument.id, operatorName: OPERATOR,
          verificationKind: "VERIFICATION", toLocationId: null,
        })

        const validUntil = now + 365 * DAY
        const done = await execute({
          kind: "VERIFY_DONE", instrumentId: instrument.id, operatorName: OPERATOR,
          outcome: {
            kind: "VERIFICATION", performedAt: now, validUntil,
            certificateNumber: "СП-2026/114", organization: "Узстандарт", result: "PASS", note: null,
          },
        })

        expect(done.instrument.status).toBe("AVAILABLE")
        expect(done.instrument.nextVerificationAt).toBe(validUntil)
        expect(done.verification?.certificateNumber).toBe("СП-2026/114")

        const records = await repo.verification.listFor(instrument.id)
        expect(records).toHaveLength(1)
      })

      it("находит приборы с истекающей поверкой", async () => {
        const soon = await addInstrument({ inventoryNumber: "PR-001" })
        const later = await addInstrument({ inventoryNumber: "PR-002" })

        await repo.verification.add({
          instrumentId: soon.id, kind: "VERIFICATION", performedAt: now - 300 * DAY,
          validUntil: now + 10 * DAY, certificateNumber: null, organization: null,
          result: "PASS", note: null,
        })
        await repo.verification.add({
          instrumentId: later.id, kind: "VERIFICATION", performedAt: now,
          validUntil: now + 300 * DAY, certificateNumber: null, organization: null,
          result: "PASS", note: null,
        })

        const due = await repo.verification.dueBefore(now + 30 * DAY)
        expect(due.map((row: Instrument) => row.inventoryNumber)).toEqual(["PR-001"])
      })
    })

    describe("журнал", () => {
      it("фильтруется по виду операции и по периоду", async () => {
        const instrument = await addInstrument()
        now += DAY
        await execute({
          kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: null,
        })
        const issuedAt = now
        now += 5 * DAY
        await execute({
          kind: "RETURN", instrumentId: instrument.id, operatorName: OPERATOR, condition: "OK",
        })

        const onlyIssues = await repo.operations.journal({ kinds: ["CHECK_OUT"] })
        expect(onlyIssues.total).toBe(1)

        const window = await repo.operations.journal({ from: issuedAt - 1, to: issuedAt + 1 })
        expect(window.total).toBe(1)
        expect(window.rows[0].kind).toBe("CHECK_OUT")

        const all = await repo.operations.journal()
        expect(all.rows[0].kind).toBe("RETURN")
      })

      it("выдаёт страницами", async () => {
        for (let i = 0; i < 5; i += 1) await addInstrument({ inventoryNumber: `PR-00${ i }` })

        const first = await repo.operations.journal({ page: 0, pageSize: 2 })
        expect(first.rows).toHaveLength(2)
        expect(first.total).toBe(5)

        const last = await repo.operations.journal({ page: 2, pageSize: 2 })
        expect(last.rows).toHaveLength(1)
      })
    })

    describe("дашборд", () => {
      it("считает плитки, включая просрочку возврата", async () => {
        const overdue = await addInstrument({ inventoryNumber: "PR-001" })
        await addInstrument({ inventoryNumber: "PR-002" })
        await execute({
          kind: "CHECK_OUT", instrumentId: overdue.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: now + DAY,
        })

        now += 3 * DAY
        const counters = await repo.dashboard.counters(now)

        expect(counters.total).toBe(2)
        expect(counters.checkedOut).toBe(1)
        expect(counters.available).toBe(1)
        expect(counters.overdue).toBe(1)
      })

      it("не считает списанные приборы живыми", async () => {
        const instrument = await addInstrument()
        await execute({
          kind: "WRITE_OFF", instrumentId: instrument.id, operatorName: OPERATOR, reason: "Не подлежит ремонту",
        })

        const counters = await repo.dashboard.counters(now)
        expect(counters.total).toBe(0)
        expect(counters.writtenOff).toBe(1)
      })

      it("строит движение по дням без пропусков", async () => {
        const instrument = await addInstrument()
        await execute({
          kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: null,
        })
        now += 2 * DAY
        await execute({
          kind: "RETURN", instrumentId: instrument.id, operatorName: OPERATOR, condition: "OK",
        })

        const flow = await repo.dashboard.flow(NOW, now)
        expect(flow).toHaveLength(3)
        expect(flow[0].checkedOut).toBe(1)
        expect(flow[1].checkedOut).toBe(0)
        expect(flow[2].returned).toBe(1)
      })

      it("восстанавливает вчерашнее состояние по журналу", async () => {
        const instrument = await addInstrument()
        const startedAt = now
        now += 2 * DAY
        await execute({
          kind: "CHECK_OUT", instrumentId: instrument.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: null,
        })

        const history = await repo.dashboard.statusHistory(startedAt, now)

        expect(history).toHaveLength(3)
        expect(history[0]).toMatchObject({ total: 1, available: 1, checkedOut: 0 })
        expect(history[2]).toMatchObject({ total: 1, available: 0, checkedOut: 1 })
      })

      it("сводит приборы по местам хранения", async () => {
        await addInstrument({ inventoryNumber: "PR-001" })
        await addInstrument({ inventoryNumber: "PR-002" })

        const summary = await repo.directories.locationSummary()
        const shelf = summary.find((row) => row.locationId === shelfId)
        const bench = summary.find((row) => row.locationId === repairBenchId)

        expect(shelf?.total).toBe(2)
        expect(bench?.total).toBe(0)
      })

      it("сводит приборы по подразделениям", async () => {
        await addInstrument({ inventoryNumber: "PR-001" })
        const second = await addInstrument({ inventoryNumber: "PR-002" })
        await execute({
          kind: "CHECK_OUT", instrumentId: second.id, operatorName: OPERATOR,
          employeeId: ivanId, expectedReturnAt: null,
        })

        const summary = await repo.directories.departmentSummary()
        const shop = summary.find((row) => row.departmentId === shopId)
        expect(shop).toMatchObject({ total: 2, available: 1, checkedOut: 1 })

        const lab = summary.find((row) => row.departmentId === labId)
        expect(lab).toMatchObject({ total: 0 })
      })
    })

    describe("настройки", () => {
      it("запоминает ФИО оператора", async () => {
        expect(await repo.settings.operatorName()).toBeNull()
        await repo.settings.setOperatorName("  Сидоров Сидор Сидорович  ")
        expect(await repo.settings.operatorName()).toBe("Сидоров Сидор Сидорович")
      })

      it("хранит произвольную настройку и перезаписывает её", async () => {
        expect(await repo.settings.get("branding")).toBeNull()
        await repo.settings.set("branding", '{"accent":"#1B222B"}')
        expect(await repo.settings.get("branding")).toBe('{"accent":"#1B222B"}')

        await repo.settings.set("branding", '{"accent":"#0E6F7A"}')
        expect(await repo.settings.get("branding")).toBe('{"accent":"#0E6F7A"}')
      })

      it("не путает настройки между собой", async () => {
        await repo.settings.set("branding", "оформление")
        await repo.settings.setOperatorName("Сидоров Сидор Сидорович")
        expect(await repo.settings.get("branding")).toBe("оформление")
        expect(await repo.settings.operatorName()).toBe("Сидоров Сидор Сидорович")
      })
    })
  })
}
