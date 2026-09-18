import type { CSSProperties, ReactNode } from "react"
import styles from "./layout.module.css"

/** Шаг сетки — 8px, как в дизайн-системе. */
const STEP = 8

type Align = "start" | "center" | "end" | "baseline" | "stretch"
type Justify = "start" | "center" | "end" | "between"

const ALIGN: Record<Align, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
}

const JUSTIFY: Record<Justify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
}

interface StackProps {
  readonly children?: ReactNode
  readonly row?: boolean
  readonly gap?: number
  readonly align?: Align
  readonly justify?: Justify
  readonly wrap?: boolean
  readonly grow?: boolean
  readonly className?: string
  readonly style?: CSSProperties
  readonly as?: "div" | "section" | "header" | "aside" | "nav" | "li" | "form"
  /** Якорь обхода «Как это работает». */
  readonly "data-tour"?: string
}

/**
 * Колонка или строка с равными отступами.
 *
 * Заменяет Stack из MUI. Отступ задаётся шагами по 8px — той же сеткой, что и
 * в дизайн-системе, чтобы вёрстка не расползалась по произвольным пикселям.
 */
export function Stack({
  children, row, gap = 0, align, justify, wrap, grow, className, style, as: Tag = "div",
  "data-tour": tour,
}: StackProps) {
  return (
    <Tag
      data-tour={ tour }
      className={ [styles.stack, className].filter(Boolean).join(" ") }
      style={ {
        flexDirection: row ? "row" : "column",
        gap: gap * STEP,
        alignItems: align ? ALIGN[align] : undefined,
        justifyContent: justify ? JUSTIFY[justify] : undefined,
        flexWrap: wrap ? "wrap" : undefined,
        flexGrow: grow ? 1 : undefined,
        ...style,
      } }
    >
      { children }
    </Tag>
  )
}

interface GridProps {
  readonly children?: ReactNode
  /** Сколько колонок на каждой ширине экрана. Пропущенное наследуется снизу вверх. */
  readonly cols?: { xs?: number; sm?: number; md?: number; lg?: number }
  readonly gap?: number
  readonly className?: string
  readonly style?: CSSProperties
  /** Якорь обхода «Как это работает». */
  readonly "data-tour"?: string
}

export function Grid({ children, cols = {}, gap = 2, className, style, "data-tour": tour }: GridProps) {
  const xs = cols.xs ?? 1
  const sm = cols.sm ?? xs
  const md = cols.md ?? sm
  const lg = cols.lg ?? md

  return (
    <div
      data-tour={ tour }
      className={ [styles.grid, className].filter(Boolean).join(" ") }
      style={ {
        gap: gap * STEP,
        ["--cols-xs" as string]: xs,
        ["--cols-sm" as string]: sm,
        ["--cols-md" as string]: md,
        ["--cols-lg" as string]: lg,
        ...style,
      } }
    >
      { children }
    </div>
  )
}

/** Ячейка на две колонки сетки. */
export function GridSpan2({ children }: { children?: ReactNode }) {
  return <div className={ styles.span2 }>{ children }</div>
}
