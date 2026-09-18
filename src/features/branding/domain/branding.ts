import { contrast, ensureContrast, fromHsl, lighten, normalizeHex, readableOn, toHsl, toRgb } from "./color"
import {
  DEFAULT_BRANDING, DENSITIES, FONTS, NEUTRALS, RADII, densityOf, fontOf, neutralOf, radiusOf,
} from "./presets"
import type { Branding, DensityId, FontId, NeutralId, RadiusId } from "./types"

/** Насколько цвет должен отличаться от фона, чтобы кнопку было видно. */
const MIN_AGAINST_BACKGROUND = 3

export interface AccentScale {
  readonly main: string
  readonly hover: string
  readonly contrast: string
  readonly rgb: string
}

/**
 * Четыре значения акцента для одной схемы.
 *
 * Выбранный оттенок сдвигается ровно настолько, чтобы кнопка не сливалась с
 * фоном: на светлой странице слишком светлый акцент исчезает, на тёмной —
 * слишком тёмный. Почти серый акцент на тёмной схеме уходит в белый: это
 * по-прежнему «самый плотный тон экрана», просто с другой стороны.
 */
export function accentScale(hex: string, scheme: "light" | "dark", background: string): AccentScale {
  const { h, s, l } = toHsl(hex)

  const raised = scheme === "dark"
    ? fromHsl({ h, s, l: s < 0.25 ? 0.92 : Math.max(l, 0.72) })
    : hex

  const main = ensureContrast(raised, background, MIN_AGAINST_BACKGROUND)
  const shift = toHsl(main).l > 0.5 ? -0.07 : 0.09
  const { r, g, b } = toRgb(main)

  return {
    main,
    hover: lighten(main, shift),
    contrast: readableOn(main),
    rgb: `${ r }, ${ g }, ${ b }`,
  }
}

/** Контраст подписи на залитой кнопке — то, что читает оператор. */
export function accentReadability(hex: string): number {
  const light = accentScale(hex, "light", "#FFFFFF")
  return contrast(light.main, light.contrast)
}

function pick<T extends string>(value: unknown, allowed: readonly { id: T }[], fallback: T): T {
  return allowed.some((item) => item.id === value) ? value as T : fallback
}

/**
 * Читает настройку из базы.
 *
 * Всё, что не разобралось, заменяется исходным значением: настройку правят
 * руками в SQLite, и одна опечатка не должна оставлять приложение без цветов.
 */
export function parseBranding(raw: string | null): Branding {
  if (!raw) return DEFAULT_BRANDING
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return DEFAULT_BRANDING
  }
  if (typeof data !== "object" || data === null) return DEFAULT_BRANDING

  const record = data as Record<string, unknown>
  const accent = typeof record.accent === "string" ? normalizeHex(record.accent) : null

  return {
    accent: accent ?? DEFAULT_BRANDING.accent,
    font: pick<FontId>(record.font, FONTS, DEFAULT_BRANDING.font),
    neutral: pick<NeutralId>(record.neutral, NEUTRALS, DEFAULT_BRANDING.neutral),
    radius: pick<RadiusId>(record.radius, RADII, DEFAULT_BRANDING.radius),
    density: pick<DensityId>(record.density, DENSITIES, DEFAULT_BRANDING.density),
    stripes: typeof record.stripes === "boolean" ? record.stripes : DEFAULT_BRANDING.stripes,
  }
}

export function serializeBranding(branding: Branding): string {
  return JSON.stringify(branding)
}

/**
 * Правила, которые перекрывают исходные токены.
 *
 * Селектор `html:root` весомее `:root` из `tokens.css`, поэтому порядок
 * подключения стилей значения не имеет — правила выигрывают в любом случае.
 * Тёмная схема описана отдельным блоком: на ней у акцента другой тон, и
 * записать его переменной в общем блоке нельзя.
 */
export function brandingCss(branding: Branding): string {
  const neutral = neutralOf(branding.neutral)
  const radius = radiusOf(branding.radius)
  const font = fontOf(branding.font)
  const density = densityOf(branding.density)
  const light = accentScale(branding.accent, "light", "#FFFFFF")
  const dark = accentScale(branding.accent, "dark", neutral.scale[800])

  const scale = Object.entries(neutral.scale)
    .map(([step, value]) => `  --grey-${ step }: ${ value };`)
    .join("\n")

  return [
    "html:root {",
    scale,
    `  --grey-500-rgb: ${ neutral.rgb500 };`,
    `  --accent: ${ light.main };`,
    `  --accent-hover: ${ light.hover };`,
    `  --accent-contrast: ${ light.contrast };`,
    `  --accent-rgb: ${ light.rgb };`,
    `  --radius: ${ radius.control }px;`,
    `  --radius-card: ${ radius.card }px;`,
    `  --font-sans: ${ font.stack };`,
    `  --font-display: ${ font.stack };`,
    `  --table-cell-y: ${ density.cell }px;`,
    `  --table-stripe: ${ branding.stripes ? "rgba(var(--grey-500-rgb), 0.08)" : "transparent" };`,
    "}",
    "",
    "html:root[data-theme='dark'] {",
    `  --bg-neutral: ${ neutral.darkNeutral };`,
    `  --accent: ${ dark.main };`,
    `  --accent-hover: ${ dark.hover };`,
    `  --accent-contrast: ${ dark.contrast };`,
    `  --accent-rgb: ${ dark.rgb };`,
    "}",
  ].join("\n")
}
