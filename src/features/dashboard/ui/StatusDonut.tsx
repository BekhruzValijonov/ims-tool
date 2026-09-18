import { useMemo } from "react"
import type { ApexOptions } from "apexcharts"
import type { StatusSlice } from "../domain/types"
import type { InstrumentStatus } from "../../instruments/domain/types"
import { STATUS_LABELS } from "../../instruments/domain/labels"
import { Card } from "../../../ui/Card"
import { Chart, fillDensity } from "../../../ui/Chart"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { useStateColors } from "../../../app/theme/useStateColors"

/**
 * Состояние парка.
 *
 * Списанные приборы в парк не входят: иначе число в центре разошлось бы со
 * счётчиком «всего приборов» на том же экране, и верить нельзя было бы ни
 * одному из двух. Сколько списано — сказано отдельной строкой.
 */
export function StatusDonut({ slices }: { slices: readonly StatusSlice[] }) {
  const { series, dark } = useStateColors()

  const tone: Record<InstrumentStatus, string> = {
    AVAILABLE: series.available,
    CHECKED_OUT: series.checkedOut,
    IN_REPAIR: series.inRepair,
    IN_VERIFICATION: series.inVerification,
    WRITTEN_OFF: series.writtenOff,
  }

  const live = slices.filter((slice) => slice.status !== "WRITTEN_OFF")
  const writtenOff = slices.find((slice) => slice.status === "WRITTEN_OFF")?.count ?? 0
  const total = live.reduce((sum, slice) => sum + slice.count, 0)

  const options = useMemo<ApexOptions>(() => ({
    colors: live.map((slice) => tone[slice.status]),
    labels: live.map((slice) => STATUS_LABELS[slice.status]),
    stroke: { width: 0 },
    fill: fillDensity(dark),
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            value: { fontSize: "1.75rem", fontWeight: 700, offsetY: 6 },
            total: {
              show: true,
              label: "в парке",
              fontSize: "0.75rem",
              formatter: () => String(total),
            },
          },
        },
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [live.map((slice) => `${ slice.status }:${ slice.count }`).join("|"), series, total, dark])

  return (
    <Card>
      <Text variant="h6" as="h2">Состояние парка</Text>
      <Text variant="caption" tone="secondary">Все приборы, кроме списанных</Text>

      <Chart type="donut" height={ 240 } series={ live.map((slice) => slice.count) } options={ options }/>

      <Stack gap={ 0 } style={ { marginTop: 8 } }>
        { live.map((slice) => (
          <Stack
            key={ slice.status }
            row
            align="center"
            gap={ 1 }
            style={ { padding: "8px 0", borderTop: "1px dashed var(--divider)" } }
          >
            <span style={ {
              width: 10, height: 10, borderRadius: "50%", backgroundColor: tone[slice.status],
            } }/>
            <Text style={ { flexGrow: 1 } }>{ STATUS_LABELS[slice.status] }</Text>
            <Text mono>{ slice.count }</Text>
          </Stack>
        )) }
      </Stack>

      { writtenOff > 0 ? (
        <Text variant="caption" tone="secondary" style={ { display: "block", marginTop: 12 } }>
          Списано за всё время: { writtenOff }
        </Text>
      ) : null }
    </Card>
  )
}
