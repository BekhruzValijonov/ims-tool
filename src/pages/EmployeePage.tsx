import { useNavigate, useParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
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
    <Box sx={ { width: "100%", maxWidth: { sm: "100%", md: "1700px" } } }>
      <Button
        size="small" startIcon={ <ArrowBackIcon/> } sx={ { mb: 1 } }
        onClick={ () => navigate(ROUTES.employees) }
      >
        К списку сотрудников
      </Button>

      <Stack direction="row" sx={ { alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" } }>
        <Typography variant="h5" component="h2">{ employee.fullName }</Typography>
        { employee.isActive ? null : <Chip size="small" label="Уволен"/> }
      </Stack>

      <Grid container spacing={ 2 } columns={ 12 }>
        <Grid size={ { xs: 12, md: 4 } }>
          <Card variant="outlined">
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>Сотрудник</Typography>
              <Stack sx={ { gap: 0.75, mt: 1 } }>
                <Typography variant="body2">
                  Подразделение: { dirs?.departmentName(employee.departmentId) ?? "—" }
                </Typography>
                <Typography variant="body2">Должность: { employee.position ?? "—" }</Typography>
                <Typography variant="body2">Табельный: { employee.personnelNumber ?? "—" }</Typography>
                <Typography variant="body2">Телефон: { employee.phone ?? "—" }</Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={ { mt: 2 } }>
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>
                Сейчас на руках
                <Chip size="small" sx={ { ml: 1 } } label={ onHands.length }/>
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
                          component="button" type="button" underline="hover"
                          sx={ { textAlign: "left" } }
                          onClick={ () => navigate(ROUTES.instrument(instrument.id)) }
                        >
                          { instrument.inventoryNumber } · { instrument.name }
                        </Link>
                        <Stack direction="row" sx={ { gap: 1, alignItems: "center" } }>
                          <Typography variant="caption" sx={ { color: "text.secondary" } }>
                            выдан { formatDate(instrument.issuedAt) }
                          </Typography>
                          { instrument.expectedReturnAt !== null ? (
                            <Chip
                              size="small"
                              color={ overdue ? "error" : "default" }
                              label={ `до ${ formatDate(instrument.expectedReturnAt) }` }
                            />
                          ) : null }
                        </Stack>
                      </Stack>
                    )
                  }) }
                </Stack>
              ) }
            </CardContent>
          </Card>
        </Grid>

        <Grid size={ { xs: 12, md: 8 } }>
          <Card variant="outlined">
            <CardContent sx={ { p: 0, "&:last-child": { pb: 0 } } }>
              <Typography component="h3" variant="subtitle2" sx={ { p: 2, pb: 0 } }>
                История выдач
              </Typography>
              { dirs ? (
                <OperationsGrid
                  rows={ toOperationRows(journal.rows, instruments, dirs) }
                  dense
                />
              ) : null }
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
