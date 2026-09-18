import type { CSSProperties, ReactNode } from "react"
import styles from "./Card.module.css"

interface CardProps {
  readonly children?: ReactNode
  /** Внутренние поля: обычные 24px, тесные 16px, без них — своя вёрстка внутри. */
  readonly padding?: "none" | "tight" | "normal"
  readonly className?: string
  readonly style?: CSSProperties
  /** Якорь обхода «Как это работает». */
  readonly "data-tour"?: string
}

/** Панель дизайн-системы: скругление 16 и мягкая тень, без рамки. */
export function Card({ children, padding = "normal", className, style, "data-tour": tour }: CardProps) {
  return (
    <div
      data-tour={ tour }
      className={ [
        styles.card,
        padding === "normal" ? styles.padded : null,
        padding === "tight" ? styles.tight : null,
        className,
      ].filter(Boolean).join(" ") }
      style={ style }
    >
      { children }
    </div>
  )
}
