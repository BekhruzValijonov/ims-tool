import Box from "@mui/material/Box"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import type { InstrumentStatus } from "../domain/types"
import { STATUS_LABELS } from "../domain/labels"
import { useStateColors } from "../../../app/theme/useStateColors"

/**
 * Состояние прибора: точка и слово.
 *
 * Пилюля в каждой строке таблицы превращает список в рябь, а цвет без слова
 * нечитаем для тех, кто его не различает. Списанный прибор помечен пустой
 * точкой — он отличается от остальных и формой, а не только цветом.
 */
export function StatusMark({ status, bold }: { status: InstrumentStatus; bold?: boolean }) {
  const { state } = useStateColors()
  const color = {
    AVAILABLE: state.ok,
    CHECKED_OUT: state.work,
    IN_REPAIR: state.wait,
    IN_VERIFICATION: state.wait,
    WRITTEN_OFF: state.gone,
  }[status]
  const hollow = status === "WRITTEN_OFF"

  return (
    <Stack direction="row" sx={ { alignItems: "center", gap: 1, minWidth: 0 } }>
      <Box
        sx={ {
          width: 9,
          height: 9,
          borderRadius: "50%",
          flexShrink: 0,
          backgroundColor: hollow ? "transparent" : color,
          border: hollow ? `1.5px solid ${ color }` : "none",
        } }
      />
      <Typography variant="body2" noWrap sx={ { fontWeight: bold ? 500 : 400 } }>
        { STATUS_LABELS[status] }
      </Typography>
    </Stack>
  )
}
