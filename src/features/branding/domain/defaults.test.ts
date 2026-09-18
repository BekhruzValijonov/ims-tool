import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { brandingCss } from "./branding"
import { DEFAULT_BRANDING } from "./presets"

/**
 * Токены в `tokens.css` — это исходное оформление, записанное вручную: ими
 * рисуется первый кадр, пока брендирование ещё читается из базы. Разойтись с
 * `DEFAULT_BRANDING` им нельзя, иначе приложение открывается одним, а через
 * мгновение перекрашивается в другое — заметнее всего на шрифте и скруглении.
 *
 * Тест сверяет два источника, а не проверяет отдельные значения: любое из них
 * можно поменять, но только вместе.
 */

const TOKENS = readFileSync("src/ui/tokens.css", "utf8")

/** Пары `--имя: значение` из блока, начинающегося указанным селектором. */
function block(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`нет блока ${ selector }`)
  const open = css.indexOf("{", start)
  const body = css.slice(open + 1, css.indexOf("}", open))

  const values = new Map<string, string>()
  for (const line of body.split("\n")) {
    const match = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);/)
    if (match) values.set(match[1], match[2].trim())
  }
  return values
}

/** `var(--x)` раскрывается на один шаг: в файле так записан шрифт заголовков. */
function resolve(value: string, scope: Map<string, string>): string {
  const match = value.match(/^var\((--[\w-]+)\)$/)
  return match ? scope.get(match[1]) ?? value : value
}

describe("исходное оформление", () => {
  const css = brandingCss(DEFAULT_BRANDING)

  it("светлая схема в tokens.css совпадает с расчётом", () => {
    const expected = block(css, "html:root {")
    const actual = block(TOKENS, ":root {")

    expect(expected.size).toBeGreaterThan(10)
    for (const [name, value] of expected) {
      expect(resolve(actual.get(name) ?? "", actual), name).toBe(value)
    }
  })

  it("тёмная схема в tokens.css совпадает с расчётом", () => {
    const expected = block(css, "html:root[data-theme='dark'] {")
    const actual = block(TOKENS, "[data-theme='dark'] {")

    expect(expected.size).toBeGreaterThan(3)
    for (const [name, value] of expected) {
      expect(resolve(actual.get(name) ?? "", actual), name).toBe(value)
    }
  })

  it("разметка открывается той же схемой, что стоит по умолчанию", () => {
    // Иначе первый кадр светлый, и тёмная схема включается вспышкой.
    expect(readFileSync("index.html", "utf8")).toContain('data-theme="dark"')
  })
})
