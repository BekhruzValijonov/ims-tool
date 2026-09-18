import type { ReactNode } from "react"
import styles from "./Choice.module.css"

interface ChoiceProps {
  readonly checked: boolean
  onChange(checked: boolean): void
  readonly children: ReactNode
  readonly disabled?: boolean
  /** Имя группы. Обязательно для переключателей: по нему браузер их связывает. */
  readonly name?: string
}

function Choice({ kind, checked, onChange, children, disabled, name }: ChoiceProps & { kind: "checkbox" | "radio" }) {
  return (
    <label className={ [styles.choice, disabled ? styles.disabled : null].filter(Boolean).join(" ") }>
      <input
        type={ kind }
        name={ name }
        className={ [styles.box, styles[kind]].join(" ") }
        checked={ checked }
        disabled={ disabled }
        onChange={ (event) => onChange(event.target.checked) }
      />
      <span className={ styles.label }>{ children }</span>
    </label>
  )
}

export function Checkbox(props: ChoiceProps) {
  return <Choice kind="checkbox" { ...props }/>
}

export function Radio(props: ChoiceProps) {
  return <Choice kind="radio" { ...props }/>
}
