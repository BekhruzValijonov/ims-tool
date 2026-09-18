import type { ReactNode } from "react"
import styles from "./Alert.module.css"

type Severity = "error" | "warning" | "success" | "info"

export function Alert({
  severity = "info", title, children, className,
}: { severity?: Severity; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={ [styles.alert, styles[severity], className].filter(Boolean).join(" ") }>
      <div>
        { title ? <div className={ styles.title }>{ title }</div> : null }
        { children }
      </div>
    </div>
  )
}
