/** Что оператор может поменять во внешнем виде приложения. */
export interface Branding {
  /** Цвет всего, что нажимается: кнопок, активного пункта меню, рамки фокуса. */
  readonly accent: string
  readonly font: FontId
  readonly neutral: NeutralId
  readonly radius: RadiusId
  /** Высота строк в таблицах: от неё зависит, сколько их помещается на экран. */
  readonly density: DensityId
  /** Чередовать фон строк, чтобы взгляд не терял строку в широкой таблице. */
  readonly stripes: boolean
}

export type FontId = "plex" | "inter" | "golos" | "system"
export type NeutralId = "steel" | "graphite" | "sand"
export type RadiusId = "compact" | "normal" | "soft"
export type DensityId = "roomy" | "normal" | "tight"

export interface Option<T extends string> {
  readonly id: T
  readonly label: string
  readonly hint: string
}
