import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { LineChart } from "@mui/x-charts/LineChart"
import type { DailyFlow } from "../domain/types"
import { MONO, TABULAR } from "../../../app/theme/tokens"
import { useStateColors } from "../../../app/theme/useStateColors"

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={ id } x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={ color } stopOpacity={ 0.45 }/>
        <stop offset="100%" stopColor={ color } stopOpacity={ 0 }/>
      </linearGradient>
    </defs>
  )
}

/** Подпись оси: 17.09 — год на месячном графике только мешает. */
function shortDate(date: string): string {
  const [, month, day] = date.split("-")
  return `${ day }.${ month }`
}

/** Итог ряда служит и легендой: цвет точки тот же, что у линии. */
function Total({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <Stack direction="row" sx={ { alignItems: "baseline", gap: 1 } }>
      <Box sx={ { width: 9, height: 9, borderRadius: "50%", backgroundColor: color, alignSelf: "center" } }/>
      <Typography sx={ { fontFamily: MONO, fontSize: "1.25rem", fontWeight: 500, ...TABULAR } }>
        { value }
      </Typography>
      <Typography variant="body2" sx={ { color: "text.secondary" } }>{ label }</Typography>
    </Stack>
  )
}

export function FlowChart({ flow }: { flow: readonly DailyFlow[] }) {
  const { series } = useStateColors()
  const labels = flow.map((day) => shortDate(day.date))
  const issued = flow.map((day) => day.checkedOut)
  const returned = flow.map((day) => day.returned)
  const totalIssued = issued.reduce((sum, value) => sum + value, 0)
  const totalReturned = returned.reduce((sum, value) => sum + value, 0)

  return (
    <Card sx={ { p: 2 } }>
      <Typography variant="h6" component="h2">Движение приборов</Typography>
      <Typography variant="caption" sx={ { color: "text.secondary" } }>
        Выдачи и возвраты по дням за последний месяц
      </Typography>

      <Stack direction="row" sx={ { gap: 3, mt: 1.5, flexWrap: "wrap" } }>
        <Total color={ series.issued } value={ totalIssued } label="выдач"/>
        <Total color={ series.returned } value={ totalReturned } label="возвратов"/>
      </Stack>

      <LineChart
        colors={ [series.issued, series.returned] }
        xAxis={ [{
          scaleType: "point",
          data: labels,
          tickInterval: (_value, index) => (index + 1) % 5 === 0,
          height: 24,
        }] }
        yAxis={ [{ width: 32 }] }
        series={ [
          {
            id: "issued", label: "Выдачи", showMark: false, curve: "linear",
            area: true, stack: "total", stackOrder: "ascending", data: issued,
          },
          {
            id: "returned", label: "Возвраты", showMark: false, curve: "linear",
            area: true, stack: "total", stackOrder: "ascending", data: returned,
          },
        ] }
        height={ 232 }
        margin={ { left: 0, right: 8, top: 16, bottom: 0 } }
        grid={ { horizontal: true } }
        sx={ {
          "& .MuiAreaElement-series-issued": { fill: "url('#flow-issued')" },
          "& .MuiAreaElement-series-returned": { fill: "url('#flow-returned')" },
        } }
        hideLegend
      >
        <AreaGradient color={ series.issued } id="flow-issued"/>
        <AreaGradient color={ series.returned } id="flow-returned"/>
      </LineChart>
    </Card>
  )
}
