import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Card from "@mui/material/Card"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { SparkLineChart } from "@mui/x-charts/SparkLineChart"
import { lineClasses } from "@mui/x-charts/LineChart"
import { BADGE_RADIUS, MONO, SIZE, TABULAR } from "../../../app/theme/tokens"

export interface Gauge {
  readonly key: string
  readonly label: string
  readonly value: number
  /** Значения по дням за окно наблюдения — ровно те, из которых сложилось value. */
  readonly series: readonly number[]
  readonly color: string
  readonly soft: string
  readonly icon: ReactNode
}

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={ id } x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={ color } stopOpacity={ 0.35 }/>
        <stop offset="100%" stopColor={ color } stopOpacity={ 0 }/>
      </linearGradient>
    </defs>
  )
}

/**
 * Изменение за окно — штуками, а не процентами.
 *
 * «+700%» при росте с одного прибора до восьми технически верно и бесполезно:
 * на малых числах процент говорит о размере базы, а не о событии.
 */
function delta(series: readonly number[]): { text: string; sign: number } {
  const first = series[0] ?? 0
  const last = series[series.length - 1] ?? 0
  const value = last - first
  if (value === 0) return { text: "без изменений", sign: 0 }
  return { text: `${ value > 0 ? "+" : "−" }${ Math.abs(value) } за месяц`, sign: Math.sign(value) }
}

/**
 * Карточки показаний.
 *
 * Силуэт Corona: крупное число, изменение рядом, квадратный значок справа.
 * Отличие в содержании — и число, и спарклайн, и подпись изменения считаются
 * по одному и тому же ряду из журнала, поэтому карточка не может показать
 * рост, которого не было на графике под ней.
 */
export function StatCards({ gauges, labels }: { gauges: readonly Gauge[]; labels: readonly string[] }) {
  return (
    <Grid container spacing={ 2 } columns={ 12 }>
      { gauges.map((gauge) => {
        const change = delta(gauge.series)

        return (
          <Grid key={ gauge.key } size={ { xs: 12, sm: 6, md: 3 } }>
            <Card data-gauge={ gauge.key } sx={ { p: 2.5, height: "100%" } }>
              <Stack direction="row" sx={ { alignItems: "flex-start", gap: 2 } }>
                <Box sx={ { flexGrow: 1, minWidth: 0 } }>
                  <Stack direction="row" sx={ { alignItems: "baseline", gap: 1.5, flexWrap: "wrap" } }>
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
                    <Typography
                      variant="caption"
                      sx={ { color: change.sign === 0 ? "text.secondary" : gauge.color, fontWeight: 500 } }
                    >
                      { change.text }
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={ { color: "text.secondary", mt: 0.5 } }>
                    { gauge.label }
                  </Typography>
                </Box>

                <Box
                  sx={ {
                    width: 38, height: 38, flexShrink: 0,
                    borderRadius: `${ BADGE_RADIUS }px`,
                    display: "grid", placeItems: "center",
                    backgroundColor: gauge.soft,
                    color: gauge.color,
                    "& svg": { fontSize: 20 },
                  } }
                >
                  { gauge.icon }
                </Box>
              </Stack>

              <Box sx={ { height: 44, mt: 1.5 } }>
                <SparkLineChart
                  color={ gauge.color }
                  data={ [...gauge.series] }
                  area
                  showHighlight
                  showTooltip
                  xAxis={ { scaleType: "band", data: [...labels] } }
                  margin={ { top: 4, right: 0, bottom: 0, left: 0 } }
                  sx={ { [`& .${ lineClasses.area }`]: { fill: `url(#stat-${ gauge.key })` } } }
                >
                  <AreaGradient color={ gauge.color } id={ `stat-${ gauge.key }` }/>
                </SparkLineChart>
              </Box>
            </Card>
          </Grid>
        )
      }) }
    </Grid>
  )
}
