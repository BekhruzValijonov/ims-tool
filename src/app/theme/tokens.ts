import { themeConfig } from "./minimal/theme-config"

/**
 * Токены приложения поверх дизайн-системы Minimal.
 *
 * Палитра, типографика и тени взяты из `dashboard-ui` целиком — здесь только
 * то, чего в ней нет: привязка цветов к состояниям приборов и размеры, на
 * которые опирается наша вёрстка.
 *
 * Правило прежнее: цвет означает состояние прибора. Оно ложится на палитру
 * Minimal без натяжек — фирменный зелёный достаётся исправному прибору,
 * бирюзовый «информационный» тому, что на руках, жёлтый предупреждающий тому,
 * что вне строя, красный тому, что требует действия.
 */

const P = themeConfig.palette

export const COLORS = {
  grey: P.grey,
  white: P.common.white,
  black: P.common.black,
} as const

export const BRAND = {
  main: P.primary.main,
  hover: P.primary.dark,
  soft: P.primary.lighter,
} as const

export const STATE = {
  /** В наличии — прибором можно пользоваться. */
  ok: P.primary.main,
  okSoft: P.primary.lighter,
  /** Выдан — он у человека. */
  work: P.info.main,
  workSoft: P.info.lighter,
  /** Вне строя: ремонт или поверка. Причину несёт подпись рядом. */
  wait: P.warning.main,
  waitSoft: P.warning.lighter,
  /** Требует действия: не вернули в срок, истекла поверка. */
  signal: P.error.main,
  signalSoft: P.error.lighter,
  /** Списан — вне учёта. */
  gone: P.grey["500"],
  goneSoft: P.grey["200"],
} as const

/**
 * Те же состояния для тёмной схемы.
 *
 * На тёмном фоне насыщенные цвета Minimal тускнеют, а мягкие подложки
 * становятся ярче текста, поэтому берутся светлые тона палитры, а подложки —
 * тёмные.
 */
export const STATE_DARK = {
  ok: P.primary.light,
  okSoft: P.primary.darker,
  work: P.info.light,
  workSoft: P.info.darker,
  wait: P.warning.light,
  waitSoft: P.warning.darker,
  signal: P.error.light,
  signalSoft: P.error.darker,
  gone: P.grey["500"],
  goneSoft: P.grey["800"],
} as const

/** Ряды на графиках — те же состояния: цветовой язык один на всё приложение. */
export const CHART_SERIES = {
  issued: STATE.work,
  returned: STATE.ok,
  available: STATE.ok,
  checkedOut: STATE.work,
  inRepair: STATE.wait,
  inVerification: P.warning.light,
  writtenOff: STATE.gone,
} as const

export const CHART_SERIES_DARK = {
  issued: STATE_DARK.work,
  returned: STATE_DARK.ok,
  available: STATE_DARK.ok,
  checkedOut: STATE_DARK.work,
  inRepair: STATE_DARK.wait,
  inVerification: P.warning.lighter,
  writtenOff: STATE_DARK.gone,
} as const

/**
 * Моноширинный — только для кодов и дат в колонках.
 *
 * В Minimal его нет: там нет таблиц с инвентарными номерами. Столбец из
 * PR-001023 и PR-001037 сравнивается глазом лишь при равной ширине знаков,
 * поэтому он остаётся — но только в ячейках с данными.
 */
export const MONO = "'IBM Plex Mono', ui-monospace, monospace"
export const TABULAR = { fontVariantNumeric: "tabular-nums" } as const

export const SIZE = {
  caption: "0.75rem",
  small: "0.875rem",
  body: "0.875rem",
  section: "1.125rem",
  page: "1.5rem",
  readout: "2rem",
} as const

/** Скругление Minimal: базовое 8, у карточек вдвое больше. */
export const RADIUS = 8
export const CARD_RADIUS = 16
export const BADGE_RADIUS = 12
export const SIDEBAR_WIDTH = 260
export const NAVBAR_HEIGHT = 72
