/**
 * Токены темы.
 *
 * Правило, из которого выведено всё остальное: **цвет означает состояние
 * прибора и ничего больше**. Хром интерфейса — графит и бумага; насыщенный
 * цвет на экране появляется там, где есть состояние или требуется действие.
 * Поэтому у кнопок и ссылок своего цвета нет: они читаются формой, весом и
 * подчёркиванием, а не синевой.
 */

export const COLORS = {
  /** Фон страницы: алюминиевая панель, холодный серый с зелёным подтоном. */
  panel: "#E9EBE9",
  panelDark: "#121614",
  /** Листы с содержимым. */
  paper: "#FFFFFF",
  paperDark: "#1B211E",
  /** Текст: графит, а не «почти чёрный». */
  ink: "#1B2220",
  inkDark: "#E7EDEA",
  /** Вторичный текст и волосяные линии. */
  steel: "#6F7773",
  steelDark: "#9AA39F",
  line: "#CFD5D2",
  lineDark: "#2C3531",
} as const

/**
 * Состояния прибора.
 *
 * Четыре цвета, а не шесть: цвет несёт тяжесть состояния, причину несёт
 * подпись рядом. Ремонт и поверка выглядят одинаково не по недосмотру — для
 * работы важно, что прибор вне строя, а чем именно он занят, сказано словом.
 */
export const STATE = {
  /** В наличии — можно выдавать. */
  ok: "#2E6B4F",
  okSoft: "#E4EFE9",
  /** Выдан — прибор у человека. */
  work: "#2D5AA0",
  workSoft: "#E3EAF5",
  /** Вне строя: ремонт или поверка. */
  wait: "#8F6410",
  waitSoft: "#F5ECD9",
  /** Требует действия: не вернули в срок, поверка истекла. */
  signal: "#BC3227",
  signalSoft: "#F8E3E1",
  /** Списан — вне учёта. */
  gone: "#6F7773",
  goneSoft: "#E7EAE8",
} as const

/**
 * Цвета рядов на графиках — те же, что у состояний.
 *
 * Выдачи синие, возвраты зелёные, столбцы подразделений разложены по
 * состояниям. Человек учит один цветовой язык, а не отдельный для таблиц и
 * отдельный для диаграмм.
 */
/**
 * Те же состояния для тёмной схемы.
 *
 * Тёмные насыщенные цвета на тёмном фоне почти не читаются: сигнальный
 * красный на графитовом фоне перестаёт быть сигналом. Оттенок сохранён,
 * светлота поднята.
 */
export const STATE_DARK = {
  ok: "#5BA383",
  okSoft: "#1F3A2E",
  work: "#6D9BE0",
  workSoft: "#1D2C43",
  wait: "#D2A248",
  waitSoft: "#3A2F17",
  signal: "#E8756A",
  signalSoft: "#3D211E",
  gone: "#9AA39F",
  goneSoft: "#272E2B",
} as const

export const CHART_SERIES = {
  issued: STATE.work,
  returned: STATE.ok,
  available: STATE.ok,
  checkedOut: STATE.work,
  inRepair: STATE.wait,
  inVerification: "#C9A45B",
  writtenOff: STATE.gone,
} as const

export const CHART_SERIES_DARK = {
  issued: STATE_DARK.work,
  returned: STATE_DARK.ok,
  available: STATE_DARK.ok,
  checkedOut: STATE_DARK.work,
  inRepair: STATE_DARK.wait,
  inVerification: "#E3C489",
  writtenOff: STATE_DARK.gone,
} as const

export const SANS = "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif"

/**
 * Моноширинный — для данных, а не для подписей.
 *
 * Инвентарные номера, серийники, даты и числа в колонках сравниваются глазом
 * только при равной ширине знаков: столбец из PR-001023 и PR-001037 при
 * пропорциональных цифрах приходится читать посимвольно.
 */
export const MONO = "'IBM Plex Mono', ui-monospace, monospace"

/** Ровные цифры — обязательны везде, где числа стоят колонкой. */
export const TABULAR = { fontVariantNumeric: "tabular-nums" } as const

/** Шкала: 12 / 13 / 15 / 18 / 22 / 32. Базовый кегль 15 — на заводском мониторе 14 мелковат. */
export const SIZE = {
  caption: "0.75rem",
  small: "0.8125rem",
  body: "0.9375rem",
  section: "1.125rem",
  page: "1.375rem",
  readout: "2rem",
} as const

export const RADIUS = 4
