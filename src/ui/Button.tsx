import type { ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./Button.module.css"

type Variant = "contained" | "outlined" | "soft" | "text"
type Color = "primary" | "error" | "inherit"
type Size = "small" | "medium" | "large"

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  readonly variant?: Variant
  readonly color?: Color
  readonly size?: Size
  readonly startIcon?: ReactNode
  readonly endIcon?: ReactNode
}

export function Button({
  variant = "text", color = "primary", size = "medium",
  startIcon, endIcon, children, className, type = "button", ...rest
}: ButtonProps) {
  return (
    <button
      type={ type }
      className={ [styles.button, styles[variant], styles[color], styles[size], className]
        .filter(Boolean).join(" ") }
      { ...rest }
    >
      { startIcon }
      { children }
      { endIcon }
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Всплывающая подсказка: у кнопки-иконки нет подписи, и без неё непонятно, что она делает. */
  readonly label: string
}

export function IconButton({ label, children, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={ type }
      aria-label={ label }
      title={ label }
      className={ [styles.button, styles.icon, className].filter(Boolean).join(" ") }
      { ...rest }
    >
      { children }
    </button>
  )
}
