import type { AppRepo } from "./AppRepo"
import type { Instrument } from "../features/instruments/domain/types"
import type { Employee, StorageLocation } from "../features/directories/domain/types"

/**
 * Витрина для разработки.
 *
 * Пустое приложение нечем проверять: на пустом дашборде не видно ни графиков,
 * ни просрочки, ни того, как выглядит журнал за месяц. Витрина сеет завод
 * среднего размера с настоящей историей за последние полтора месяца.
 *
 * В релиз этот модуль не попадает: он грузится динамическим импортом только
 * при MODE === "development".
 */

const DAY = 24 * 60 * 60 * 1000
const OPERATOR = "Валиев Бекзод Анварович"

/** Детерминированный генератор: витрина должна выглядеть одинаково от запуска к запуску. */
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEPARTMENTS = [
  "Цех №1", "Цех №2", "Цех №3", "Лаборатория", "Метрология", "Ремонтный участок",
]

const LOCATIONS: readonly { name: string; department: string | null }[] = [
  { name: "Главный склад", department: null },
  { name: "Шкаф №1", department: "Цех №1" },
  { name: "Стеллаж А", department: "Цех №2" },
  { name: "Шкаф №4", department: "Цех №3" },
  { name: "Лабораторный шкаф", department: "Лаборатория" },
  { name: "Комната метрологии", department: "Метрология" },
  { name: "Верстак ремонта", department: "Ремонтный участок" },
]

const EMPLOYEES: readonly { name: string; department: string; position: string }[] = [
  { name: "Иванов Иван Иванович", department: "Цех №1", position: "Слесарь КИПиА" },
  { name: "Петров Пётр Сергеевич", department: "Цех №2", position: "Мастер участка" },
  { name: "Сидоров Алексей Львович", department: "Цех №3", position: "Наладчик" },
  { name: "Каримова Дилноза Рустамовна", department: "Лаборатория", position: "Инженер-лаборант" },
  { name: "Юсупов Шухрат Азизович", department: "Метрология", position: "Инженер-метролог" },
  { name: "Ким Сергей Владимирович", department: "Ремонтный участок", position: "Слесарь-ремонтник" },
  { name: "Абдуллаева Нилуфар Бахтиёровна", department: "Лаборатория", position: "Техник" },
  { name: "Раджабов Отабек Фарходович", department: "Цех №1", position: "Электромонтёр" },
]

const TYPES: readonly { name: string; verification: boolean; months: number | null }[] = [
  { name: "Манометр", verification: true, months: 12 },
  { name: "Мультиметр", verification: true, months: 12 },
  { name: "Термометр", verification: true, months: 24 },
  { name: "Штангенциркуль", verification: true, months: 12 },
  { name: "Ключ динамометрический", verification: true, months: 12 },
  { name: "Осциллограф", verification: true, months: 12 },
  { name: "Набор отвёрток", verification: false, months: null },
  { name: "Уровень строительный", verification: false, months: null },
]

const MANUFACTURERS = ["Fluke", "Testo", "ЭКСИС", "Bosch", "Мера", "Теплоприбор"]

export async function seedShowcaseIfEmpty(
  repo: AppRepo,
  travel: (timestamp: number | null) => void,
): Promise<void> {
  const existing = await repo.instruments.list({ pageSize: 1 })
  if (existing.total > 0) return
  await seedShowcase(repo, travel)
}

export async function seedShowcase(
  repo: AppRepo,
  travel: (timestamp: number | null) => void,
): Promise<void> {
  const random = makeRandom(20260918)
  const today = Date.now()

  try {
    // ——— справочники ———
    travel(today - 400 * DAY)
    const departments = new Map<string, string>()
    for (const name of DEPARTMENTS) {
      const created = await repo.directories.createDepartment({ name, code: null })
      departments.set(name, created.id)
    }

    const locations: StorageLocation[] = []
    for (const item of LOCATIONS) {
      locations.push(await repo.directories.createLocation({
        name: item.name,
        code: null,
        departmentId: item.department ? departments.get(item.department) ?? null : null,
        note: null,
      }))
    }
    const locationOf = (department: string) =>
      locations.find((location) => location.departmentId === departments.get(department))
      ?? locations[0]
    const repairBench = locations.find((location) => location.name === "Верстак ремонта") ?? locations[0]
    const metrologyRoom = locations.find((location) => location.name === "Комната метрологии") ?? locations[0]

    const employees: Employee[] = []
    for (const item of EMPLOYEES) {
      employees.push(await repo.directories.createEmployee({
        fullName: item.name,
        personnelNumber: String(1000 + employees.length * 7),
        departmentId: departments.get(item.department) ?? null,
        position: item.position,
        phone: null,
      }))
    }

    const types = new Map<string, { id: string; verification: boolean }>()
    for (const item of TYPES) {
      const created = await repo.directories.createInstrumentType({
        name: item.name,
        requiresVerification: item.verification,
        defaultVerificationIntervalMonths: item.months,
      })
      types.set(item.name, { id: created.id, verification: item.verification })
    }

    // ——— реестр ———
    const workshops = DEPARTMENTS.filter((name) => name !== "Ремонтный участок")
    const instruments: Instrument[] = []
    for (let i = 0; i < 48; i += 1) {
      const type = TYPES[i % TYPES.length]
      const department = workshops[i % workshops.length]
      travel(today - Math.round(380 * random()) * DAY)

      const created = await repo.instruments.create({
        inventoryNumber: `PR-${ String(1001 + i).padStart(6, "0") }`,
        name: `${ type.name } ${ MANUFACTURERS[i % MANUFACTURERS.length] }`,
        typeId: types.get(type.name)?.id ?? null,
        serialNumber: `SN-${ String(Math.floor(random() * 900000) + 100000) }`,
        manufacturer: MANUFACTURERS[i % MANUFACTURERS.length],
        model: `М-${ 100 + i }`,
        ownerDepartmentId: departments.get(department) ?? null,
        baseLocationId: locationOf(department).id,
        responsibleEmployeeId: employees[i % employees.length].id,
        purchasedAt: today - Math.round(1200 * random()) * DAY,
        priceMinor: (400000 + Math.round(random() * 9000000)) * 100,
        currency: "UZS",
        description: null,
        note: null,
      }, OPERATOR)
      if (created.ok) instruments.push(created.value)
    }

    // ——— поверки ———
    for (const [index, instrument] of instruments.entries()) {
      const type = TYPES[index % TYPES.length]
      if (!type.verification) continue
      const performedAt = today - Math.round(340 * random()) * DAY
      /* Часть приборов нарочно с истекающей поверкой: без них плитка на
         дашборде и отчёт по графику поверок нечем показать. */
      const validUntil = index % 7 === 0
        ? today + Math.round(random() * 25) * DAY
        : performedAt + 365 * DAY
      travel(performedAt)
      await repo.verification.add({
        instrumentId: instrument.id,
        kind: "VERIFICATION",
        performedAt,
        validUntil,
        certificateNumber: `СП-2026/${ 100 + index }`,
        organization: "Узстандарт",
        result: "PASS",
        note: null,
      })
    }

    // ——— движение за полтора месяца ———
    const pick = <T, >(list: readonly T[]) => list[Math.floor(random() * list.length)]

    for (const [index, instrument] of instruments.entries()) {
      const employee = employees[index % employees.length]

      // Завершённые выдачи: дают историю графику движения.
      const rounds = Math.floor(random() * 3)
      for (let round = 0; round < rounds; round += 1) {
        const issuedAt = today - Math.round(random() * 40 + 2) * DAY
        travel(issuedAt)
        const issued = await repo.operations.execute({
          kind: "CHECK_OUT",
          instrumentId: instrument.id,
          operatorName: OPERATOR,
          employeeId: employee.id,
          toDepartmentId: employee.departmentId,
          expectedReturnAt: issuedAt + 3 * DAY,
        })
        if (!issued.ok) continue

        /* Возврат не может случиться позже «сейчас»: иначе журнал показывает
           операции, которых ещё не было, и дата в таблице выглядит опечаткой. */
        travel(Math.min(issuedAt + Math.round(random() * 3 + 1) * DAY, today))
        await repo.operations.execute({
          kind: "RETURN",
          instrumentId: instrument.id,
          operatorName: OPERATOR,
          condition: random() > 0.9 ? "NEEDS_REPAIR" : "OK",
        })
      }
    }

    // Текущее состояние: часть приборов на руках, часть в ремонте и на поверке.
    for (const [index, instrument] of instruments.entries()) {
      const current = await repo.instruments.getById(instrument.id)
      if (!current || current.status !== "AVAILABLE") continue

      const roll = random()
      const employee = pick(employees)

      if (index % 11 === 0) {
        travel(today - Math.round(random() * 20 + 8) * DAY)
        await repo.operations.execute({
          kind: "VERIFY_SEND",
          instrumentId: instrument.id,
          operatorName: OPERATOR,
          verificationKind: "VERIFICATION",
          toLocationId: metrologyRoom.id,
        })
        continue
      }

      if (index % 13 === 0) {
        travel(today - Math.round(random() * 15 + 3) * DAY)
        await repo.operations.execute({
          kind: "REPAIR_SEND",
          instrumentId: instrument.id,
          operatorName: OPERATOR,
          toLocationId: repairBench.id,
          reason: "Сбой показаний",
        })
        continue
      }

      if (roll < 0.3) {
        /* Треть выданных — с просроченным возвратом: плитка «Просрочено» на
           дашборде обязана показывать настоящее число. */
        const overdue = random() < 0.35
        const issuedAt = today - Math.round(random() * 6 + (overdue ? 8 : 1)) * DAY
        travel(issuedAt)
        await repo.operations.execute({
          kind: "CHECK_OUT",
          instrumentId: instrument.id,
          operatorName: OPERATOR,
          employeeId: employee.id,
          toDepartmentId: employee.departmentId,
          expectedReturnAt: issuedAt + (overdue ? 3 : 10) * DAY,
        })
      }
    }

    // Пара списанных приборов: архив не должен быть пустым.
    for (const instrument of instruments.slice(-2)) {
      const current = await repo.instruments.getById(instrument.id)
      if (!current || current.status === "CHECKED_OUT") continue
      travel(today - Math.round(random() * 60 + 10) * DAY)
      await repo.operations.execute({
        kind: "WRITE_OFF",
        instrumentId: instrument.id,
        operatorName: OPERATOR,
        reason: "Не подлежит ремонту",
      })
    }

    travel(null)
    await repo.settings.setOperatorName(OPERATOR)
  } finally {
    // Часы обязаны вернуться к настоящим, даже если засев оборвался на середине.
    travel(null)
  }
}
