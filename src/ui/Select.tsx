import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import styles from "./Select.module.css"
import fieldStyles from "./Field.module.css"
import { IconChevronDown } from "./icons"

export interface Option {
  readonly value: string
  readonly label: string
}

interface SelectProps {
  readonly value: string
  onChange(value: string): void
  readonly options: readonly Option[]
  /** Первый пункт списка: «Любой», «Не указано» и подобное. */
  readonly emptyLabel?: string
  readonly label?: string
  readonly helper?: string
  readonly required?: boolean
  readonly disabled?: boolean
  readonly fullWidth?: boolean
  readonly className?: string
  readonly style?: CSSProperties
}

interface Position {
  readonly left: number
  readonly top: number
  readonly width: number
}

/**
 * Выпадающий список.
 *
 * Сделан по образцу всплывающего меню из dashboard-ui: панель со скруглёнными
 * пунктами и подсвеченным выбранным. Системный `<select>` так оформить нельзя —
 * его список рисует операционная система.
 *
 * Список позиционируется по координатам кнопки и лежит в потоке страницы с
 * `position: fixed`. Поэтому его не режут прокручиваемые предки и не прячет
 * модальное окно: портал в body ушёл бы под затемнение нативного `<dialog>`.
 */
export function Select({
  value, onChange, options, emptyLabel, label, helper, required, disabled, fullWidth, className, style,
}: SelectProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)

  const all: Option[] = emptyLabel === undefined
    ? [...options]
    : [{ value: "", label: emptyLabel }, ...options]
  const current = all.find((option) => option.value === value) ?? null

  function place() {
    const trigger = triggerRef.current
    if (!trigger) return
    const box = trigger.getBoundingClientRect()
    const below = window.innerHeight - box.bottom
    const height = Math.min(280, all.length * 38 + 8)
    // Если снизу не помещается, список раскрывается вверх.
    const top = below < height + 8 ? box.top - height - 4 : box.bottom + 4
    setPosition({ left: box.left, top, width: box.width })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return

    function reposition() { place() }
    function outside(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener("mousedown", outside)
    window.addEventListener("resize", reposition)
    window.addEventListener("scroll", reposition, true)
    return () => {
      document.removeEventListener("mousedown", outside)
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function openList() {
    if (disabled) return
    setActive(Math.max(0, all.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(index: number) {
    const option = all[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault()
        openList()
      }
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => Math.min(all.length - 1, index + 1))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      choose(active)
      return
    }
    if (event.key === "Tab") {
      setOpen(false)
      return
    }

    /* Набор с клавиатуры: в списке сотрудников прокручивать полсотни строк
       стрелками — мучение, а первая буква фамилии решает дело. */
    if (event.key.length === 1) {
      const letter = event.key.toLowerCase()
      const found = all.findIndex((option) => option.label.toLowerCase().startsWith(letter))
      if (found >= 0) setActive(found)
    }
  }

  useEffect(() => {
    if (!open) return
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  return (
    <div
      className={ [fieldStyles.field, fullWidth ? fieldStyles.full : null, className].filter(Boolean).join(" ") }
      style={ style }
    >
      { label ? (
        <label className={ fieldStyles.label } htmlFor={ id }>
          { label }
          { required ? <span className={ fieldStyles.required }> *</span> : null }
        </label>
      ) : null }

      <button
        id={ id }
        ref={ triggerRef }
        type="button"
        className={ [styles.trigger, open ? styles.open : null].filter(Boolean).join(" ") }
        disabled={ disabled }
        aria-haspopup="listbox"
        aria-expanded={ open }
        onClick={ () => (open ? setOpen(false) : openList()) }
        onKeyDown={ onKeyDown }
      >
        <span className={ [styles.value, current?.value ? null : styles.placeholder].filter(Boolean).join(" ") }>
          { current?.label ?? emptyLabel ?? "" }
        </span>
        <span className={ styles.chevron }><IconChevronDown size={ 18 }/></span>
      </button>

      { open && position ? (
        <ul
          ref={ listRef }
          role="listbox"
          className={ styles.list }
          style={ { left: position.left, top: position.top, minWidth: position.width } }
        >
          { all.map((option, index) => (
            <li
              key={ option.value || "__empty" }
              role="option"
              aria-selected={ option.value === value }
              className={ [
                styles.option,
                option.value === value ? styles.selected : null,
                index === active ? styles.active : null,
              ].filter(Boolean).join(" ") }
              onMouseEnter={ () => setActive(index) }
              onClick={ () => choose(index) }
            >
              { option.label }
            </li>
          )) }
        </ul>
      ) : null }

      { helper ? <span className={ fieldStyles.helper }>{ helper }</span> : null }
    </div>
  )
}
