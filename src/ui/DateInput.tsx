import { useEffect, useState } from "react"
import { TextField } from "./Field"
import { IconCalendar } from "./icons"

interface DateInputProps {
  readonly label?: string
  /** Дата как YYYY-MM-DD; пустая строка — значение не задано. */
  readonly value: string
  onChange(value: string): void
  readonly helper?: string
  readonly fullWidth?: boolean
  readonly required?: boolean
}

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

/**
 * Поле даты.
 *
 * Обычный текстовый ввод в формате ДД.ММ.ГГГГ, а не `<input type="date">`:
 * нативное поле показывает дату в формате локали системы, и на английской
 * Windows кладовщик увидел бы mm/dd/yyyy в русском интерфейсе. Здесь формат
 * задан приложением и одинаков везде.
 */
export function DateInput({ label, value, onChange, helper, fullWidth, required }: DateInputProps) {
  const [text, setText] = useState(() => toHuman(value))
  const [touched, setTouched] = useState(false)

  // Значение может смениться снаружи — например, при сбросе фильтров.
  useEffect(() => { setText(toHuman(value)) }, [value])

  const invalid = touched && text.trim() !== "" && toIso(text) === null

  function commit() {
    setTouched(true)
    const iso = toIso(text)
    if (text.trim() === "") onChange("")
    else if (iso) onChange(iso)
  }

  return (
    <TextField
      label={ label }
      value={ text }
      onChange={ (next) => { setText(next); setTouched(false) } }
      onBlur={ commit }
      placeholder="ДД.ММ.ГГГГ"
      endIcon={ <IconCalendar size={ 18 }/> }
      helper={ invalid ? "Дата в формате ДД.ММ.ГГГГ" : helper }
      error={ invalid }
      fullWidth={ fullWidth }
      required={ required }
    />
  )
}
