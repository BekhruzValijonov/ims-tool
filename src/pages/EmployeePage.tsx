import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { OperationsTable } from "../features/operations/ui/OperationsTable"
import { toOperationRows } from "../features/operations/ui/operationRows"
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
/** Сколько записей истории на странице. */
const HISTORY_PAGE = 25

export function EmployeePage() {
  const { id = "" } = useParams()
  const repo = useRepo()
  const navigate = useNavigate()
  const directories = useDirectories()
  const { state: tone } = useStateColors()

  const [page, setPage] = useState(0)

  /* Сам сотрудник берётся из справочников, которые страница и так грузит:
     отдельным запросом за ним поднимался весь список — и работающие, и
     уволенные, — чтобы взять оттуда одну строку. */
  const dirs = directories.data
  const employee = dirs?.employeeById(id) ?? null

  const state = useAsync(async () => {
    const [onHands, journal] = await Promise.all([
      repo.directories.instrumentsOf(id),
      repo.operations.journal({ employeeId: id, page, pageSize: HISTORY_PAGE }),
    ])
    const instruments = await repo.instruments.byIds(
      journal.rows.map((event) => event.instrumentId))

    return { onHands, journal, instruments }
  }, [repo, id, page])

  if (directories.loading || (state.loading && !state.data)) {
    return <Page><Skeleton height={ 360 }/></Page>
  }
  if (state.error) return <Page><Alert severity="error">{ state.error }</Alert></Page>
  if (!employee) return <Page><Alert severity="warning">Сотрудник не найден</Alert></Page>
  if (!state.data) return <Page><Skeleton height={ 360 }/></Page>

  const { onHands, journal, instruments } = state.data
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

      {/* Сведения о человеке — рядом, история — во всю ширину под ними: в
          колонке на треть экрана таблица из шести столбцов не помещалась и
          возила вбок собственной полосой прокрутки, чего нет больше нигде. */}
      <Stack gap={ 2 }>
        <Stack row gap={ 2 } wrap align="stretch">
          <Card data-tour="employee-card" style={ { flex: "1 1 320px", minWidth: 0 } }>
            <Text variant="h6" as="h2" style={ { marginBottom: 8 } }>Сотрудник</Text>
            <Stack gap={ 0.75 }>
              <Text>Подразделение: { dirs?.departmentName(employee.departmentId) ?? "—" }</Text>
              <Text>Должность: { employee.position ?? "—" }</Text>
              <Text>Табельный: { employee.personnelNumber ?? "—" }</Text>
              <Text>Телефон: { employee.phone ?? "—" }</Text>
            </Stack>
          </Card>

          <Card data-tour="employee-on-hands" style={ { flex: "1 1 320px", minWidth: 0 } }>
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
                        /* Свойства шрифта перечислены поштучно: сокращённое
                            `font` сбрасывает и начертание, а оно задано в
                            `.link` — кнопка выходила бы светлее таких же
                            ссылок в таблицах. */
                        style={ {
                          padding: 0, border: "none", background: "none", textAlign: "left",
                          fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit",
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

        <Card padding="none" data-tour="employee-history">
          <Text variant="h6" as="h2" style={ { padding: "20px 20px 8px" } }>История выдач</Text>
          {/* С постраничностью, а не первыми пятьюдесятью записями молча:
              у слесаря с большим стажем история длиннее, и обрезанная выглядела
              бы полной. */}
          { dirs ? (
            <OperationsTable
              rows={ toOperationRows(journal.rows, instruments, dirs) }
              rowCount={ journal.total }
              page={ page }
              pageSize={ HISTORY_PAGE }
              onPageChange={ setPage }
              dense
            />
          ) : null }
        </Card>
      </Stack>
    </Page>
  )
}
