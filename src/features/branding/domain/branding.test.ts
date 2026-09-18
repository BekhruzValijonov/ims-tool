import { describe, expect, it } from "vitest"
import { accentReadability, accentScale, brandingCss, parseBranding, serializeBranding } from "./branding"
import { contrast, luminance, normalizeHex, toHsl } from "./color"
import { ACCENTS, DEFAULT_BRANDING, NEUTRALS } from "./presets"

/**
 * Оформление выбирает человек, а отвечать за читаемость должно приложение:
 * какой бы цвет ни взяли, подпись на кнопке обязана читаться, а сама кнопка —
 * отличаться от страницы. Здесь проверяется именно это, а не то, что функции
 * возвращают какие-то строки.
 */

const WHITE = "#FFFFFF"
const DARK_PAPER = "#1C252E"

describe("акцент", () => {
  it("затемняет слишком светлый цвет, иначе кнопка сливается с белой страницей", () => {
    const { main } = accentScale("#FFF9C4", "light", WHITE)

    expect(contrast(main, WHITE)).toBeGreaterThanOrEqual(3)
    expect(luminance(main)).toBeLessThan(luminance("#FFF9C4"))
  })

  it("на светлом цвете подпись становится тёмной", () => {
    expect(accentScale("#FFD666", "light", WHITE).contrast).toBe("#141A21")
    expect(accentScale("#1B222B", "light", WHITE).contrast).toBe("#FFFFFF")
  })

  it("на тёмной схеме почти серый акцент уходит в светлый", () => {
    const { main } = accentScale("#1B222B", "dark", DARK_PAPER)

    expect(luminance(main)).toBeGreaterThan(luminance("#1B222B"))
    expect(contrast(main, DARK_PAPER)).toBeGreaterThanOrEqual(3)
  })

  it("на тёмной схеме цветной акцент остаётся цветным, а не выцветает в белый", () => {
    const { main } = accentScale("#0E6F7A", "dark", DARK_PAPER)
    const tone = toHsl(main)

    expect(Math.abs(tone.h - toHsl("#0E6F7A").h)).toBeLessThan(2)
    expect(tone.s).toBeGreaterThan(0.3)
    expect(tone.l).toBeGreaterThan(toHsl("#0E6F7A").l)
  })

  it("тон под курсором отличается от основного", () => {
    const { main, hover } = accentScale("#3D3B8E", "light", WHITE)
    expect(hover).not.toBe(main)
  })

  it("у всех готовых оттенков подпись на кнопке читается", () => {
    for (const accent of ACCENTS) {
      expect(accentReadability(accent.value), accent.label).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("серые шкалы", () => {
  it("темнеют по ступеням одинаково, поэтому контраст текста не зависит от выбора", () => {
    for (const neutral of NEUTRALS) {
      const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
      const levels = steps.map((step) => luminance(neutral.scale[step]))
      const sorted = [...levels].sort((a, b) => b - a)
      expect(levels, neutral.label).toEqual(sorted)
      // Текст 800-й ступени на фоне 100-й — основная пара интерфейса.
      expect(contrast(neutral.scale[800], neutral.scale[100]), neutral.label).toBeGreaterThan(12)
    }
  })
})

describe("чтение настройки", () => {
  it("пустая база даёт исходное оформление", () => {
    expect(parseBranding(null)).toEqual(DEFAULT_BRANDING)
  })

  it("испорченная запись не оставляет приложение без цветов", () => {
    expect(parseBranding("{не json")).toEqual(DEFAULT_BRANDING)
    expect(parseBranding("[]")).toEqual(DEFAULT_BRANDING)
    expect(parseBranding('"строка"')).toEqual(DEFAULT_BRANDING)
  })

  it("неизвестные значения заменяются исходными по одному", () => {
    const parsed = parseBranding(JSON.stringify({
      title: "  Завод  ", accent: "0e6f7a", font: "comic", neutral: "неон", radius: "soft",
    }))

    expect(parsed).toEqual({
      title: "Завод",
      accent: "#0E6F7A",
      font: DEFAULT_BRANDING.font,
      neutral: DEFAULT_BRANDING.neutral,
      radius: "soft",
    })
  })

  it("пустое название возвращается к исходному: меню без подписи читать нечем", () => {
    expect(parseBranding(JSON.stringify({ title: "   " })).title).toBe(DEFAULT_BRANDING.title)
  })

  it("переживает запись и чтение", () => {
    const branding = { ...DEFAULT_BRANDING, title: "Цех КИПиА", accent: "#3D3B8E", font: "golos" } as const
    expect(parseBranding(serializeBranding(branding))).toEqual(branding)
  })
})

describe("правила CSS", () => {
  it("описывают обе схемы и перекрывают исходные токены", () => {
    const css = brandingCss({ ...DEFAULT_BRANDING, radius: "soft", neutral: "sand" })

    expect(css).toContain("html:root {")
    expect(css).toContain("html:root[data-theme='dark'] {")
    expect(css).toContain("--radius-card: 24px;")
    expect(css).toContain(`--grey-500: ${ NEUTRALS[2].scale[500] };`)
  })

  it("у схем разные значения акцента", () => {
    const css = brandingCss(DEFAULT_BRANDING)
    const [light, dark] = css.split("html:root[data-theme='dark']")
    const pick = (block: string) => block.match(/--accent: (#[0-9A-F]{6})/)![1]

    expect(pick(light)).not.toBe(pick(dark))
  })
})

describe("разбор кода цвета", () => {
  it("принимает три и шесть знаков, с решёткой и без", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC")
    expect(normalizeHex("0e6f7a")).toBe("#0E6F7A")
    expect(normalizeHex("  #0E6F7A  ")).toBe("#0E6F7A")
  })

  it("не принимает мусор", () => {
    expect(normalizeHex("зелёный")).toBeNull()
    expect(normalizeHex("#12345")).toBeNull()
  })
})
