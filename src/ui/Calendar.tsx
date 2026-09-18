import { DayPicker } from "react-day-picker"
import { ru } from "react-day-picker/locale"
import "react-day-picker/style.css"
import "./calendar.css"

interface CalendarProps {
  /** Выбранный день или `null`, когда поле пустое. */
  readonly selected: Date | null
  onSelect(day: Date): void
}

/**
 * Календарь.
 *
 * Отдельным модулем, чтобы подгружаться по нажатию: сам по себе он весит
 * больше любого экрана, а открывают его изредка — большинство дат кладовщик
 * набирает с клавиатуры быстрее, чем доберётся мышью до нужной клетки.
 *
 * Неделя начинается с понедельника, подписи русские: календарь на заводе
 * читают тот же, что висит на стене.
 */
export default function Calendar({ selected, onSelect }: CalendarProps) {
  return (
    <DayPicker
      className="app-calendar"
      mode="single"
      locale={ ru }
      weekStartsOn={ 1 }
      showOutsideDays
      selected={ selected ?? undefined }
      month={ selected ?? undefined }
      defaultMonth={ selected ?? undefined }
      onSelect={ (day) => { if (day) onSelect(day) } }
      autoFocus
    />
  )
}
