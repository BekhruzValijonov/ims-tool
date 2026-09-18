import type { CSSProperties, ReactNode } from "react"
import { useId } from "react"
import styles from "./Field.module.css"
import { IconChevronDown } from "./icons"

interface BaseProps {
  readonly label?: string
  readonly helper?: string
  readonly error?: boolean
  readonly required?: boolean
  readonly disabled?: boolean
  readonly fullWidth?: boolean
  readonly className?: string
  readonly style?: CSSProperties
}

function Wrapper({
  label, helper, error, required, fullWidth, className, style, id, children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div
      className={ [styles.field, fullWidth ? styles.full : null, className].filter(Boolean).join(" ") }
      style={ style }
    >
      { label ? (
        <label className={ styles.label } htmlFor={ id }>
          { label }
          { required ? <span className={ styles.required }> *</span> : null }
        </label>
      ) : null }
      { children }
      { helper ? (
        <span className={ [styles.helper, error ? styles.error : null].filter(Boolean).join(" ") }>
          { helper }
        </span>
      ) : null }
    </div>
  )
}

interface TextFieldProps extends BaseProps {
  readonly value: string
  onChange(value: string): void
  readonly placeholder?: string
  readonly type?: "text" | "number" | "search"
  readonly startIcon?: ReactNode
  readonly endIcon?: ReactNode
  readonly autoFocus?: boolean
  onBlur?(): void
}

/**
 * Поле ввода.
 *
 * Подпись стоит над полем, а не всплывает внутри него: в форме на двадцать
 * полей плавающая подпись исчезает ровно тогда, когда человек её перечитывает.
 */
export function TextField({
  value, onChange, placeholder, type = "text", startIcon, endIcon, autoFocus, onBlur, ...base
}: TextFieldProps) {
  const id = useId()

  return (
    <Wrapper { ...base } id={ id }>
      <div className={ [styles.control, base.error ? styles.invalid : null].filter(Boolean).join(" ") }>
        { startIcon ? <span className={ styles.adornment }>{ startIcon }</span> : null }
        <input
          id={ id }
          className={ styles.input }
          type={ type }
          value={ value }
          placeholder={ placeholder }
          disabled={ base.disabled }
          required={ base.required }
          autoFocus={ autoFocus }
          onBlur={ onBlur }
          onChange={ (event) => onChange(event.target.value) }
        />
        { endIcon ? <span className={ styles.adornment }>{ endIcon }</span> : null }
      </div>
    </Wrapper>
  )
}

export interface Option {
  readonly value: string
  readonly label: string
}

interface SelectProps extends BaseProps {
  readonly value: string
  onChange(value: string): void
  readonly options: readonly Option[]
  /** Что стоит в списке первым пунктом: «Любой», «Не указано» и подобное. */
  readonly emptyLabel?: string
}

/**
 * Выпадающий список.
 *
 * Обычный select браузера: он работает с клавиатуры, знает про экранные
 * читалки и не требует своего меню на два экрана кода.
 */
export function Select({ value, onChange, options, emptyLabel, ...base }: SelectProps) {
  const id = useId()

  return (
    <Wrapper { ...base } id={ id }>
      <div className={ [styles.control, base.error ? styles.invalid : null].filter(Boolean).join(" ") }>
        <select
          id={ id }
          className={ styles.select }
          value={ value }
          disabled={ base.disabled }
          required={ base.required }
          onChange={ (event) => onChange(event.target.value) }
        >
          { emptyLabel === undefined ? null : <option value="">{ emptyLabel }</option> }
          { options.map((option) => (
            <option key={ option.value } value={ option.value }>{ option.label }</option>
          )) }
        </select>
        <span className={ styles.adornment }><IconChevronDown size={ 18 }/></span>
      </div>
    </Wrapper>
  )
}

interface TextAreaProps extends BaseProps {
  readonly value: string
  onChange(value: string): void
  readonly rows?: number
  readonly placeholder?: string
}

export function TextArea({ value, onChange, rows = 3, placeholder, ...base }: TextAreaProps) {
  const id = useId()

  return (
    <Wrapper { ...base } id={ id }>
      <textarea
        id={ id }
        className={ styles.textarea }
        rows={ rows }
        value={ value }
        placeholder={ placeholder }
        disabled={ base.disabled }
        onChange={ (event) => onChange(event.target.value) }
      />
    </Wrapper>
  )
}
