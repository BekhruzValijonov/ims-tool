import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Card from "@mui/material/Card"
import Skeleton from "@mui/material/Skeleton"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { PageHeader } from "../shared/ui/PageHeader"
import { StatCards, type Gauge } from "../features/dashboard/ui/StatCards"
import { AttentionBanner } from "../features/dashboard/ui/AttentionBanner"
import StraightenIcon from "@mui/icons-material/Straighten"
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined"
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined"
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined"
import { FirstRun } from "../features/dashboard/ui/FirstRun"
import { FlowChart } from "../features/dashboard/ui/FlowChart"
import { DepartmentBarChart } from "../features/dashboard/ui/DepartmentBarChart"
import { StatusDonut } from "../features/dashboard/ui/StatusDonut"
import { PlacementList } from "../features/dashboard/ui/PlacementList"
import { OperationsGrid } from "../features/operations/ui/OperationsGrid"
import { toOperationRows } from "../features/operations/ui/operationRows"
import type { Instrument } from "../features/instruments/domain/types"
import { DAY_MS } from "../shared/dates"
import { COLORS } from "../app/theme/tokens"
import { useStateColors } from "../app/theme/useStateColors"

const WINDOW_DAYS = 30
const RECENT_LIMIT = 8

/** Подпись оси спарклайна: 17.09 */
function shortDate(date: string): string {
  const [, month, day] = date.split("-")
  return `${ day }.${ month }`
}

export function DashboardPage() {
  const repo = useRepo()
  const directories = useDirectories()
  const { series, state: tone, dark } = useStateColors()

  const state = useAsync(async () => {
    const now = Date.now()
    const from = now - WINDOW_DAYS * DAY_MS

    const [counters, history, flow, recent, breakdown, departments, locations] = await Promise.all([
      repo.dashboard.counters(now),
      repo.dashboard.statusHistory(from, now),
      repo.dashboard.flow(from, now),
      repo.dashboard.recent(RECENT_LIMIT),
      repo.dashboard.statusBreakdown(),
      repo.directories.departmentSummary(),
      repo.directories.locationSummary(),
    ])

    /* Приборы подтягиваются точечно по тем событиям, что попали в таблицу:
       грузить весь реестр ради восьми строк незачем. */
    const ids = [...new Set(recent.map((event) => event.instrumentId))]
    const loaded = await Promise.all(ids.map((id) => repo.instruments.getById(id)))
    const instruments = new Map<string, Instrument>()
    for (const instrument of loaded) if (instrument) instruments.set(instrument.id, instrument)

    return { counters, history, flow, recent, breakdown, departments, locations, instruments }
  }, [repo])

  if (state.error) return <Alert severity="error">{ state.error }</Alert>

  if (!state.data || !directories.data) {
    return (
      <Box>
        <PageHeader title="Дашборд"/>
        <Skeleton variant="rounded" height={ 148 } sx={ { mb: 2 } }/>
        <Skeleton variant="rounded" height={ 320 }/>
      </Box>
    )
  }

  const { counters, history, flow, recent, breakdown, departments, locations, instruments } = state.data

  /* Пустая база — это не «дашборд с нулями», а другой экран: человеку нужен
     порядок действий, а не четыре нуля и пустые графики. */
  if (counters.total === 0 && counters.writtenOff === 0) {
    return (
      <Box>
        <PageHeader title="Дашборд" hint="Что происходит с приборами прямо сейчас"/>
        <FirstRun/>
      </Box>
    )
  }

  const labels = history.map((day) => shortDate(day.date))

  const neutral = dark ? COLORS.grey["500"] : COLORS.grey["600"]
  const gauges: Gauge[] = [
    {
      key: "total", label: "Всего приборов", value: counters.total,
      color: neutral, soft: tone.goneSoft, icon: <StraightenIcon/>,
      series: history.map((day) => day.total),
    },
    {
      key: "available", label: "В наличии", value: counters.available,
      color: series.available, soft: tone.okSoft, icon: <CheckCircleOutlinedIcon/>,
      series: history.map((day) => day.available),
    },
    {
      key: "checked-out", label: "Выдано", value: counters.checkedOut,
      color: series.checkedOut, soft: tone.workSoft, icon: <PersonOutlinedIcon/>,
      series: history.map((day) => day.checkedOut),
    },
    {
      key: "in-repair", label: "В ремонте", value: counters.inRepair,
      color: series.inRepair, soft: tone.waitSoft, icon: <BuildOutlinedIcon/>,
      series: history.map((day) => day.inRepair),
    },
  ]

  return (
    <Box>
      <PageHeader title="Дашборд" hint="Что происходит с приборами прямо сейчас"/>

      <Stack sx={ { gap: 2 } }>
        <StatCards gauges={ gauges } labels={ labels }/>
        <AttentionBanner overdue={ counters.overdue } verificationDue={ counters.verificationDue }/>

        <Grid container spacing={ 2 } columns={ 12 } sx={ { alignItems: "flex-start" } }>
          <Grid size={ { xs: 12, lg: 7 } }>
            <Stack sx={ { gap: 2 } }>
              <FlowChart flow={ flow }/>
              <DepartmentBarChart summary={ departments }/>
            </Stack>
          </Grid>
          <Grid size={ { xs: 12, lg: 5 } }>
            <Stack sx={ { gap: 2 } }>
              <StatusDonut slices={ breakdown }/>
              <PlacementList departments={ departments } locations={ locations }/>
            </Stack>
          </Grid>
        </Grid>

        <Box>
          <Stack
            direction="row"
            sx={ { alignItems: "baseline", justifyContent: "space-between", mb: 1 } }
          >
            <Typography variant="h5" component="h2">Последние операции</Typography>
            <Typography variant="caption" sx={ { color: "text.secondary" } }>
              Полный журнал — в разделе «Операции»
            </Typography>
          </Stack>
          <Card>
            <OperationsGrid
              rows={ toOperationRows(recent, instruments, directories.data) }
              dense
            />
          </Card>
        </Box>
      </Stack>
    </Box>
  )
}
