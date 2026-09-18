import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { TOURS, type TourId } from "./index"

/**
 * Шаг обхода привязан к элементу атрибутом `data-tour`. Связь держится только
 * на совпадении строк, поэтому её проверяет тест: переименованный якорь иначе
 * молча выпадает из обхода, и человек получает подсказку про кнопку, которую
 * ему никто не подсветил.
 */

const SOURCE = readSources("src")

function readSources(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return [readSources(path)]
      return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")
        ? [readFileSync(path, "utf8")]
        : []
    })
    .join("\n")
}

const ids = Object.keys(TOURS) as TourId[]

describe.each(ids)("обход «%s»", (id) => {
  const steps = TOURS[id]

  it("начинается со вступления по центру экрана", () => {
    expect(steps[0].target).toBeNull()
  })

  it("говорит связными фразами, а не заглушками", () => {
    for (const step of steps) {
      expect(step.title.trim().length).toBeGreaterThan(2)
      expect(step.text.trim().length).toBeGreaterThan(40)
      expect(step.text).not.toMatch(/TODO|TBD|Lorem/i)
    }
  })

  it("привязан к якорям, которые есть в разметке", () => {
    for (const step of steps) {
      if (step.target === null) continue
      expect(SOURCE, `нет элемента с data-tour="${ step.target }"`)
        .toContain(`data-tour="${ step.target }"`)
    }
  })

  it("вызывается с какого-нибудь экрана", () => {
    expect(SOURCE).toMatch(new RegExp(`(^|[^-\\w])tour="${ id }"`, "m"))
  })
})
