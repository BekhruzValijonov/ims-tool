import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useTheme } from "@mui/material/styles"
import { SparkLineChart } from "@mui/x-charts/SparkLineChart"
import { lineClasses } from "@mui/x-charts/LineChart"

export interface StatCardProps {
  readonly title: string
  readonly value: number
  readonly caption: string
  /** Значения по дням за окно наблюдения. Ровно те, из которых сложилось value. */
  readonly series: readonly number[]
  readonly labels: readonly string[]
  /** Рост — это хорошо или плохо. У «в ремонте» рост плохой, у «в наличии» — хороший. */
  readonly growthIsGood?: boolean
}

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={ id } x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={ color } stopOpacity={ 0.3 }/>
        <stop offset="100%" stopColor={ color } stopOpacity={ 0 }/>
      </linearGradient>
    </defs>
  )
}

/**
 * Плитка дашборда.
 *
 * Отличие от шаблона MUI: и число, и спарклайн, и подпись изменения берутся из
 * одного ряда, посчитанного по журналу. В шаблоне рост был константой в вёрстке
 * — здесь он обязан сходиться с графиком под ним.
 */
export function StatCard({ title, value, caption, series, labels, growthIsGood = true }: StatCardProps) {
  const theme = useTheme()

  const first = series.find((point) => point > 0) ?? series[0] ?? 0
  const last = series[series.length - 1] ?? 0
  const delta = first === 0 ? 0 : Math.round(((last - first) / first) * 100)
  const trend: "up" | "down" | "neutral" = delta > 2 ? "up" : delta < -2 ? "down" : "neutral"

  const good = trend === "neutral" ? "neutral" : (trend === "up") === growthIsGood ? "good" : "bad"
  const chipColor = good === "good" ? "success" : good === "bad" ? "error" : "default"
  const chartColor = good === "good"
    ? theme.palette.success.main
    : good === "bad" ? theme.palette.error.main : theme.palette.grey[400]

  const gradientId = `stat-gradient-${ title.replace(/\s/g, "-") }`

  return (
    <Card variant="outlined" sx={ { height: "100%", flexGrow: 1 } }>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>{ title }</Typography>
        <Stack direction="column" sx={ { justifyContent: "space-between", flexGrow: 1, gap: 1 } }>
          <Stack sx={ { justifyContent: "space-between" } }>
            <Stack direction="row" sx={ { justifyContent: "space-between", alignItems: "center" } }>
              <Typography variant="h4" component="p">{ value.toLocaleString("ru-RU") }</Typography>
              <Chip size="small" color={ chipColor } label={ `${ delta > 0 ? "+" : "" }${ delta }%` }/>
            </Stack>
            <Typography variant="caption" sx={ { color: "text.secondary" } }>{ caption }</Typography>
          </Stack>
          <Box sx={ { width: "100%", height: 50 } }>
            <SparkLineChart
              color={ chartColor }
              data={ [...series] }
              area
              showHighlight
              showTooltip
              xAxis={ { scaleType: "band", data: [...labels] } }
              sx={ { [`& .${ lineClasses.area }`]: { fill: `url(#${ gradientId })` } } }
            >
              <AreaGradient color={ chartColor } id={ gradientId }/>
            </SparkLineChart>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
