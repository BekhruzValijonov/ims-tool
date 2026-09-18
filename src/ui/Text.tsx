import type { CSSProperties, ElementType, ReactNode } from "react"
import styles from "./Text.module.css"

type Variant =
  | "h3" | "h4" | "h5" | "h6"
  | "subtitle1" | "subtitle2"
  | "body1" | "body2"
  | "caption" | "overline"

type Tone = "primary" | "secondary" | "disabled" | "inherit"

const DEFAULT_TAG: Record<Variant, ElementType> = {
  h3: "h2", h4: "h2", h5: "h3", h6: "h3",
  subtitle1: "p", subtitle2: "p",
  body1: "p", body2: "p",
  caption: "span", overline: "span",
}

interface TextProps {
  readonly children?: ReactNode
  readonly variant?: Variant
  readonly tone?: Tone
  /** Моноширинный — для кодов, дат и чисел в колонках. */
  readonly mono?: boolean
  readonly noWrap?: boolean
  readonly as?: ElementType
  readonly className?: string
  readonly style?: CSSProperties
  readonly title?: string
}

/**
 * Типографика дизайн-системы.
 *
 * Размеры и веса взяты из темы Minimal без изменений; заменяет Typography из
 * MUI, чтобы вариант писался словом, а не подбирался кеглями по месту.
 */
export function Text({
  children, variant = "body2", tone = "inherit", mono, noWrap, as, className, style, title,
}: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant]

  return (
    <Tag
      className={ [
        styles.text,
        styles[variant],
        styles[tone],
        mono ? styles.mono : null,
        noWrap ? styles.noWrap : null,
        className,
      ].filter(Boolean).join(" ") }
      style={ style }
      title={ title }
    >
      { children }
    </Tag>
  )
}
