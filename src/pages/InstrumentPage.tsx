import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import Grid from "@mui/material/Grid"
import Skeleton from "@mui/material/Skeleton"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import EditIcon from "@mui/icons-material/Edit"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { OperationDialog } from "../features/operations/ui/OperationDialog"
import { isOperationAllowed } from "../features/operations/domain/transitions"
import { EVENT_LABELS, OPERATION_LABELS, CONDITION_LABELS } from "../features/operations/domain/labels"
import type { OperationKind } from "../features/operations/domain/types"
import { STATUS_COLORS, STATUS_LABELS, formatPrice } from "../features/instruments/domain/labels"
import { formatDate, formatDateTime } from "../shared/dates"
import { ROUTES } from "../app/routes"

/** Порядок кнопок — от частого к редкому: выдача и возврат сверху, списание последним. */
const OPERATION_ORDER: readonly OperationKind[] = [
  "CHECK_OUT", "RETURN", "TRANSFER", "REPAIR_SEND", "REPAIR_DONE",
  "VERIFY_SEND", "VERIFY_DONE", "WRITE_OFF",
]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={ { justifyContent: "space-between", gap: 2, py: 0.75 } }>
      <Typography variant="body2" sx={ { color: "text.secondary" } }>{ label }</Typography>
      <Typography variant="body2" sx={ { textAlign: "right" } }>{ value }</Typography>
    </Stack>
  )
}

export function InstrumentPage() {
  const { id = "" } = useParams()
  const repo = useRepo()
  const navigate = useNavigate()
  const directories = useDirectories()
  const [operation, setOperation] = useState<OperationKind | null>(null)

  const state = useAsync(async () => {
    const instrument = await repo.instruments.getById(id)
    if (!instrument) return null
    const [history, verifications] = await Promise.all([
      repo.operations.historyOf(id),
      repo.verification.listFor(id),
    ])
    return { instrument, history, verifications }
  }, [repo, id])

  if (state.loading && !state.data) return <Skeleton variant="rounded" height={ 400 }/>
  if (state.error) return <Alert severity="error">{ state.error }</Alert>
  if (!state.data) return <Alert severity="warning">Прибор не найден</Alert>

  const { instrument, history, verifications } = state.data
  const dirs = directories.data
  const overdue = instrument.status === "CHECKED_OUT"
    && instrument.expectedReturnAt !== null
    && instrument.expectedReturnAt < Date.now()

  return (
    <Box sx={ { width: "100%", maxWidth: { sm: "100%", md: "1700px" } } }>
      <Button
        size="small" startIcon={ <ArrowBackIcon/> } sx={ { mb: 1 } }
        onClick={ () => navigate(ROUTES.instruments) }
      >
        К списку приборов
      </Button>

      <Stack
        direction="row"
        sx={ { justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap", mb: 2 } }
      >
        <Stack sx={ { gap: 0.5 } }>
          <Typography variant="h5" component="h2">{ instrument.name }</Typography>
          <Stack direction="row" sx={ { gap: 1, alignItems: "center" } }>
            <Typography variant="body2" sx={ { color: "text.secondary" } }>
              { instrument.inventoryNumber }
            </Typography>
            <Chip
              size="small"
              label={ STATUS_LABELS[instrument.status] }
              color={ STATUS_COLORS[instrument.status] }
            />
            { overdue ? <Chip size="small" color="error" label="Не вернули в срок"/> : null }
          </Stack>
        </Stack>

        <Stack direction="row" sx={ { gap: 1, flexWrap: "wrap" } }>
          { OPERATION_ORDER
            .filter((kind) => isOperationAllowed(instrument.status, kind))
            /* Недоступная операция не гасится, а отсутствует: серая кнопка
               заставляет гадать, почему она не нажимается. */
            .map((kind) => (
              <Button
                key={ kind }
                size="small"
                variant={ kind === "CHECK_OUT" || kind === "RETURN" ? "contained" : "outlined" }
                color={ kind === "WRITE_OFF" ? "error" : "primary" }
                onClick={ () => setOperation(kind) }
              >
                { OPERATION_LABELS[kind] }
              </Button>
            )) }
          <Button
            size="small" startIcon={ <EditIcon/> }
            onClick={ () => navigate(`${ ROUTES.instrument(instrument.id) }/edit`) }
          >
            Редактировать
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={ 2 } columns={ 12 }>
        <Grid size={ { xs: 12, md: 5 } }>
          <Card variant="outlined">
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>Паспорт</Typography>
              <Field label="Инвентарный номер" value={ instrument.inventoryNumber }/>
              <Field label="Серийный номер" value={ instrument.serialNumber ?? "—" }/>
              <Field label="Тип" value={ dirs?.typeName(instrument.typeId) ?? "—" }/>
              <Field label="Производитель" value={ instrument.manufacturer ?? "—" }/>
              <Field label="Модель" value={ instrument.model ?? "—" }/>
              <Field label="Приобретён" value={ formatDate(instrument.purchasedAt) }/>
              <Field label="Стоимость" value={ formatPrice(instrument.priceMinor, instrument.currency) }/>

              <Divider sx={ { my: 1.5 } }/>
              <Typography component="h3" variant="subtitle2" gutterBottom>Учёт</Typography>
              <Field label="Числится за" value={ dirs?.departmentName(instrument.ownerDepartmentId) ?? "—" }/>
              <Field label="Место хранения" value={ dirs?.locationName(instrument.baseLocationId) ?? "—" }/>
              <Field label="Сейчас в" value={ dirs?.departmentName(instrument.currentDepartmentId) ?? "—" }/>
              <Field label="Сейчас на месте" value={ dirs?.locationName(instrument.currentLocationId) ?? "—" }/>
              <Field
                label="Материально ответственный"
                value={ instrument.responsibleEmployeeId ? dirs?.employeeName(instrument.responsibleEmployeeId) ?? "—" : "—" }
              />
              { instrument.currentEmployeeId ? (
                <>
                  <Field label="На руках у" value={ dirs?.employeeName(instrument.currentEmployeeId) ?? "—" }/>
                  <Field label="Выдан" value={ formatDateTime(instrument.issuedAt) }/>
                  <Field label="Вернуть до" value={ formatDate(instrument.expectedReturnAt) }/>
                </>
              ) : null }

              { instrument.description || instrument.note ? (
                <>
                  <Divider sx={ { my: 1.5 } }/>
                  <Typography variant="body2" sx={ { whiteSpace: "pre-wrap" } }>
                    { [instrument.description, instrument.note].filter(Boolean).join("\n") }
                  </Typography>
                </>
              ) : null }
            </CardContent>
          </Card>

          <Card variant="outlined" sx={ { mt: 2 } }>
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>Метрология</Typography>
              <Field label="Поверка действительна до" value={ formatDate(instrument.nextVerificationAt) }/>
              <Field label="Калибровка действительна до" value={ formatDate(instrument.nextCalibrationAt) }/>

              { verifications.length === 0 ? (
                <Typography variant="body2" sx={ { color: "text.secondary", mt: 1 } }>
                  Свидетельств пока нет
                </Typography>
              ) : (
                <Stack sx={ { gap: 1, mt: 1 } }>
                  { verifications.map((record) => (
                    <Stack key={ record.id } sx={ { gap: 0.25 } }>
                      <Stack direction="row" sx={ { justifyContent: "space-between", gap: 1 } }>
                        <Typography variant="body2">
                          { record.kind === "CALIBRATION" ? "Калибровка" : "Поверка" }
                          { record.result === "FAIL" ? " — не годен" : "" }
                        </Typography>
                        <Typography variant="body2" sx={ { color: "text.secondary" } }>
                          { formatDate(record.performedAt) }
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={ { color: "text.secondary" } }>
                        { [
                          record.certificateNumber ? `№ ${ record.certificateNumber }` : null,
                          record.organization,
                          record.validUntil ? `действительно до ${ formatDate(record.validUntil) }` : null,
                        ].filter(Boolean).join(" · ") }
                      </Typography>
                    </Stack>
                  )) }
                </Stack>
              ) }
            </CardContent>
          </Card>
        </Grid>

        <Grid size={ { xs: 12, md: 7 } }>
          <Card variant="outlined">
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>История</Typography>
              <Stack sx={ { gap: 2, mt: 1 } }>
                { history.map((event) => (
                  <Stack key={ event.id } direction="row" sx={ { gap: 2 } }>
                    <Typography
                      variant="body2"
                      sx={ { color: "text.secondary", minWidth: 132, flexShrink: 0 } }
                    >
                      { formatDateTime(event.occurredAt) }
                    </Typography>
                    <Stack sx={ { gap: 0.25 } }>
                      <Typography variant="body2" sx={ { fontWeight: 500 } }>
                        { EVENT_LABELS[event.kind] }
                        { event.condition ? ` — ${ CONDITION_LABELS[event.condition] }` : "" }
                      </Typography>
                      <Typography variant="caption" sx={ { color: "text.secondary" } }>
                        { [
                          event.employeeId ? dirs?.employeeName(event.employeeId) : null,
                          event.toLocationId ? dirs?.locationName(event.toLocationId) : null,
                          event.reason,
                          event.note,
                        ].filter(Boolean).join(" · ") }
                      </Typography>
                      <Typography variant="caption" sx={ { color: "text.disabled" } }>
                        Внёс: { event.operatorName }
                      </Typography>
                    </Stack>
                  </Stack>
                )) }
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      { dirs ? (
        <OperationDialog
          instrument={ instrument }
          kind={ operation }
          directories={ dirs }
          onClose={ () => setOperation(null) }
          onDone={ state.reload }
        />
      ) : null }
    </Box>
  )
}
