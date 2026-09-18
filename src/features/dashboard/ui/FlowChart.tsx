import { useMemo } from "react"
import type { ApexOptions } from "apexcharts"
import type { DailyFlow } from "../domain/types"
import { Card } from "../../../ui/Card"
import { Chart } from "../../../ui/Chart"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { useStateColors } from "../../../app/theme/useStateColors"

/** Подпись оси: 17.09 — год на месячном графике только мешает. */
function shortDate(date: string): string {
  const [, month, day] = date.split("-")
  return `${ day }.${ month }`
}

/** Итог ряда служит и легендой: цвет точки тот же, что у линии. */
function Total({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <Stack row align="center" gap={ 1 }>
      <span style={ { width: 10, height: 10, borderRadius: "50%", backgroundColor: color } }/>
      <Text as="span" mono style={ { fontSize: "1.25rem", fontWeight: 700 } }>{ value }</Text>
      <Text tone="secondary">{ label }</Text>
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

  const options = useMemo<ApexOptions>(() => ({
    colors: [series.issued, series.returned],
    chart: { stacked: true },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] },
    },
    xaxis: {
      categories: labels,
      tickAmount: 6,
      labels: { rotate: 0, hideOverlappingLabels: true },
    },
    yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (value) => String(Math.round(value)) } },
  }), [labels, series])

  return (
    <Card>
      <Text variant="h6" as="h2">Движение приборов</Text>
      <Text variant="caption" tone="secondary">Выдачи и возвраты по дням за последний месяц</Text>

      <Stack row gap={ 3 } wrap style={ { marginTop: 12, marginBottom: 4 } }>
        <Total color={ series.issued } value={ totalIssued } label="выдач"/>
        <Total color={ series.returned } value={ totalReturned } label="возвратов"/>
      </Stack>

      <Chart
        type="area"
        height={ 260 }
        series={ [
          { name: "Выдачи", data: issued },
          { name: "Возвраты", data: returned },
        ] }
        options={ options }
      />
    </Card>
  )
}
