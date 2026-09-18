import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react"
import styles from "./DateInput.module.css"
import { TextField } from "./Field"
import { Skeleton } from "./Skeleton"
import { IconCalendar } from "./icons"

const Calendar = lazy(() => import("./Calendar"))

interface DateInputProps {
  readonly label?: string
  /** Дата как YYYY-MM-DD; пустая строка — значение не задано. */
  readonly value: string
  onChange(value: string): void
  readonly helper?: string
  readonly fullWidth?: boolean
  readonly required?: boolean
}

interface Position {
  readonly left: number
  readonly top: number
}

/* Ширина и высота панели: по ним считается, помещается ли она под полем.
   Ширина — под сетку календаря, семь клеток по 36 плюс поля; уже неё сетка
   вылезает за край панели. */
const PANEL = { width: 328, height: 336 }

/** YYYY-MM-DD → ДД.ММ.ГГГГ */
function toHuman(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const [year, month, day] = value.split("-")
  return `${ day }.${ month }.${ year }`
}

/**
 * ДД.ММ.ГГГГ → YYYY-MM-DD.
 *
 * Возвращает null, если дата не разобралась или такого дня нет: 31.02 не
 * должно молча превращаться во второе марта.
 */
function toIso(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null

  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-")
}

/** Полдень, а не полночь: так перевод часов не сдвигает день на соседний. */
function toDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

function fromDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

/**
 * Поле даты.
 *
 * Дату можно набрать и выбрать. Набрать — потому что кладовщик, который знает
 * число, впечатает его быстрее, чем доберётся мышью до нужной клетки; выбрать —
 * потому что «какая пятница была на той неделе» руками не считают.
 *
 * Поле текстовое в формате ДД.ММ.ГГГГ, а не `<input type="date">`: нативное
 * показывает дату в формате локали системы, и на английской Windows кладовщик
 * увидел бы mm/dd/yyyy в русском интерфейсе.
 *
 * Календарь лежит в потоке страницы с `position: fixed` и координатами от поля:
 * так его не режут прокручиваемые предки и не прячет модальное окно — портал в
 * body ушёл бы под затемнение нативного `<dialog>`.
 */
export function DateInput({ label, value, onChange, helper, fullWidth, required }: DateInputProps) {
  const [text, setText] = useState(() => toHuman(value))
  const [touched, setTouched] = useState(false)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Значение может смениться снаружи — например, при сбросе фильтров.
  useEffect(() => { setText(toHuman(value)) }, [value])

  const invalid = touched && text.trim() !== "" && toIso(text) === null

  function commit() {
    setTouched(true)
    const iso = toIso(text)
    if (text.trim() === "") onChange("")
    else if (iso) onChange(iso)
  }

  function place() {
    const field = fieldRef.current
    if (!field) return
    const box = field.getBoundingClientRect()
    const below = window.innerHeight - box.bottom
    const top = below < PANEL.height + 8 ? box.top - PANEL.height - 4 : box.bottom + 4
    const left = Math.min(box.left, window.innerWidth - PANEL.width - 8)
    setPosition({ left: Math.max(8, left), top: Math.max(8, top) })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  useEffect(() => {
    if (!open) return

    function outside(event: MouseEvent) {
      const target = event.target as Node
      if (fieldRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", outside)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      document.removeEventListener("mousedown", outside)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  return (
    <div ref={ fieldRef } className={ fullWidth ? styles.full : undefined }>
      <TextField
        label={ label }
        value={ text }
        onChange={ (next) => { setText(next); setTouched(false) } }
        onBlur={ commit }
        placeholder="ДД.ММ.ГГГГ"
        endIcon={
          <button
            type="button"
            className={ styles.trigger }
            aria-label="Выбрать дату в календаре"
            aria-expanded={ open }
            onClick={ () => setOpen((current) => !current) }
          >
            <IconCalendar size={ 18 }/>
          </button>
        }
        helper={ invalid ? "Дата в формате ДД.ММ.ГГГГ" : helper }
        error={ invalid }
        fullWidth={ fullWidth }
        required={ required }
      />

      { open && position ? (
        <div
          ref={ panelRef }
          className={ styles.panel }
          style={ { left: position.left, top: position.top, width: PANEL.width } }
        >
          <Suspense fallback={ <Skeleton height={ 300 }/> }>
            <Calendar
              selected={ toDate(value) }
              onSelect={ (day) => {
                onChange(fromDate(day))
                setTouched(false)
                setOpen(false)
              } }
            />
          </Suspense>
        </div>
      ) : null }
    </div>
  )
}
