/**
 * Токены приложения.
 *
 * Значения перенесены из дизайн-системы Minimal (проект dashboard-ui) один в
 * один. Там они лежали в теме MUI, здесь это обычный модуль: те же числа
 * объявлены переменными CSS в `src/ui/tokens.css`, а тут — для тех мест, где
 * цвет нужен значением, а не переменной: подписи графиков уходят в атрибуты
 * SVG, где var() не раскрывается.
 */

export const PALETTE = {
  primary: {
    lighter: "#C8FAD6", light: "#5BE49B", main: "#00A76F",
    dark: "#007867", darker: "#004B50", contrastText: "#FFFFFF",
  },
  info: {
    lighter: "#CAFDF5", light: "#61F3F3", main: "#00B8D9",
    dark: "#006C9C", darker: "#003768",
  },
  warning: {
    lighter: "#FFF5CC", light: "#FFD666", main: "#FFAB00",
    dark: "#B76E00", darker: "#7A4100",
  },
  error: {
    lighter: "#FFE9D5", light: "#FFAC82", main: "#FF5630",
    dark: "#B71D18", darker: "#7A0916",
  },
  grey: {
    50: "#FCFDFD", 100: "#F9FAFB", 200: "#F4F6F8", 300: "#DFE3E8", 400: "#C4CDD5",
    500: "#919EAB", 600: "#637381", 700: "#454F5B", 800: "#1C252E", 900: "#141A21",
  },
  common: { black: "#000000", white: "#FFFFFF" },
} as const

export const COLORS = {
  grey: PALETTE.grey,
  white: PALETTE.common.white,
  black: PALETTE.common.black,
} as const

export const BRAND = {
  main: PALETTE.primary.main,
  hover: PALETTE.primary.dark,
  soft: PALETTE.primary.lighter,
} as const

/**
 * Состояния прибора.
 *
 * Цвет означает состояние и ничего больше. Правило ложится на палитру Minimal
 * без натяжек: фирменный зелёный достаётся исправному прибору, бирюзовый —
 * тому, что на руках, жёлтый — тому, что вне строя, красный — тому, что
 * требует действия. Ремонт и поверка делят жёлтый: цвет несёт тяжесть
 * состояния, причину несёт подпись рядом.
 */
export const STATE = {
  ok: PALETTE.primary.main,
  okSoft: PALETTE.primary.lighter,
  work: PALETTE.info.main,
  workSoft: PALETTE.info.lighter,
  wait: PALETTE.warning.main,
  waitSoft: PALETTE.warning.lighter,
  signal: PALETTE.error.main,
  signalSoft: PALETTE.error.lighter,
  gone: PALETTE.grey[500],
  goneSoft: PALETTE.grey[200],
} as const

/** На тёмном фоне насыщенные тона тускнеют — берутся светлые. */
export const STATE_DARK = {
  ok: PALETTE.primary.light,
  okSoft: PALETTE.primary.darker,
  work: PALETTE.info.light,
  workSoft: PALETTE.info.darker,
  wait: PALETTE.warning.light,
  waitSoft: PALETTE.warning.darker,
  signal: PALETTE.error.light,
  signalSoft: PALETTE.error.darker,
  gone: PALETTE.grey[500],
  goneSoft: PALETTE.grey[800],
} as const

export const CHART_SERIES = {
  issued: STATE.work,
  returned: STATE.ok,
  available: STATE.ok,
  checkedOut: STATE.work,
  inRepair: STATE.wait,
  inVerification: PALETTE.warning.light,
  writtenOff: STATE.gone,
} as const

export const CHART_SERIES_DARK = {
  issued: STATE_DARK.work,
  returned: STATE_DARK.ok,
  available: STATE_DARK.ok,
  checkedOut: STATE_DARK.work,
  inRepair: STATE_DARK.wait,
  inVerification: PALETTE.warning.lighter,
  writtenOff: STATE_DARK.gone,
} as const

export const MONO = "'IBM Plex Mono', ui-monospace, monospace"
export const TABULAR = { fontVariantNumeric: "tabular-nums" } as const
