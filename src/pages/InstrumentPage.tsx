import { useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
import { useStateColors } from "../app/theme/useStateColors"
import { ROUTES } from "../app/routes"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconArrowLeft, IconEdit } from "../ui/icons"

/** Порядок кнопок — от частого к редкому: выдача и возврат сверху, списание последним. */
const OPERATION_ORDER: readonly OperationKind[] = [
  "CHECK_OUT", "RETURN", "TRANSFER", "REPAIR_SEND", "REPAIR_DONE",
  "VERIFY_SEND", "VERIFY_DONE", "WRITE_OFF",
]

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Stack row justify="between" gap={ 2 } style={ { padding: "8px 0", borderTop: "1px dashed var(--divider)" } }>
      <Text tone="secondary">{ label }</Text>
      <Text mono={ mono } style={ { textAlign: "right" } }>{ value }</Text>
    </Stack>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text variant="h6" as="h2" style={ { marginBottom: 8 } }>{ title }</Text>
      { children }
    </Card>
  )
}

/** Факт в истории: подпись слева, значение справа. Без склеек через точку. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack row gap={ 1 }>
      <Text variant="caption" tone="secondary" style={ { minWidth: 70 } }>{ label }</Text>
      <Text variant="caption">{ value }</Text>
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

  if (state.loading && !state.data) return <Skeleton height={ 400 }/>
  if (state.error) return <Alert severity="error">{ state.error }</Alert>
  if (!state.data) return <Alert severity="warning">Прибор не найден</Alert>

  const { instrument, history, verifications } = state.data
  const dirs = directories.data
  const overdue = instrument.status === "CHECKED_OUT"
    && instrument.expectedReturnAt !== null
    && instrument.expectedReturnAt < Date.now()

  return (
    <div>
      <Button
        startIcon={ <IconArrowLeft size={ 18 }/> }
        onClick={ () => navigate(ROUTES.instruments) }
        style={ { marginLeft: -12, marginBottom: 8 } }
      >
        К списку приборов
      </Button>

      <Stack row justify="between" align="end" gap={ 2 } wrap style={ { marginBottom: 24 } }>
        <div>
          {/* Инвентарный номер стоит над названием и набран моноширинным:
              это идентификатор, по которому прибор ищут, а не подпись. */}
          <Text variant="body2" tone="secondary" mono>{ instrument.inventoryNumber }</Text>
          <Text variant="h4" as="h1" style={ { margin: "2px 0 8px" } }>{ instrument.name }</Text>
          <Stack row gap={ 2 } align="center" wrap>
            <StatusMark status={ instrument.status }/>
            { overdue ? (
              <Text style={ { color: tone.signal, fontWeight: 600 } }>
                Не вернули в срок — ждали до { formatDate(instrument.expectedReturnAt) }
              </Text>
            ) : null }
          </Stack>
        </div>

        <Stack row gap={ 1 } wrap>
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
            size="small" startIcon={ <IconEdit size={ 16 }/> }
            onClick={ () => navigate(`${ ROUTES.instrument(instrument.id) }/edit`) }
          >
            Редактировать
          </Button>
        </Stack>
      </Stack>

      <Stack row gap={ 2 } wrap align="stretch">
        <Stack gap={ 2 } style={ { flex: "2 1 340px", minWidth: 0 } }>
          <Block title="Паспорт">
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
              <Text tone="secondary" style={ { marginTop: 12 } }>
                Свидетельств пока нет. Первое появится после операции «Принять с поверки».
              </Text>
            ) : (
              <Stack gap={ 1.5 } style={ { marginTop: 12 } }>
                { verifications.map((record) => (
                  <div key={ record.id }>
                    <Stack row justify="between" gap={ 1 }>
                      <Text variant="subtitle2">
                        { record.kind === "CALIBRATION" ? "Калибровка" : "Поверка" }
                        { record.result === "FAIL" ? " — не годен" : "" }
                      </Text>
                      <Text mono>{ formatDate(record.performedAt) }</Text>
                    </Stack>
                    { record.certificateNumber ? (
                      <Fact label="Свидетельство" value={ record.certificateNumber }/>
                    ) : null }
                    { record.organization ? <Fact label="Поверял" value={ record.organization }/> : null }
                    { record.validUntil ? (
                      <Fact label="Годно до" value={ formatDate(record.validUntil) }/>
                    ) : null }
                  </div>
                )) }
              </Stack>
            ) }
          </Block>
        </Stack>

        <div style={ { flex: "3 1 420px", minWidth: 0 } }>
          <Block title="История">
            <Stack gap={ 1.5 } style={ { marginTop: 8 } }>
              { history.map((event) => (
                <Stack
                  key={ event.id }
                  row
                  gap={ 2 }
                  wrap
                  style={ { paddingTop: 12, borderTop: "1px dashed var(--divider)" } }
                >
                  <Text tone="secondary" mono style={ { minWidth: 140 } }>
                    { formatDateTime(event.occurredAt) }
                  </Text>
                  <div style={ { minWidth: 0 } }>
                    <Text variant="subtitle2" style={ { marginBottom: 2 } }>
                      { EVENT_LABELS[event.kind] }
                      { event.condition ? ` — ${ CONDITION_LABELS[event.condition] }` : "" }
                    </Text>
                    { event.employeeId ? (
                      <Fact label="Сотрудник" value={ dirs?.employeeName(event.employeeId) ?? "—" }/>
                    ) : null }
                    { event.toLocationId ? (
                      <Fact label="Место" value={ dirs?.locationName(event.toLocationId) ?? "—" }/>
                    ) : null }
                    { event.reason ? <Fact label="Причина" value={ event.reason }/> : null }
                    { event.note ? <Fact label="Примечание" value={ event.note }/> : null }
                    <Fact label="Внёс" value={ event.operatorName }/>
                  </div>
                </Stack>
              )) }
            </Stack>
          </Block>
        </div>
      </Stack>

      { dirs ? (
        <OperationDialog
          instrument={ instrument }
          kind={ operation }
          directories={ dirs }
          onClose={ () => setOperation(null) }
          onDone={ state.reload }
        />
      ) : null }
    </div>
  )
}
