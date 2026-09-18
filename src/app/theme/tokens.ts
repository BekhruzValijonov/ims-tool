/**
 * Цвета значением.
 *
 * Те же величины объявлены переменными CSS в `src/ui/tokens.css`; здесь они
 * продублированы для мест, где нужно готовое значение, а не переменная:
 * настройки графиков уходят в атрибуты SVG, где `var()` не раскрывается.
 */

export const COLORS = {
  grey: {
    50: "#FCFDFD", 100: "#F9FAFB", 200: "#F4F6F8", 300: "#DFE3E8", 400: "#C4CDD5",
    500: "#919EAB", 600: "#637381", 700: "#454F5B", 800: "#1C252E", 900: "#141A21",
  },
  white: "#FFFFFF",
  black: "#000000",
} as const

/**
 * Состояния прибора.
 *
 * Палитра приборной шкалы: зелёный — рабочий сектор, прибор на месте; синий
 * чертёжный — за прибором стоит человек; латунь — вне строя; красный —
 * недопустимый сектор, требует действия. Ремонт и поверка делят латунь
 * намеренно: цвет несёт тяжесть состояния, причину несёт подпись рядом.
 *
 * Интерфейс в этой палитре не участвует: кнопки, меню и ссылки набраны
 * графитом, поэтому цвет на экране всегда означает состояние.
 */
export const STATE = {
  ok: "#2B7A57",
  okSoft: "#E1EDE8",
  work: "#2C5E9E",
  workSoft: "#DFE8F4",
  wait: "#A8730B",
  waitSoft: "#F6EAD1",
  signal: "#C03A2B",
  signalSoft: "#F8E1DD",
  gone: COLORS.grey[500],
  goneSoft: COLORS.grey[200],
} as const

/** На тёмном фоне насыщенные тона тускнеют — берутся светлые, подложки глубже. */
export const STATE_DARK = {
  ok: "#5CB98D",
  okSoft: "#14382A",
  work: "#7FA8DC",
  workSoft: "#16293F",
  wait: "#E0A72E",
  waitSoft: "#3A2B0B",
  signal: "#EE7B6C",
  signalSoft: "#3F1712",
  gone: COLORS.grey[500],
  goneSoft: COLORS.grey[800],
} as const

/* Поверка отличается от ремонта только светлотой: состояние одно — «вне
   строя», — а различает их подпись в легенде. */
export const CHART_SERIES = {
  issued: STATE.work,
  returned: STATE.ok,
  available: STATE.ok,
  checkedOut: STATE.work,
  inRepair: STATE.wait,
  inVerification: "#D9A648",
  writtenOff: STATE.gone,
} as const

export const CHART_SERIES_DARK = {
  issued: STATE_DARK.work,
  returned: STATE_DARK.ok,
  available: STATE_DARK.ok,
  checkedOut: STATE_DARK.work,
  inRepair: STATE_DARK.wait,
  inVerification: "#F0CE85",
  writtenOff: STATE_DARK.gone,
} as const

export const MONO = "'IBM Plex Mono', ui-monospace, monospace"
export const TABULAR = { fontVariantNumeric: "tabular-nums" } as const
