import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { styled } from "@mui/material/styles"
import { PieChart } from "@mui/x-charts/PieChart"
import { useDrawingArea } from "@mui/x-charts/hooks"
import type { StatusSlice } from "../domain/types"
import { STATUS_LABELS } from "../../instruments/domain/labels"
import type { InstrumentStatus } from "../../instruments/domain/types"
import { MONO, SIZE, TABULAR } from "../../../app/theme/tokens"
import { useStateColors } from "../../../app/theme/useStateColors"

const CenterText = styled("text", {
  shouldForwardProp: (prop) => prop !== "kind",
})<{ kind: "value" | "label" }>(({ theme }) => ({
  textAnchor: "middle",
  dominantBaseline: "central",
  fill: (theme.vars || theme).palette.text.secondary,
  variants: [
    {
      props: { kind: "value" },
      style: {
        fontFamily: MONO,
        fontSize: "1.75rem",
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        fill: (theme.vars || theme).palette.text.primary,
      },
    },
    { props: { kind: "label" }, style: { fontSize: SIZE.caption } },
  ],
}))

function CenterLabel({ value, label }: { value: string; label: string }) {
  const { width, height, left, top } = useDrawingArea()
  const y = top + height / 2 - 8

  return (
    <>
      <CenterText kind="value" x={ left + width / 2 } y={ y }>{ value }</CenterText>
      <CenterText kind="label" x={ left + width / 2 } y={ y + 22 }>{ label }</CenterText>
    </>
  )
}

/**
 * Состояние парка.
 *
 * Списанные приборы в парк не входят: иначе число в центре разошлось бы со
 * счётчиком «всего приборов» на том же экране, и верить нельзя было бы ни
 * одному из двух. Сколько списано — сказано отдельной строкой.
 */
export function StatusDonut({ slices }: { slices: readonly StatusSlice[] }) {
  const { series } = useStateColors()
  const TONE: Record<InstrumentStatus, string> = {
    AVAILABLE: series.available,
    CHECKED_OUT: series.checkedOut,
    IN_REPAIR: series.inRepair,
    IN_VERIFICATION: series.inVerification,
    WRITTEN_OFF: series.writtenOff,
  }
  const live = slices.filter((slice) => slice.status !== "WRITTEN_OFF")
  const writtenOff = slices.find((slice) => slice.status === "WRITTEN_OFF")?.count ?? 0
  const total = live.reduce((sum, slice) => sum + slice.count, 0)

  return (
    <Paper sx={ { p: 2 } }>
      <Typography variant="h6" component="h2">Состояние парка</Typography>
      <Typography variant="caption" sx={ { color: "text.secondary" } }>
        Все приборы, кроме списанных
      </Typography>

      <Box sx={ { display: "flex", justifyContent: "center", my: 1 } }>
        <PieChart
          colors={ live.map((slice) => TONE[slice.status]) }
          margin={ { left: 0, right: 0, top: 0, bottom: 0 } }
          series={ [{
            data: live.map((slice) => ({ label: STATUS_LABELS[slice.status], value: slice.count })),
            innerRadius: 62,
            outerRadius: 88,
            paddingAngle: 1.5,
            cornerRadius: 2,
            highlightScope: { fade: "global", highlight: "item" },
          }] }
          height={ 190 }
          width={ 190 }
          hideLegend
        >
          <CenterLabel value={ String(total) } label="в парке"/>
        </PieChart>
      </Box>

      <Stack sx={ { gap: 0.25 } }>
        { live.map((slice) => (
          <Stack
            key={ slice.status }
            direction="row"
            sx={ {
              alignItems: "center",
              gap: 1,
              py: 0.5,
              borderTop: 1,
              borderColor: "divider",
            } }
          >
            <Box sx={ {
              width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
              backgroundColor: TONE[slice.status],
            } }/>
            <Typography variant="body2" sx={ { flexGrow: 1 } }>
              { STATUS_LABELS[slice.status] }
            </Typography>
            <Typography variant="body2" sx={ { fontFamily: MONO, ...TABULAR } }>
              { slice.count }
            </Typography>
          </Stack>
        )) }
      </Stack>

      { writtenOff > 0 ? (
        <Typography variant="caption" sx={ { color: "text.secondary", display: "block", mt: 1 } }>
          Списано за всё время: { writtenOff }
        </Typography>
      ) : null }
    </Paper>
  )
}
