import dayjs from "dayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"

interface DateFieldProps {
  readonly label: string
  /** Дата как YYYY-MM-DD; пустая строка — значение не задано. */
  readonly value: string
  onChange(value: string): void
  readonly helperText?: string
  readonly size?: "small" | "medium"
  readonly fullWidth?: boolean
  readonly minDate?: string
  readonly sx?: object
}

/**
 * Поле даты.
 *
 * Нативный `<input type="date">` показывает дату в формате локали браузера:
 * на английской системе — mm/dd/yyyy, и кладовщик видит чужой формат в
 * русском интерфейсе. Здесь формат задан приложением и одинаков везде.
 *
 * Наружу поле работает строками YYYY-MM-DD: так его значение кладётся прямо в
 * адрес страницы и в состояние форм, без Dayjs в каждом вызывающем модуле.
 */
export function DateField({
  label, value, onChange, helperText, size = "small", fullWidth, minDate, sx,
}: DateFieldProps) {
  const parsed = value ? dayjs(value) : null
  const min = minDate ? dayjs(minDate) : undefined

  return (
    <DatePicker
      label={ label }
      format="DD.MM.YYYY"
      value={ parsed && parsed.isValid() ? parsed : null }
      minDate={ min && min.isValid() ? min : undefined }
      onChange={ (next) => onChange(next && next.isValid() ? next.format("YYYY-MM-DD") : "") }
      slotProps={ {
        textField: { size, fullWidth, helperText, sx },
        field: { clearable: true },
      } }
    />
  )
}
