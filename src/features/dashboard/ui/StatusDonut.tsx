import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import LinearProgress, { linearProgressClasses } from "@mui/material/LinearProgress"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { styled } from "@mui/material/styles"
import { PieChart } from "@mui/x-charts/PieChart"
import { useDrawingArea } from "@mui/x-charts/hooks"
import type { StatusSlice } from "../domain/types"
import { STATUS_LABELS } from "../../instruments/domain/labels"

const StyledText = styled("text", {
  shouldForwardProp: (prop) => prop !== "variant",
})<{ variant: "primary" | "secondary" }>(({ theme }) => ({
  textAnchor: "middle",
  dominantBaseline: "central",
  fill: (theme.vars || theme).palette.text.secondary,
  variants: [
    {
      props: { variant: "primary" },
      style: {
        fontSize: theme.typography.h5.fontSize,
        fontWeight: theme.typography.h5.fontWeight,
        fill: (theme.vars || theme).palette.text.primary,
      },
    },
    {
      props: { variant: "secondary" },
      style: { fontSize: theme.typography.body2.fontSize },
    },
  ],
}))

function PieCenterLabel({ primaryText, secondaryText }: { primaryText: string; secondaryText: string }) {
  const { width, height, left, top } = useDrawingArea()
  const primaryY = top + height / 2 - 10

  return (
    <>
      <StyledText variant="primary" x={ left + width / 2 } y={ primaryY }>{ primaryText }</StyledText>
      <StyledText variant="secondary" x={ left + width / 2 } y={ primaryY + 24 }>{ secondaryText }</StyledText>
    </>
  )
}

const COLORS = [
  "hsl(220, 20%, 65%)",
  "hsl(220, 20%, 42%)",
  "hsl(220, 20%, 35%)",
  "hsl(220, 20%, 25%)",
  "hsl(220, 20%, 80%)",
]

export function StatusDonut({ slices }: { slices: readonly StatusSlice[] }) {
  /* Списанные приборы в парк не входят: иначе число в центре разошлось бы с
     плиткой «Всего приборов» на том же экране, и верить нельзя было бы ни
     одному из двух. Сколько списано — сказано отдельной строкой. */
  const live = slices.filter((slice) => slice.status !== "WRITTEN_OFF")
  const writtenOff = slices.find((slice) => slice.status === "WRITTEN_OFF")?.count ?? 0
  const total = live.reduce((sum, slice) => sum + slice.count, 0)
  const data = live.map((slice) => ({ label: STATUS_LABELS[slice.status], value: slice.count }))

  return (
    <Card variant="outlined" sx={ { display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 } }>
      <CardContent>
        <Typography component="h2" variant="subtitle2">Состояние парка</Typography>
        <Box sx={ { display: "flex", alignItems: "center", justifyContent: "center" } }>
          <PieChart
            colors={ COLORS }
            margin={ { left: 80, right: 80, top: 80, bottom: 80 } }
            series={ [{
              data,
              innerRadius: 75,
              outerRadius: 100,
              paddingAngle: 0,
              highlightScope: { fade: "global", highlight: "item" },
            }] }
            height={ 260 }
            width={ 260 }
            hideLegend
          >
            <PieCenterLabel primaryText={ String(total) } secondaryText="всего"/>
          </PieChart>
        </Box>

        { live.map((slice, index) => (
          <Stack key={ slice.status } direction="row" sx={ { alignItems: "center", gap: 2, pb: 2 } }>
            <Stack sx={ { gap: 1, flexGrow: 1 } }>
              <Stack direction="row" sx={ { justifyContent: "space-between", alignItems: "center", gap: 2 } }>
                <Typography variant="body2" sx={ { fontWeight: 500 } }>
                  { STATUS_LABELS[slice.status] }
                </Typography>
                <Typography variant="body2" sx={ { color: "text.secondary" } }>
                  { slice.count }
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={ total === 0 ? 0 : (slice.count / total) * 100 }
                sx={ {
                  [`& .${ linearProgressClasses.bar }`]: {
                    backgroundColor: COLORS[index % COLORS.length],
                  },
                } }
              />
            </Stack>
          </Stack>
        )) }

        { writtenOff > 0 && (
          <Typography variant="caption" sx={ { color: "text.secondary" } }>
            Списано за всё время: { writtenOff }
          </Typography>
        ) }
      </CardContent>
    </Card>
  )
}
