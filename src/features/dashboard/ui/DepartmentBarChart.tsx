import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import { BarChart } from "@mui/x-charts/BarChart"
import type { DepartmentSummary } from "../../directories/domain/types"
import { useStateColors } from "../../../app/theme/useStateColors"

/**
 * Приборы по подразделениям.
 *
 * Считается по балансовой принадлежности, а не по текущему месту: вопрос
 * здесь «сколько числится за цехом», а не «сколько физически в цехе». Прибор,
 * уехавший в лабораторию на неделю, продолжает числиться за своим цехом.
 */
export function DepartmentBarChart({ summary }: { summary: readonly DepartmentSummary[] }) {
  const { series } = useStateColors()
  const rows = summary.filter((row) => row.total > 0)
  const SERIES = [
    { id: "available", label: "В наличии", color: series.available },
    { id: "checkedOut", label: "Выдано", color: series.checkedOut },
    { id: "inRepair", label: "В ремонте", color: series.inRepair },
    { id: "inVerification", label: "На поверке", color: series.inVerification },
  ] as const

  return (
    <Paper sx={ { p: 2 } }>
      <Typography variant="h6" component="h2">Числится за подразделениями</Typography>
      <Typography variant="caption" sx={ { color: "text.secondary" } }>
        Столбец — подразделение, цвет — состояние приборов
      </Typography>

      <Stack direction="row" sx={ { gap: 2, mt: 1.5, flexWrap: "wrap" } }>
        { SERIES.map((series) => (
          <Stack key={ series.id } direction="row" sx={ { alignItems: "center", gap: 0.75 } }>
            <Box sx={ { width: 9, height: 9, borderRadius: "50%", backgroundColor: series.color } }/>
            <Typography variant="caption" sx={ { color: "text.secondary" } }>{ series.label }</Typography>
          </Stack>
        )) }
      </Stack>

      <BarChart
        borderRadius={ 6 }
        colors={ SERIES.map((series) => series.color) }
        xAxis={ [{
          scaleType: "band",
          categoryGapRatio: 0.55,
          data: rows.map((row) => row.name),
          height: 24,
        }] }
        yAxis={ [{ width: 32 }] }
        series={ SERIES.map((series) => ({
          id: series.id,
          label: series.label,
          data: rows.map((row) => row[series.id]),
          stack: "A",
        })) }
        height={ 232 }
        margin={ { left: 0, right: 0, top: 16, bottom: 0 } }
        grid={ { horizontal: true } }
        hideLegend
      />
    </Paper>
  )
}
