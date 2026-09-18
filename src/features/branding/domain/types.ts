/** Что оператор может поменять во внешнем виде приложения. */
export interface Branding {
  /** Чем подписано приложение: в меню и в заголовке окна. */
  readonly title: string
  /** Цвет всего, что нажимается: кнопок, активного пункта меню, рамки фокуса. */
  readonly accent: string
  readonly font: FontId
  readonly neutral: NeutralId
  readonly radius: RadiusId
}

export type FontId = "plex" | "inter" | "golos" | "system"
export type NeutralId = "steel" | "graphite" | "sand"
export type RadiusId = "compact" | "normal" | "soft"

export interface Option<T extends string> {
  readonly id: T
  readonly label: string
  readonly hint: string
}
