import { useNavigate, useParams } from "react-router-dom"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { OperationsTable } from "../features/operations/ui/OperationsTable"
import { toOperationRows } from "../features/operations/ui/operationRows"
import type { Instrument } from "../features/instruments/domain/types"
import { TourButton } from "../tour/TourButton"
import { formatDate } from "../shared/dates"
import { useStateColors } from "../app/theme/useStateColors"
import { ROUTES } from "../app/routes"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { Chip } from "../ui/Chip"
import { Skeleton } from "../ui/Skeleton"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconArrowLeft } from "../ui/icons"

/**
 * Карточка сотрудника.
 *
 * Отвечает на вопрос, ради которого её открывают: что сейчас у него на руках и
 * не просрочен ли возврат.
 */
export function EmployeePage() {
  const { id = "" } = useParams()
  const repo = useRepo()
  const navigate = useNavigate()
  const directories = useDirectories()
  const { state: tone } = useStateColors()

  const state = useAsync(async () => {
    const employees = await repo.directories.employees({ includeInactive: true })
    const employee = employees.find((row) => row.id === id) ?? null
    if (!employee) return null

    const [onHands, journal] = await Promise.all([
      repo.directories.instrumentsOf(id),
      repo.operations.journal({ employeeId: id, pageSize: 50 }),
    ])
    const ids = [...new Set(journal.rows.map((event) => event.instrumentId))]
    const loaded = await Promise.all(ids.map((rowId) => repo.instruments.getById(rowId)))
    const instruments = new Map<string, Instrument>()
    for (const instrument of loaded) if (instrument) instruments.set(instrument.id, instrument)

    return { employee, onHands, journal, instruments }
  }, [repo, id])

  if (state.loading && !state.data) return <Skeleton height={ 360 }/>
  if (state.error) return <Alert severity="error">{ state.error }</Alert>
  if (!state.data) return <Alert severity="warning">Сотрудник не найден</Alert>

  const { employee, onHands, journal, instruments } = state.data
  const dirs = directories.data
  const now = Date.now()

  return (
    <Page>
      <Button
        startIcon={ <IconArrowLeft size={ 18 }/> }
        onClick={ () => navigate(ROUTES.employees) }
        style={ { marginLeft: -12, marginBottom: 8 } }
      >
        К списку сотрудников
      </Button>

      <Stack row align="center" justify="between" gap={ 2 } wrap style={ { marginBottom: 24 } }>
        <Stack row align="center" gap={ 1.5 } wrap>
          <Text variant="h4" as="h1">{ employee.fullName }</Text>
          { employee.isActive ? null : <Chip>Уволен</Chip> }
        </Stack>
        <TourButton tour="employee"/>
      </Stack>

      <Stack row gap={ 2 } wrap align="stretch">
        <Stack gap={ 2 } style={ { flex: "2 1 300px", minWidth: 0 } }>
          <Card data-tour="employee-card">
            <Text variant="h6" as="h2" style={ { marginBottom: 8 } }>Сотрудник</Text>
            <Stack gap={ 0.75 }>
              <Text>Подразделение: { dirs?.departmentName(employee.departmentId) ?? "—" }</Text>
              <Text>Должность: { employee.position ?? "—" }</Text>
              <Text>Табельный: { employee.personnelNumber ?? "—" }</Text>
              <Text>Телефон: { employee.phone ?? "—" }</Text>
            </Stack>
          </Card>

          <Card data-tour="employee-on-hands">
            <Text variant="h6" as="h2" style={ { marginBottom: 8 } }>
              Сейчас на руках: { onHands.length }
            </Text>

            { onHands.length === 0 ? (
              <Text tone="secondary">Приборов нет</Text>
            ) : (
              <Stack gap={ 1.5 }>
                { onHands.map((instrument) => {
                  const overdue = instrument.expectedReturnAt !== null && instrument.expectedReturnAt < now
                  return (
                    <Stack key={ instrument.id } gap={ 0.25 }>
                      <button
                        type="button"
                        className="link"
                        onClick={ () => navigate(ROUTES.instrument(instrument.id)) }
                        style={ {
                          padding: 0, border: "none", background: "none",
                          textAlign: "left", font: "inherit",
                        } }
                      >
                        <span className="data-mono" style={ { marginRight: 8 } }>
                          { instrument.inventoryNumber }
                        </span>
                        { instrument.name }
                      </button>
                      <Text variant="caption" tone="secondary">
                        Выдан { formatDate(instrument.issuedAt) }
                        { instrument.expectedReturnAt === null ? ", без срока возврата" : null }
                      </Text>
                      { instrument.expectedReturnAt !== null ? (
                        <Text
                          variant="caption"
                          style={ overdue
                            ? { color: tone.signal, fontWeight: 600 }
                            : { color: "var(--text-secondary)" } }
                        >
                          { overdue ? "Просрочен с " : "Вернуть до " }
                          { formatDate(instrument.expectedReturnAt) }
                        </Text>
                      ) : null }
                    </Stack>
                  )
                }) }
              </Stack>
            ) }
          </Card>
        </Stack>

        <div style={ { flex: "3 1 420px", minWidth: 0 } }>
          <Card padding="none" data-tour="employee-history">
            <Text variant="h6" as="h2" style={ { padding: "20px 20px 8px" } }>История выдач</Text>
            { dirs ? (
              <OperationsTable rows={ toOperationRows(journal.rows, instruments, dirs) } dense/>
            ) : null }
          </Card>
        </div>
      </Stack>
    </Page>
  )
}
