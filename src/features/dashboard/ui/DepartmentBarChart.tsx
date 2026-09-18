import { useMemo } from "react"
import type { ApexOptions } from "apexcharts"
import type { DepartmentSummary } from "../../directories/domain/types"
import { Card } from "../../../ui/Card"
import { Chart } from "../../../ui/Chart"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
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

  const legend = [
    { label: "В наличии", color: series.available },
    { label: "Выдано", color: series.checkedOut },
    { label: "В ремонте", color: series.inRepair },
    { label: "На поверке", color: series.inVerification },
  ]

  const options = useMemo<ApexOptions>(() => ({
    colors: legend.map((item) => item.color),
    chart: { stacked: true },
    plotOptions: { bar: { columnWidth: "48%", borderRadius: 4, borderRadiusApplication: "end" } },
    xaxis: { categories: rows.map((row) => row.name) },
    yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (value) => String(Math.round(value)) } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rows.map((row) => row.name).join("|"), series])

  return (
    <Card>
      <Text variant="h6" as="h2">Числится за подразделениями</Text>
      <Text variant="caption" tone="secondary">Столбец — подразделение, цвет — состояние приборов</Text>

      <Stack row gap={ 2 } wrap style={ { marginTop: 12 } }>
        { legend.map((item) => (
          <Stack key={ item.label } row align="center" gap={ 0.75 }>
            <span style={ { width: 10, height: 10, borderRadius: "50%", backgroundColor: item.color } }/>
            <Text variant="caption" tone="secondary">{ item.label }</Text>
          </Stack>
        )) }
      </Stack>

      <Chart
        type="bar"
        height={ 260 }
        series={ [
          { name: "В наличии", data: rows.map((row) => row.available) },
          { name: "Выдано", data: rows.map((row) => row.checkedOut) },
          { name: "В ремонте", data: rows.map((row) => row.inRepair) },
          { name: "На поверке", data: rows.map((row) => row.inVerification) },
        ] }
        options={ options }
      />
    </Card>
  )
}
