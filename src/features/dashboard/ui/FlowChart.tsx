import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useTheme } from "@mui/material/styles"
import { LineChart } from "@mui/x-charts/LineChart"
import type { DailyFlow } from "../domain/types"

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={ id } x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={ color } stopOpacity={ 0.5 }/>
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

export function FlowChart({ flow }: { flow: readonly DailyFlow[] }) {
  const theme = useTheme()
  const labels = flow.map((day) => shortDate(day.date))
  const issued = flow.map((day) => day.checkedOut)
  const returned = flow.map((day) => day.returned)
  const totalIssued = issued.reduce((sum, value) => sum + value, 0)
  const totalReturned = returned.reduce((sum, value) => sum + value, 0)

  return (
    <Card variant="outlined" sx={ { width: "100%" } }>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>Движение приборов</Typography>
        <Stack sx={ { justifyContent: "space-between" } }>
          <Stack direction="row" sx={ { alignItems: "center", gap: 1 } }>
            <Typography variant="h4" component="p">{ totalIssued }</Typography>
            <Chip size="small" color="default" label={ `возвращено ${ totalReturned }` }/>
          </Stack>
          <Typography variant="caption" sx={ { color: "text.secondary" } }>
            Выдачи и возвраты по дням за последний месяц
          </Typography>
        </Stack>
        <LineChart
          colors={ [theme.palette.primary.main, theme.palette.primary.light] }
          xAxis={ [{
            scaleType: "point",
            data: labels,
            tickInterval: (_value, index) => (index + 1) % 5 === 0,
            height: 24,
          }] }
          yAxis={ [{ width: 40 }] }
          series={ [
            {
              id: "issued",
              label: "Выдачи",
              showMark: false,
              curve: "linear",
              area: true,
              stack: "total",
              stackOrder: "ascending",
              data: issued,
            },
            {
              id: "returned",
              label: "Возвраты",
              showMark: false,
              curve: "linear",
              area: true,
              stack: "total",
              stackOrder: "ascending",
              data: returned,
            },
          ] }
          height={ 250 }
          margin={ { left: 0, right: 20, top: 20, bottom: 0 } }
          grid={ { horizontal: true } }
          sx={ {
            "& .MuiAreaElement-series-issued": { fill: "url('#flow-issued')" },
            "& .MuiAreaElement-series-returned": { fill: "url('#flow-returned')" },
          } }
          hideLegend
        >
          <AreaGradient color={ theme.palette.primary.main } id="flow-issued"/>
          <AreaGradient color={ theme.palette.primary.light } id="flow-returned"/>
        </LineChart>
      </CardContent>
    </Card>
  )
}
