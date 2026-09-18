import { describe, expect, it } from "vitest"
import { MemoryRepo } from "./MemoryRepo"
import { seedShowcase, seedShowcaseIfEmpty } from "./devSeed"

/**
 * Витрина — не украшение: на ней проверяются дашборд, графики и отчёты. Если
 * она сеет данные, в которых нет ни просрочки, ни истекающей поверки, половину
 * экранов не на чем смотреть, и ошибку в них никто не заметит.
 */
describe("витрина для разработки", () => {
  async function seeded() {
    let simulated: number | null = null
    const repo = new MemoryRepo(() => simulated ?? Date.now())
    await seedShowcase(repo, (timestamp) => { simulated = timestamp })
    return { repo, simulated: () => simulated }
  }

  it("сеет завод, на котором видно всё, ради чего сделан дашборд", async () => {
    const { repo } = await seeded()
    const counters = await repo.dashboard.counters(Date.now())

    expect(counters.total).toBeGreaterThan(40)
    expect(counters.available).toBeGreaterThan(0)
    expect(counters.checkedOut).toBeGreaterThan(0)
    expect(counters.overdue).toBeGreaterThan(0)
    expect(counters.inRepair).toBeGreaterThan(0)
    expect(counters.verificationDue).toBeGreaterThan(0)
    expect(counters.writtenOff).toBeGreaterThan(0)
  })

  it("оставляет историю движения, а не сто операций в одну секунду", async () => {
    const { repo } = await seeded()
    const journal = await repo.operations.journal({ pageSize: 500 })
    const moments = new Set(journal.rows.map((event) => event.occurredAt))

    expect(journal.total).toBeGreaterThan(60)
    expect(moments.size).toBeGreaterThan(30)

    const flow = await repo.dashboard.flow(Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now())
    expect(flow.some((day) => day.checkedOut > 0)).toBe(true)
    expect(flow.some((day) => day.returned > 0)).toBe(true)
  })

  it("не сеет операций в будущем", async () => {
    const { repo } = await seeded()
    const journal = await repo.operations.journal({ pageSize: 1000 })
    const now = Date.now()
    const future = journal.rows.filter((event) => event.occurredAt > now)

    expect(future).toHaveLength(0)
  })

  it("возвращает часы к настоящим после засева", async () => {
    const { simulated } = await seeded()
    expect(simulated()).toBeNull()
  })

  it("не сеет второй раз поверх существующих данных", async () => {
    const repo = new MemoryRepo()
    await seedShowcaseIfEmpty(repo, () => {})
    const first = (await repo.instruments.list({ pageSize: 1 })).total

    await seedShowcaseIfEmpty(repo, () => {})
    const second = (await repo.instruments.list({ pageSize: 1 })).total

    expect(second).toBe(first)
  })
})
