import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
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
import { StatusMark } from "../features/instruments/ui/StatusMark"
import { formatPrice } from "../features/instruments/domain/labels"
import { formatDate, formatDateTime } from "../shared/dates"
import { monoSx } from "../shared/ui/dataText"
import { useStateColors } from "../app/theme/useStateColors"
import { ROUTES } from "../app/routes"

/** Порядок кнопок — от частого к редкому: выдача и возврат сверху, списание последним. */
const OPERATION_ORDER: readonly OperationKind[] = [
  "CHECK_OUT", "RETURN", "TRANSFER", "REPAIR_SEND", "REPAIR_DONE",
  "VERIFY_SEND", "VERIFY_DONE", "WRITE_OFF",
]

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Stack
      direction="row"
      sx={ { justifyContent: "space-between", gap: 2, py: 0.75, borderTop: 1, borderColor: "divider" } }
    >
      <Typography variant="body2" sx={ { color: "text.secondary" } }>{ label }</Typography>
      <Typography variant="body2" sx={ { textAlign: "right", ...(mono ? monoSx : {}) } }>
        { value }
      </Typography>
    </Stack>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper sx={ { p: 2 } }>
      <Typography variant="h6" component="h2" sx={ { mb: 1 } }>{ title }</Typography>
      { children }
    </Paper>
  )
}

/** Факт в истории: подпись слева, значение справа. Без склеек через точку. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={ { gap: 1 } }>
      <Typography variant="caption" sx={ { color: "text.secondary", minWidth: 58 } }>{ label }</Typography>
      <Typography variant="caption">{ value }</Typography>
    </Stack>
  )
}

export function InstrumentPage() {
  const { id = "" } = useParams()
  const repo = useRepo()
  const navigate = useNavigate()
  const directories = useDirectories()
  const { state: tone } = useStateColors()
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
    <Box>
      <Button
        size="small" startIcon={ <ArrowBackIcon/> } sx={ { mb: 1, ml: -1 } }
        onClick={ () => navigate(ROUTES.instruments) }
      >
        К списку приборов
      </Button>

      <Stack
        direction="row"
        sx={ { justifyContent: "space-between", alignItems: "flex-end", gap: 2, flexWrap: "wrap", mb: 1 } }
      >
        <Box>
          {/* Инвентарный номер стоит над названием и набран моноширинным:
              это идентификатор, по которому прибор ищут, а не подпись. */}
          <Typography variant="body2" sx={ { ...monoSx, color: "text.secondary" } }>
            { instrument.inventoryNumber }
          </Typography>
          <Typography variant="h4" component="h1" sx={ { mb: 0.75 } }>{ instrument.name }</Typography>
          <Stack direction="row" sx={ { gap: 2, alignItems: "center", flexWrap: "wrap" } }>
            <StatusMark status={ instrument.status } bold/>
            { overdue ? (
              <Typography variant="body2" sx={ { color: tone.signal, fontWeight: 500 } }>
                Не вернули в срок — ждали до { formatDate(instrument.expectedReturnAt) }
              </Typography>
            ) : null }
          </Stack>
        </Box>

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

      <Box sx={ { borderBottom: 1, borderColor: "text.primary", mb: 2.5 } }/>

      <Grid container spacing={ 2 } columns={ 12 }>
        <Grid size={ { xs: 12, md: 5 } }>
          <Stack sx={ { gap: 2 } }>
            <Block title="Паспорт">
              <Field label="Инвентарный номер" value={ instrument.inventoryNumber } mono/>
              <Field label="Серийный номер" value={ instrument.serialNumber ?? "—" } mono/>
              <Field label="Тип" value={ dirs?.typeName(instrument.typeId) ?? "—" }/>
              <Field label="Производитель" value={ instrument.manufacturer ?? "—" }/>
              <Field label="Модель" value={ instrument.model ?? "—" }/>
              <Field label="Приобретён" value={ formatDate(instrument.purchasedAt) } mono/>
              <Field label="Стоимость" value={ formatPrice(instrument.priceMinor, instrument.currency) } mono/>
            </Block>

            <Block title="Учёт">
              <Field label="Числится за" value={ dirs?.departmentName(instrument.ownerDepartmentId) ?? "—" }/>
              <Field label="Возвращается в" value={ dirs?.locationName(instrument.baseLocationId) ?? "—" }/>
              <Field label="Сейчас в" value={ dirs?.departmentName(instrument.currentDepartmentId) ?? "—" }/>
              <Field label="Сейчас на месте" value={ dirs?.locationName(instrument.currentLocationId) ?? "—" }/>
              <Field
                label="Материально ответственный"
                value={ instrument.responsibleEmployeeId
                  ? dirs?.employeeName(instrument.responsibleEmployeeId) ?? "—"
                  : "—" }
              />
              { instrument.currentEmployeeId ? (
                <>
                  <Field label="На руках у" value={ dirs?.employeeName(instrument.currentEmployeeId) ?? "—" }/>
                  <Field label="Выдан" value={ formatDateTime(instrument.issuedAt) } mono/>
                  <Field label="Вернуть до" value={ formatDate(instrument.expectedReturnAt) } mono/>
                </>
              ) : null }
            </Block>

            <Block title="Метрология">
              <Field label="Поверка действительна до" value={ formatDate(instrument.nextVerificationAt) } mono/>
              <Field label="Калибровка действительна до" value={ formatDate(instrument.nextCalibrationAt) } mono/>

              { verifications.length === 0 ? (
                <Typography variant="body2" sx={ { color: "text.secondary", mt: 1.5 } }>
                  Свидетельств пока нет. Первое появится после операции «Принять с поверки».
                </Typography>
              ) : (
                <Stack sx={ { gap: 1.25, mt: 1.5 } }>
                  { verifications.map((record) => (
                    <Box key={ record.id }>
                      <Stack direction="row" sx={ { justifyContent: "space-between", gap: 1 } }>
                        <Typography variant="body2" sx={ { fontWeight: 500 } }>
                          { record.kind === "CALIBRATION" ? "Калибровка" : "Поверка" }
                          { record.result === "FAIL" ? " — не годен" : "" }
                        </Typography>
                        <Typography variant="body2" sx={ monoSx }>
                          { formatDate(record.performedAt) }
                        </Typography>
                      </Stack>
                      { record.certificateNumber ? (
                        <Fact label="Свидетельство" value={ record.certificateNumber }/>
                      ) : null }
                      { record.organization ? <Fact label="Поверял" value={ record.organization }/> : null }
                      { record.validUntil ? (
                        <Fact label="Годно до" value={ formatDate(record.validUntil) }/>
                      ) : null }
                    </Box>
                  )) }
                </Stack>
              ) }
            </Block>
          </Stack>
        </Grid>

        <Grid size={ { xs: 12, md: 7 } }>
          <Block title="История">
            <Stack sx={ { gap: 1.5, mt: 1 } }>
              { history.map((event) => (
                <Stack
                  key={ event.id }
                  direction="row"
                  sx={ { gap: 2, pt: 1.5, borderTop: 1, borderColor: "divider" } }
                >
                  <Typography
                    variant="body2"
                    sx={ { ...monoSx, color: "text.secondary", minWidth: 118, flexShrink: 0 } }
                  >
                    { formatDateTime(event.occurredAt) }
                  </Typography>
                  <Box sx={ { minWidth: 0 } }>
                    <Typography variant="body2" sx={ { fontWeight: 500, mb: 0.25 } }>
                      { EVENT_LABELS[event.kind] }
                      { event.condition ? ` — ${ CONDITION_LABELS[event.condition] }` : "" }
                    </Typography>
                    { event.employeeId ? (
                      <Fact label="Сотрудник" value={ dirs?.employeeName(event.employeeId) ?? "—" }/>
                    ) : null }
                    { event.toLocationId ? (
                      <Fact label="Место" value={ dirs?.locationName(event.toLocationId) ?? "—" }/>
                    ) : null }
                    { event.reason ? <Fact label="Причина" value={ event.reason }/> : null }
                    { event.note ? <Fact label="Примечание" value={ event.note }/> : null }
                    <Fact label="Внёс" value={ event.operatorName }/>
                  </Box>
                </Stack>
              )) }
            </Stack>
          </Block>
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
