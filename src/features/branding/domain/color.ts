/**
 * Цветовая арифметика для брендирования.
 *
 * Оператор выбирает один цвет, а интерфейсу их нужно четыре: сам цвет, тон под
 * курсором, цвет подписи на нём и светлый вариант для тёмной схемы. Считать их
 * на глаз нельзя — подпись на кнопке обязана читаться при любом выборе,
 * поэтому пары проверяются по контрасту, как этого требует WCAG.
 */

export interface Rgb { readonly r: number; readonly g: number; readonly b: number }
export interface Hsl { readonly h: number; readonly s: number; readonly l: number }

/** Приводит запись цвета к `#RRGGBB`; непонятное — к `null`. */
export function normalizeHex(value: string): string | null {
  const text = value.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{3}$/.test(text)) {
    return `#${ text.split("").map((c) => c + c).join("").toUpperCase() }`
  }
  return /^[0-9a-fA-F]{6}$/.test(text) ? `#${ text.toUpperCase() }` : null
}

export function toRgb(hex: string): Rgb {
  const text = hex.replace("#", "")
  return {
    r: parseInt(text.slice(0, 2), 16),
    g: parseInt(text.slice(2, 4), 16),
    b: parseInt(text.slice(4, 6), 16),
  }
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) => Math.round(Math.min(255, Math.max(0, value)))
    .toString(16).padStart(2, "0").toUpperCase()
  return `#${ part(r) }${ part(g) }${ part(b) }`
}

export function toHsl(hex: string): Hsl {
  const { r, g, b } = toRgb(hex)
  const [red, green, blue] = [r / 255, g / 255, b / 255]
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === red
    ? ((green - blue) / d + (green < blue ? 6 : 0))
    : max === green ? (blue - red) / d + 2 : (red - green) / d + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

export function fromHsl({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const sector = Math.floor(((h % 360) + 360) % 360 / 60)
  const table: readonly (readonly [number, number, number])[] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ]
  const [r, g, b] = table[sector]
  return toHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
}

/** Относительная яркость по WCAG. */
export function luminance(hex: string): number {
  const { r, g, b } = toRgb(hex)
  const channel = (value: number) => {
    const v = value / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Отношение контраста двух цветов: от 1 (одинаковые) до 21 (чёрный и белый). */
export function contrast(first: string, second: string): number {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Подпись на заливке: белая или почти чёрная — что лучше читается. */
export function readableOn(background: string): string {
  return contrast("#FFFFFF", background) >= contrast("#141A21", background) ? "#FFFFFF" : "#141A21"
}

export function lighten(hex: string, amount: number): string {
  const { h, s, l } = toHsl(hex)
  return fromHsl({ h, s, l: Math.min(1, Math.max(0, l + amount)) })
}

/**
 * Затемняет или осветляет цвет, пока он не начнёт различаться на фоне.
 *
 * Нужен обоим краям: очень светлый акцент теряется на белой странице, очень
 * тёмный — на тёмной. Шаг маленький, чтобы выбранный оттенок менялся не больше
 * необходимого.
 */
export function ensureContrast(hex: string, background: string, min: number): string {
  const step = luminance(hex) > luminance(background) ? 0.02 : -0.02
  let result = hex
  for (let i = 0; i < 50 && contrast(result, background) < min; i += 1) {
    const next = lighten(result, step)
    if (next === result) break
    result = next
  }
  return result
}
