import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { SparkLineChart } from "@mui/x-charts/SparkLineChart"
import { lineClasses } from "@mui/x-charts/LineChart"
import { MONO, SIZE, TABULAR } from "../../../app/theme/tokens"

export interface Gauge {
  readonly key: string
  readonly label: string
  readonly value: number
  /** Значения по дням за окно наблюдения — ровно те, из которых сложилось value. */
  readonly series: readonly number[]
  readonly color: string
}

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={ id } x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={ color } stopOpacity={ 0.28 }/>
        <stop offset="100%" stopColor={ color } stopOpacity={ 0 }/>
      </linearGradient>
    </defs>
  )
}

/**
 * Изменение за окно — штуками, а не процентами.
 *
 * «+700%» при росте с одного прибора до восьми технически верно и бесполезно:
 * на малых числах процент говорит о размере базы, а не о событии. Кладовщику
 * нужно «стало на семь больше».
 */
function deltaText(series: readonly number[]): string {
  const first = series[0] ?? 0
  const last = series[series.length - 1] ?? 0
  const delta = last - first
  if (delta === 0) return "без изменений за месяц"
  return `${ delta > 0 ? "+" : "−" }${ Math.abs(delta) } за месяц`
}

/**
 * Приборная панель.
 *
 * Пять счётчиков — это одно показание, а не пять независимых карточек,
 * поэтому они лежат на одном листе и разделены волосяными линиями, как шкалы
 * на панели прибора. Числа набраны моноширинным с ровными цифрами: их
 * сравнивают между собой и с вчерашними.
 */
export function GaugeCluster({ gauges, labels }: { gauges: readonly Gauge[]; labels: readonly string[] }) {
  return (
    <Paper sx={ { overflow: "hidden" } }>
      <Stack
        direction={ { xs: "column", sm: "row" } }
        divider={ <Divider orientation="vertical" flexItem sx={ { borderStyle: "solid" } }/> }
      >
        { gauges.map((gauge) => (
          <Box key={ gauge.key } data-gauge={ gauge.key } sx={ { p: 2, flex: 1, minWidth: 0 } }>
            <Typography
              component="p"
              sx={ {
                fontFamily: MONO,
                fontSize: SIZE.readout,
                fontWeight: 500,
                lineHeight: 1.1,
                ...TABULAR,
              } }
            >
              { gauge.value.toLocaleString("ru-RU") }
            </Typography>
            <Typography variant="subtitle2" sx={ { mt: 0.25 } }>{ gauge.label }</Typography>
            <Typography variant="caption" sx={ { color: "text.secondary" } }>
              { deltaText(gauge.series) }
            </Typography>

            <Box sx={ { height: 38, mt: 1 } }>
              <SparkLineChart
                color={ gauge.color }
                data={ [...gauge.series] }
                area
                showHighlight
                showTooltip
                xAxis={ { scaleType: "band", data: [...labels] } }
                sx={ { [`& .${ lineClasses.area }`]: { fill: `url(#gauge-${ gauge.key })` } } }
              >
                <AreaGradient color={ gauge.color } id={ `gauge-${ gauge.key }` }/>
              </SparkLineChart>
            </Box>
          </Box>
        )) }
      </Stack>
    </Paper>
  )
}
