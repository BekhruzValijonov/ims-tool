import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Grid from "@mui/material/Grid"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import Skeleton from "@mui/material/Skeleton"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { StatCard } from "../features/dashboard/ui/StatCard"
import { AttentionCard } from "../features/dashboard/ui/AttentionCard"
import { FlowChart } from "../features/dashboard/ui/FlowChart"
import { DepartmentBarChart } from "../features/dashboard/ui/DepartmentBarChart"
import { StatusDonut } from "../features/dashboard/ui/StatusDonut"
import { LocationTree } from "../features/dashboard/ui/LocationTree"
import { OperationsGrid } from "../features/operations/ui/OperationsGrid"
import { toOperationRows } from "../features/operations/ui/operationRows"
import type { Instrument } from "../features/instruments/domain/types"
import { DAY_MS } from "../shared/dates"

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
      <Grid container spacing={ 2 } columns={ 12 }>
        { Array.from({ length: 4 }, (_, index) => (
          <Grid key={ index } size={ { xs: 12, sm: 6, lg: 3 } }>
            <Skeleton variant="rounded" height={ 160 }/>
          </Grid>
        )) }
        <Grid size={ 12 }><Skeleton variant="rounded" height={ 320 }/></Grid>
      </Grid>
    )
  }

  const { counters, history, flow, recent, breakdown, departments, locations, instruments } = state.data
  const labels = history.map((day) => shortDate(day.date))
  const caption = "За последние 30 дней"

  return (
    <Box sx={ { width: "100%", maxWidth: { sm: "100%", md: "1700px" } } }>
      <Typography component="h2" variant="h6" sx={ { mb: 2 } }>Обзор</Typography>

      <Grid container spacing={ 2 } columns={ 12 } sx={ { mb: 2 } }>
        <Grid size={ { xs: 12, sm: 6, lg: 3 } }>
          <StatCard
            title="Всего приборов" value={ counters.total } caption={ caption }
            series={ history.map((day) => day.total) } labels={ labels }
          />
        </Grid>
        <Grid size={ { xs: 12, sm: 6, lg: 3 } }>
          <StatCard
            title="В наличии" value={ counters.available } caption={ caption }
            series={ history.map((day) => day.available) } labels={ labels }
          />
        </Grid>
        <Grid size={ { xs: 12, sm: 6, lg: 3 } }>
          <StatCard
            title="Выдано" value={ counters.checkedOut } caption={ caption }
            series={ history.map((day) => day.checkedOut) } labels={ labels }
            growthIsGood={ false }
          />
        </Grid>
        <Grid size={ { xs: 12, sm: 6, lg: 3 } }>
          <StatCard
            title="В ремонте" value={ counters.inRepair } caption={ caption }
            series={ history.map((day) => day.inRepair) } labels={ labels }
            growthIsGood={ false }
          />
        </Grid>

        <Grid size={ { xs: 12, md: 8 } }>
          <FlowChart flow={ flow }/>
        </Grid>
        <Grid size={ { xs: 12, md: 4 } }>
          <AttentionCard overdue={ counters.overdue } verificationDue={ counters.verificationDue }/>
        </Grid>

        <Grid size={ { xs: 12, md: 8 } }>
          <DepartmentBarChart summary={ departments }/>
        </Grid>
        <Grid size={ { xs: 12, md: 4 } }>
          <StatusDonut slices={ breakdown }/>
        </Grid>
      </Grid>

      <Typography component="h2" variant="h6" sx={ { mb: 2 } }>Последние операции</Typography>
      <Grid container spacing={ 2 } columns={ 12 }>
        <Grid size={ { xs: 12, lg: 9 } }>
          <Card variant="outlined">
            <CardContent sx={ { p: 0, "&:last-child": { pb: 0 } } }>
              <OperationsGrid
                rows={ toOperationRows(recent, instruments, directories.data) }
                dense
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={ { xs: 12, lg: 3 } }>
          <Stack direction={ { xs: "column", sm: "row", lg: "column" } } sx={ { gap: 2 } }>
            <LocationTree departments={ departments } locations={ locations }/>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
