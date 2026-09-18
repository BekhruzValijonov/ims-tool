import type { ReactNode } from "react"
import styles from "./Chip.module.css"

/**
 * Цвет метки — это состояние прибора, а не украшение: `ok` на месте, `work` у
 * человека, `wait` вне строя, `alarm` требует действия. `ink` стоит особняком:
 * это счётчик, у него состояния нет.
 */
export type ChipColor = "neutral" | "ok" | "work" | "wait" | "alarm" | "ink"

/** Метка состояния — мягкая заливка цветом, как в дизайн-системе. */
export function Chip({ children, color = "neutral" }: { children: ReactNode; color?: ChipColor }) {
  return <span className={ [styles.chip, styles[color]].join(" ") }>{ children }</span>
}
