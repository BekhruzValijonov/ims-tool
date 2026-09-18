import { useNavigate, useParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Card from "@mui/material/Card"
import Grid from "@mui/material/Grid"
import Link from "@mui/material/Link"
import Skeleton from "@mui/material/Skeleton"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { OperationsGrid } from "../features/operations/ui/OperationsGrid"
import { toOperationRows } from "../features/operations/ui/operationRows"
import type { Instrument } from "../features/instruments/domain/types"
import { formatDate } from "../shared/dates"
import { monoSx } from "../shared/ui/dataText"
import { useStateColors } from "../app/theme/useStateColors"
import { ROUTES } from "../app/routes"

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

  if (state.loading && !state.data) return <Skeleton variant="rounded" height={ 360 }/>
  if (state.error) return <Alert severity="error">{ state.error }</Alert>
  if (!state.data) return <Alert severity="warning">Сотрудник не найден</Alert>

  const { employee, onHands, journal, instruments } = state.data
  const dirs = directories.data
  const now = Date.now()

  return (
    <Box>
      <Button
        size="small" startIcon={ <ArrowBackIcon/> } sx={ { mb: 1, ml: -1 } }
        onClick={ () => navigate(ROUTES.employees) }
      >
        К списку сотрудников
      </Button>

      <Stack direction="row" sx={ { alignItems: "center", gap: 1.5, mb: 1, flexWrap: "wrap" } }>
        <Typography variant="h4" component="h1">{ employee.fullName }</Typography>
        { employee.isActive ? null : <Chip size="small" label="Уволен"/> }
      </Stack>
      <Box sx={ { borderBottom: 1, borderColor: "text.primary", mb: 2.5 } }/>

      <Grid container spacing={ 2 } columns={ 12 }>
        <Grid size={ { xs: 12, md: 4 } }>
          <Card sx={ { p: 2 } }>
              <Typography variant="h6" component="h2" sx={ { mb: 1 } }>Сотрудник</Typography>
              <Stack sx={ { gap: 0.75 } }>
                <Typography variant="body2">
                  Подразделение: { dirs?.departmentName(employee.departmentId) ?? "—" }
                </Typography>
                <Typography variant="body2">Должность: { employee.position ?? "—" }</Typography>
                <Typography variant="body2">Табельный: { employee.personnelNumber ?? "—" }</Typography>
                <Typography variant="body2">Телефон: { employee.phone ?? "—" }</Typography>
              </Stack>
          </Card>

          <Card sx={ { p: 2, mt: 2 } }>
              <Typography variant="h6" component="h2" sx={ { mb: 1 } }>
                Сейчас на руках: { onHands.length }
              </Typography>

              { onHands.length === 0 ? (
                <Typography variant="body2" sx={ { color: "text.secondary", mt: 1 } }>
                  Приборов нет
                </Typography>
              ) : (
                <Stack sx={ { gap: 1.25, mt: 1 } }>
                  { onHands.map((instrument) => {
                    const overdue = instrument.expectedReturnAt !== null && instrument.expectedReturnAt < now
                    return (
                      <Stack key={ instrument.id } sx={ { gap: 0.25 } }>
                        <Link
                          component="button" type="button"
                          sx={ { textAlign: "left" } }
                          onClick={ () => navigate(ROUTES.instrument(instrument.id)) }
                        >
                          <Typography component="span" variant="body2" sx={ { ...monoSx, mr: 1 } }>
                            { instrument.inventoryNumber }
                          </Typography>
                          <Typography component="span" variant="body2">{ instrument.name }</Typography>
                        </Link>
                        <Typography variant="caption" sx={ { color: "text.secondary" } }>
                          Выдан { formatDate(instrument.issuedAt) }
                          { instrument.expectedReturnAt === null ? ", без срока возврата" : null }
                        </Typography>
                        { instrument.expectedReturnAt !== null ? (
                          <Typography
                            variant="caption"
                            sx={ { color: overdue ? tone.signal : "text.secondary", fontWeight: overdue ? 500 : 400 } }
                          >
                            { overdue ? "Просрочен с " : "Вернуть до " }
                            { formatDate(instrument.expectedReturnAt) }
                          </Typography>
                        ) : null }
                      </Stack>
                    )
                  }) }
                </Stack>
              ) }
          </Card>
        </Grid>

        <Grid size={ { xs: 12, md: 8 } }>
          <Card>
            <Typography variant="h6" component="h2" sx={ { p: 2, pb: 1 } }>История выдач</Typography>
            { dirs ? (
              <OperationsGrid rows={ toOperationRows(journal.rows, instruments, dirs) } dense/>
            ) : null }
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
