import type { ReactNode } from "react"
import { Card } from "../../../ui/Card"
import { Grid, Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { Sparkline } from "../../../ui/Chart"

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

/**
 * Изменение за окно — штуками, а не процентами.
 *
 * «+700%» при росте с одного прибора до восьми технически верно и бесполезно:
 * на малых числах процент говорит о размере базы, а не о событии.
 */
function delta(series: readonly number[]): { text: string; changed: boolean } {
  const first = series[0] ?? 0
  const last = series[series.length - 1] ?? 0
  const value = last - first
  if (value === 0) return { text: "без изменений", changed: false }
  return { text: `${ value > 0 ? "+" : "−" }${ Math.abs(value) } за месяц`, changed: true }
}

export function StatCards({ gauges }: { gauges: readonly Gauge[] }) {
  return (
    <Grid cols={ { xs: 1, sm: 2, md: 4 } } gap={ 2 }>
      { gauges.map((gauge) => {
        const change = delta(gauge.series)

        return (
          <Card key={ gauge.key } padding="none">
            <div data-gauge={ gauge.key } style={ { padding: 20 } }>
              <Stack row align="start" gap={ 2 }>
                <Stack grow gap={ 0.5 }>
                  <Stack row align="baseline" gap={ 1.5 } wrap>
                    <Text variant="h4" as="p" mono style={ { fontSize: "2rem", lineHeight: 1.1 } }>
                      { gauge.value.toLocaleString("ru-RU") }
                    </Text>
                    <Text
                      variant="caption"
                      style={ { fontWeight: 600, color: change.changed ? gauge.color : "var(--text-secondary)" } }
                    >
                      { change.text }
                    </Text>
                  </Stack>
                  <Text variant="body2" tone="secondary">{ gauge.label }</Text>
                </Stack>

                <span
                  style={ {
                    width: 40, height: 40, flexShrink: 0,
                    display: "grid", placeItems: "center",
                    borderRadius: 12,
                    backgroundColor: gauge.soft,
                    color: gauge.color,
                  } }
                >
                  { gauge.icon }
                </span>
              </Stack>

              <Sparkline data={ gauge.series } color={ gauge.color }/>
            </div>
          </Card>
        )
      }) }
    </Grid>
  )
}
