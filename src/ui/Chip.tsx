import type { ReactNode } from "react"
import styles from "./Chip.module.css"

export type ChipColor = "default" | "primary" | "info" | "warning" | "error"

/** Метка состояния — мягкая заливка цветом, как в дизайн-системе. */
export function Chip({ children, color = "default" }: { children: ReactNode; color?: ChipColor }) {
  return <span className={ [styles.chip, styles[color]].join(" ") }>{ children }</span>
}
