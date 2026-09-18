import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useTheme } from "@mui/material/styles"
import { BarChart } from "@mui/x-charts/BarChart"
import type { DepartmentSummary } from "../../directories/domain/types"

/**
 * Приборы по подразделениям.
 *
 * Считается по балансовой принадлежности, а не по текущему месту: вопрос здесь
 * «сколько числится за цехом», а не «сколько физически лежит в цехе». Прибор,
 * уехавший в лабораторию на неделю, продолжает числиться за своим цехом.
 */
export function DepartmentBarChart({ summary }: { summary: readonly DepartmentSummary[] }) {
  const theme = useTheme()
  const rows = summary.filter((row) => row.total > 0)
  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <Card variant="outlined" sx={ { width: "100%" } }>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>Приборы по подразделениям</Typography>
        <Stack sx={ { justifyContent: "space-between" } }>
          <Stack direction="row" sx={ { alignItems: "center", gap: 1 } }>
            <Typography variant="h4" component="p">{ total }</Typography>
            <Chip size="small" label={ `${ rows.length } подразделений` }/>
          </Stack>
          <Typography variant="caption" sx={ { color: "text.secondary" } }>
            Числится за подразделением, с разбивкой по состоянию
          </Typography>
        </Stack>
        <BarChart
          borderRadius={ 8 }
          colors={ [
            theme.palette.primary.dark,
            theme.palette.primary.main,
            theme.palette.primary.light,
            theme.palette.grey[400],
          ] }
          xAxis={ [{
            scaleType: "band",
            categoryGapRatio: 0.5,
            data: rows.map((row) => row.name),
            height: 24,
          }] }
          yAxis={ [{ width: 40 }] }
          series={ [
            { id: "available", label: "В наличии", data: rows.map((row) => row.available), stack: "A" },
            { id: "checkedOut", label: "Выдано", data: rows.map((row) => row.checkedOut), stack: "A" },
            { id: "inRepair", label: "В ремонте", data: rows.map((row) => row.inRepair), stack: "A" },
            { id: "inVerification", label: "На поверке", data: rows.map((row) => row.inVerification), stack: "A" },
          ] }
          height={ 250 }
          margin={ { left: 0, right: 0, top: 20, bottom: 0 } }
          grid={ { horizontal: true } }
          hideLegend
        />
      </CardContent>
    </Card>
  )
}
