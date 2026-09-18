import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { PageHeader } from "../shared/ui/PageHeader"
import { StatCards, type Gauge } from "../features/dashboard/ui/StatCards"
import { AttentionBanner } from "../features/dashboard/ui/AttentionBanner"
import { FirstRun } from "../features/dashboard/ui/FirstRun"
import { FlowChart } from "../features/dashboard/ui/FlowChart"
import { DepartmentBarChart } from "../features/dashboard/ui/DepartmentBarChart"
import { StatusDonut } from "../features/dashboard/ui/StatusDonut"
import { PlacementList } from "../features/dashboard/ui/PlacementList"
import { OperationsTable } from "../features/operations/ui/OperationsTable"
import { toOperationRows } from "../features/operations/ui/operationRows"
import { DAY_MS } from "../shared/dates"
import { COLORS } from "../app/theme/tokens"
import { useStateColors } from "../app/theme/useStateColors"
import { Alert } from "../ui/Alert"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { Skeleton } from "../ui/Skeleton"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconCheck, IconInstrument, IconPerson, IconWrench } from "../ui/icons"

const WINDOW_DAYS = 30
const RECENT_LIMIT = 8

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
    const instruments = await repo.instruments.byIds(
      recent.map((event) => event.instrumentId))

    return { counters, history, flow, recent, breakdown, departments, locations, instruments }
  }, [repo])

  if (state.error) return <Page><Alert severity="error">{ state.error }</Alert></Page>

  if (!state.data || !directories.data) {
    return (
      <Page>
        <PageHeader title="Дашборд"/>
        <Stack gap={ 2 }>
          <Skeleton height={ 150 }/>
          <Skeleton height={ 320 }/>
        </Stack>
      </Page>
    )
  }

  const { counters, history, flow, recent, breakdown, departments, locations, instruments } = state.data

  /* Пустая база — это не «дашборд с нулями», а другой экран: человеку нужен
     порядок действий, а не четыре нуля и пустые графики. */
  if (counters.total === 0 && counters.writtenOff === 0) {
    return (
      <Page>
        <PageHeader title="Дашборд" hint="Что происходит с приборами прямо сейчас" tour="dashboard"/>
        <FirstRun/>
      </Page>
    )
  }

  const neutral = dark ? COLORS.grey[500] : COLORS.grey[600]
  const gauges: Gauge[] = [
    {
      key: "total", label: "Всего приборов", value: counters.total,
      color: neutral, soft: tone.goneSoft, icon: <IconInstrument size={ 22 }/>,
      series: history.map((day) => day.total),
    },
    {
      key: "available", label: "В наличии", value: counters.available,
      color: series.available, soft: tone.okSoft, icon: <IconCheck size={ 22 }/>,
      series: history.map((day) => day.available),
    },
    {
      key: "checked-out", label: "Выдано", value: counters.checkedOut,
      color: series.checkedOut, soft: tone.workSoft, icon: <IconPerson size={ 22 }/>,
      series: history.map((day) => day.checkedOut),
    },
    {
      key: "in-repair", label: "В ремонте", value: counters.inRepair,
      color: series.inRepair, soft: tone.waitSoft, icon: <IconWrench size={ 22 }/>,
      series: history.map((day) => day.inRepair),
    },
  ]

  return (
    <Page>
      <PageHeader title="Дашборд" hint="Что происходит с приборами прямо сейчас" tour="dashboard"/>

      <Stack gap={ 2 }>
        {/* Обёртки несут якоря обхода: сами блоки рисуют свою карточку внутри
            и о существовании подсказок не знают. */}
        <div data-tour="dashboard-gauges">
          <StatCards gauges={ gauges }/>
        </div>
        <div data-tour="dashboard-attention">
          <AttentionBanner overdue={ counters.overdue } verificationDue={ counters.verificationDue }/>
        </div>

        <Stack row gap={ 2 } wrap align="stretch">
          <Stack gap={ 2 } style={ { flex: "3 1 520px", minWidth: 0 } }>
            <div data-tour="dashboard-flow"><FlowChart flow={ flow }/></div>
            <div data-tour="dashboard-departments"><DepartmentBarChart summary={ departments }/></div>
          </Stack>
          <Stack gap={ 2 } style={ { flex: "2 1 320px", minWidth: 0 } }>
            <div data-tour="dashboard-status"><StatusDonut slices={ breakdown }/></div>
            <div data-tour="dashboard-placement">
              <PlacementList departments={ departments } locations={ locations }/>
            </div>
          </Stack>
        </Stack>

        <div data-tour="dashboard-recent">
          <Stack row align="baseline" justify="between" style={ { marginBottom: 12 } }>
            <Text variant="h5" as="h2">Последние операции</Text>
            <Text variant="caption" tone="secondary">Полный журнал — в разделе «Операции»</Text>
          </Stack>
          <Card padding="none">
            <OperationsTable rows={ toOperationRows(recent, instruments, directories.data) } dense/>
          </Card>
        </div>
      </Stack>
    </Page>
  )
}
