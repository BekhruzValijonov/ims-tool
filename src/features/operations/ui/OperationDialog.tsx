import { useMemo, useState, type FormEvent } from "react"
import { useRepo, useOperatorName } from "../../../app/AppContext"
import type { Directories } from "../../directories/ui/useDirectories"
import type { Instrument } from "../../instruments/domain/types"
import type { OperationCommand, OperationKind, ReturnCondition } from "../domain/types"
import type { VerificationKind, VerificationResult } from "../../verification/domain/types"
import { CONDITION_LABELS, OPERATION_LABELS, operationErrorText } from "../domain/labels"
import { addMonths, formatDate } from "../../../shared/dates"
import { Alert } from "../../../ui/Alert"
import { Button } from "../../../ui/Button"
import { DateInput } from "../../../ui/DateInput"
import { Dialog } from "../../../ui/Dialog"
import { TextArea, TextField } from "../../../ui/Field"
import { Select } from "../../../ui/Select"
import { Checkbox, Radio } from "../../../ui/Choice"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"

interface OperationDialogProps {
  readonly instrument: Instrument
  readonly kind: OperationKind | null
  readonly directories: Directories
  onClose(): void
  onDone(): void
}

/** Дата для поля ввода — YYYY-MM-DD по местному времени. */
function toDateInput(timestamp: number): string {
  const date = new Date(timestamp)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function fromDateInput(value: string): number | null {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  // Конец дня: «вернуть до 20-го» значит «двадцатого ещё можно».
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
}

/**
 * Одно окно на все операции.
 *
 * Поля разные, а путь один: собрать команду и отдать её репозиторию. Отказ
 * показывается человеческим текстом — кладовщик не должен видеть код ошибки.
 */
export function OperationDialog({ instrument, kind, directories, onClose, onDone }: OperationDialogProps) {
  const repo = useRepo()
  const operatorName = useOperatorName()

  const [employeeId, setEmployeeId] = useState("")
  const [departmentId, setDepartmentId] = useState(instrument.currentDepartmentId ?? "")
  const [locationId, setLocationId] = useState("")
  const [expectedReturn, setExpectedReturn] = useState(toDateInput(Date.now() + 3 * 86400000))
  const [condition, setCondition] = useState<ReturnCondition>("OK")
  const [permanent, setPermanent] = useState(false)
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [verificationKind, setVerificationKind] = useState<VerificationKind>("VERIFICATION")
  const [performedAt, setPerformedAt] = useState(toDateInput(Date.now()))
  const [certificate, setCertificate] = useState("")
  const [organization, setOrganization] = useState("")
  const [result, setResult] = useState<VerificationResult>("PASS")
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const type = directories.typeById(instrument.typeId)
  const defaultValidUntil = useMemo(() => {
    const months = type?.defaultVerificationIntervalMonths ?? 12
    return toDateInput(addMonths(fromDateInput(performedAt) ?? Date.now(), months))
  }, [performedAt, type])
  const [validUntil, setValidUntil] = useState<string | null>(null)
  const effectiveValidUntil = validUntil ?? defaultValidUntil

  const employeeOptions = directories.employees
    .filter((employee) => employee.isActive)
    .map((employee) => ({
      value: employee.id,
      label: employee.position ? `${ employee.fullName } — ${ employee.position }` : employee.fullName,
    }))
  const departmentOptions = directories.departments
    .filter((row) => !row.isArchived)
    .map((row) => ({ value: row.id, label: row.name }))
  const locationOptions = directories.locations
    .filter((row) => !row.isArchived)
    .map((row) => ({ value: row.id, label: row.name }))

  function buildCommand(): OperationCommand | string {
    // Объявление функции поднимается выше проверки kind, поэтому сужение типа
    // до неё не доходит — приходится повторить проверку здесь.
    if (!kind) return "Операция не выбрана"
    const base = { instrumentId: instrument.id, operatorName, note: note || null }

    switch (kind) {
      case "CHECK_OUT":
        if (!employeeId) return "Выберите сотрудника"
        return {
          ...base, kind, employeeId,
          toDepartmentId: departmentId || null,
          expectedReturnAt: fromDateInput(expectedReturn),
        }
      case "RETURN":
        return { ...base, kind, condition }
      case "TRANSFER":
        if (!departmentId && !locationId) return "Укажите, куда перемещается прибор"
        return {
          ...base, kind,
          toDepartmentId: departmentId || null,
          toLocationId: locationId || null,
          permanent,
          reason: reason || null,
        }
      case "REPAIR_SEND":
        return { ...base, kind, toLocationId: locationId || null, reason: reason || null }
      case "REPAIR_DONE":
        return { ...base, kind }
      case "VERIFY_SEND":
        return { ...base, kind, verificationKind, toLocationId: locationId || null }
      case "VERIFY_DONE":
        return {
          ...base, kind,
          outcome: {
            kind: verificationKind,
            performedAt: fromDateInput(performedAt) ?? Date.now(),
            validUntil: result === "PASS" ? fromDateInput(effectiveValidUntil) : null,
            certificateNumber: certificate || null,
            organization: organization || null,
            result,
            note: note || null,
          },
        }
      case "WRITE_OFF":
        if (!reason.trim()) return "Укажите причину списания"
        return { ...base, kind, reason }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const command = buildCommand()
    if (typeof command === "string") {
      setFailure(command)
      return
    }

    setBusy(true)
    setFailure(null)
    try {
      const outcome = await repo.operations.execute(command)
      if (!outcome.ok) {
        setFailure(operationErrorText(outcome.error))
        return
      }
      onDone()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!kind) return null

  return (
    <Dialog
      open
      title={ OPERATION_LABELS[kind] }
      onClose={ busy ? undefined : onClose }
      onSubmit={ submit }
      actions={ <>
        <Button onClick={ onClose } disabled={ busy }>Отмена</Button>
        <Button type="submit" variant="contained" disabled={ busy }>{ OPERATION_LABELS[kind] }</Button>
      </> }
    >
      <Stack gap={ 2 }>
        <Stack row gap={ 1 } align="baseline">
          <Text variant="body2" tone="secondary" mono>{ instrument.inventoryNumber }</Text>
          <Text variant="body2">{ instrument.name }</Text>
        </Stack>

        { kind === "CHECK_OUT" ? (
          <>
            <Select
              label="Кому" required value={ employeeId } options={ employeeOptions }
              emptyLabel="Выберите сотрудника"
              onChange={ (value) => {
                setEmployeeId(value)
                const employee = directories.employees.find((row) => row.id === value)
                if (employee?.departmentId) setDepartmentId(employee.departmentId)
              } }
              fullWidth
            />
            <Select
              label="Подразделение" value={ departmentId } options={ departmentOptions }
              emptyLabel="Не менять" onChange={ setDepartmentId } fullWidth
            />
            <DateInput
              label="Вернуть до" value={ expectedReturn } onChange={ setExpectedReturn }
              helper="Пусто — без срока. По этому полю считается просрочка" fullWidth
            />
          </>
        ) : null }

        { kind === "RETURN" ? (
          <fieldset style={ { border: "none", padding: 0, margin: 0 } }>
            <Text variant="subtitle2" as="legend">Состояние прибора</Text>
            <Stack gap={ 1 } style={ { marginTop: 8 } }>
              { (Object.keys(CONDITION_LABELS) as ReturnCondition[]).map((value) => (
                <Radio
                  key={ value }
                  name="condition"
                  checked={ condition === value }
                  onChange={ () => setCondition(value) }
                >
                  { CONDITION_LABELS[value] }
                </Radio>
              )) }
            </Stack>
            <Text variant="caption" tone="secondary" style={ { display: "block", marginTop: 8 } }>
              Повреждённый и требующий ремонта прибор уходит в ремонт, а не в наличие
            </Text>
          </fieldset>
        ) : null }

        { kind === "TRANSFER" ? (
          <>
            <Select
              label="Подразделение" value={ departmentId } options={ departmentOptions }
              emptyLabel="Не менять" onChange={ setDepartmentId } fullWidth
            />
            <Select
              label="Место хранения" value={ locationId } options={ locationOptions }
              emptyLabel="Не менять" onChange={ setLocationId } fullWidth
            />
            <Checkbox checked={ permanent } onChange={ setPermanent }>Перевести насовсем</Checkbox>
            <Text variant="caption" tone="secondary">
              { permanent
                ? "Сменится и балансовая принадлежность, и место, куда прибор вернётся"
                : "Командировка: «Вернуть» приведёт прибор на прежнее место" }
            </Text>
            <TextField label="Причина" value={ reason } onChange={ setReason } fullWidth/>
          </>
        ) : null }

        { kind === "REPAIR_SEND" ? (
          <>
            <Select
              label="Куда" value={ locationId } options={ locationOptions }
              emptyLabel="Оставить на месте" onChange={ setLocationId } fullWidth
            />
            <TextField label="Что случилось" required value={ reason } onChange={ setReason } fullWidth/>
          </>
        ) : null }

        { kind === "VERIFY_SEND" ? (
          <>
            <Select
              label="Вид работ" value={ verificationKind }
              options={ [
                { value: "VERIFICATION", label: "Поверка" },
                { value: "CALIBRATION", label: "Калибровка" },
              ] }
              onChange={ (value) => setVerificationKind(value as VerificationKind) }
              fullWidth
            />
            <Select
              label="Куда" value={ locationId } options={ locationOptions }
              emptyLabel="Оставить на месте" onChange={ setLocationId } fullWidth
            />
          </>
        ) : null }

        { kind === "VERIFY_DONE" ? (
          <>
            <Select
              label="Вид работ" value={ verificationKind }
              options={ [
                { value: "VERIFICATION", label: "Поверка" },
                { value: "CALIBRATION", label: "Калибровка" },
              ] }
              onChange={ (value) => setVerificationKind(value as VerificationKind) }
              fullWidth
            />
            <Select
              label="Результат" value={ result }
              options={ [{ value: "PASS", label: "Годен" }, { value: "FAIL", label: "Не годен" }] }
              onChange={ (value) => setResult(value as VerificationResult) }
              fullWidth
            />
            { result === "FAIL" ? (
              <Alert severity="warning">
                Непройденная поверка отправит прибор в ремонт, а не в наличие: пользоваться им нельзя
              </Alert>
            ) : null }
            <DateInput label="Дата поверки" value={ performedAt } onChange={ setPerformedAt } fullWidth/>
            { result === "PASS" ? (
              <DateInput
                label="Действительна до"
                value={ effectiveValidUntil }
                onChange={ setValidUntil }
                helper={ type?.defaultVerificationIntervalMonths
                  ? `По умолчанию — ${ type.defaultVerificationIntervalMonths } мес. от даты поверки`
                  : undefined }
                fullWidth
              />
            ) : null }
            <TextField label="Номер свидетельства" value={ certificate } onChange={ setCertificate } fullWidth/>
            <TextField label="Кто поверял" value={ organization } onChange={ setOrganization } fullWidth/>
          </>
        ) : null }

        { kind === "WRITE_OFF" ? (
          <>
            <Alert severity="warning">
              Списание необратимо: с прибором больше нельзя будет работать. Журнал сохранится.
            </Alert>
            <TextField label="Причина списания" required value={ reason } onChange={ setReason } fullWidth/>
          </>
        ) : null }

        { kind === "REPAIR_DONE" ? (
          <Text>
            Прибор вернётся на своё место — { directories.locationName(instrument.baseLocationId) }.
          </Text>
        ) : null }

        <TextArea label="Примечание" value={ note } onChange={ setNote } rows={ 2 } fullWidth/>

        { instrument.expectedReturnAt !== null && kind === "RETURN" ? (
          <Text variant="caption" tone="secondary">
            Ожидался до { formatDate(instrument.expectedReturnAt) }
          </Text>
        ) : null }

        { failure ? <Alert severity="error">{ failure }</Alert> : null }
      </Stack>
    </Dialog>
  )
}
