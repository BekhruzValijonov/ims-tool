/**
 * Токены темы.
 *
 * Облик взят с админ-шаблона Corona: тёмный холст, панели с тонкой границей,
 * фирменный фиолетовый и живая палитра акцентов. Одно отличие сознательное —
 * в Corona цвет рассыпан по интерфейсу как украшение, у каждого пункта меню
 * свой оттенок просто так. Здесь фиолетовый закреплён за интерактивом, а
 * остальные цвета означают **состояние прибора**: человек учит один язык и
 * читает список по цвету, а не по подписям.
 */

export const COLORS = {
  /** Холст: почти чёрный, как в Corona. */
  canvasDark: "#0c0d11",
  /** Панели и боковое меню. */
  surfaceDark: "#191c24",
  /** Приподнятая поверхность: поля ввода, наведение. */
  raisedDark: "#1f232d",
  borderDark: "#2c2e33",
  textDark: "#ffffff",
  mutedDark: "#8b90a8",

  /** Светлая схема — та же геометрия на бумаге. */
  canvasLight: "#f2f0f7",
  surfaceLight: "#ffffff",
  raisedLight: "#f7f6fb",
  borderLight: "#e3e1ec",
  textLight: "#1c1b28",
  mutedLight: "#6c7293",
} as const

/** Фирменный фиолетовый Corona. Занят интерактивом и ничем больше. */
export const BRAND = {
  main: "#5E50F9",
  hover: "#4c3ef7",
  soft: "rgba(94, 80, 249, 0.16)",
} as const

/**
 * Состояния прибора в палитре Corona.
 *
 * Ремонт и поверка делят оранжевый: цвет несёт тяжесть («прибор вне строя»),
 * причину несёт подпись рядом.
 */
export const STATE = {
  ok: "#46c35f",
  okSoft: "rgba(70, 195, 95, 0.16)",
  work: "#57c7d4",
  workSoft: "rgba(87, 199, 212, 0.16)",
  wait: "#f2a654",
  waitSoft: "rgba(242, 166, 84, 0.16)",
  signal: "#f96868",
  signalSoft: "rgba(249, 104, 104, 0.16)",
  gone: "#8b90a8",
  goneSoft: "rgba(139, 144, 168, 0.16)",
} as const

/**
 * Те же состояния для светлой схемы.
 *
 * Оттенки Corona рассчитаны на тёмный фон: на белом они выцветают, поэтому
 * светлота опущена, а тон сохранён.
 */
export const STATE_LIGHT = {
  ok: "#2f9b48",
  okSoft: "rgba(47, 155, 72, 0.12)",
  work: "#1f97a6",
  workSoft: "rgba(31, 151, 166, 0.12)",
  wait: "#c07a1d",
  waitSoft: "rgba(192, 122, 29, 0.12)",
  signal: "#df4a4a",
  signalSoft: "rgba(223, 74, 74, 0.12)",
  gone: "#6c7293",
  goneSoft: "rgba(108, 114, 147, 0.12)",
} as const

/** Ряды на графиках — те же состояния: цветовой язык один на всё приложение. */
export const CHART_SERIES = {
  issued: STATE.work,
  returned: STATE.ok,
  available: STATE.ok,
  checkedOut: STATE.work,
  inRepair: STATE.wait,
  inVerification: "#f6cf6a",
  writtenOff: STATE.gone,
} as const

export const CHART_SERIES_LIGHT = {
  issued: STATE_LIGHT.work,
  returned: STATE_LIGHT.ok,
  available: STATE_LIGHT.ok,
  checkedOut: STATE_LIGHT.work,
  inRepair: STATE_LIGHT.wait,
  inVerification: "#d9a83a",
  writtenOff: STATE_LIGHT.gone,
} as const

export const SANS = "'Rubik', 'Segoe UI', system-ui, sans-serif"

/**
 * Моноширинный — только для кодов и дат в колонках.
 *
 * Столбец из PR-001023 и PR-001037 сравнивается глазом лишь при равной ширине
 * знаков. Для подписей и заголовков он не используется: там от него один шум.
 */
export const MONO = "'IBM Plex Mono', ui-monospace, monospace"

export const TABULAR = { fontVariantNumeric: "tabular-nums" } as const

/** Шкала Corona: базовый кегль 14, заголовки весом 500. */
export const SIZE = {
  caption: "0.75rem",
  small: "0.8125rem",
  body: "0.875rem",
  section: "1.0625rem",
  page: "1.375rem",
  readout: "1.875rem",
} as const

export const RADIUS = 4
/** Квадратный значок у пункта меню и карточки показаний. */
export const BADGE_RADIUS = 9
export const SIDEBAR_WIDTH = 244
export const NAVBAR_HEIGHT = 68
