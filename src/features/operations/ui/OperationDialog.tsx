import { useMemo, useState, type FormEvent } from "react"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import Checkbox from "@mui/material/Checkbox"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControlLabel from "@mui/material/FormControlLabel"
import FormControl from "@mui/material/FormControl"
import FormLabel from "@mui/material/FormLabel"
import MenuItem from "@mui/material/MenuItem"
import Radio from "@mui/material/Radio"
import RadioGroup from "@mui/material/RadioGroup"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { useRepo, useOperatorName } from "../../../app/AppContext"
import type { Directories } from "../../directories/ui/useDirectories"
import type { Instrument } from "../../instruments/domain/types"
import type { OperationCommand, OperationKind, ReturnCondition } from "../domain/types"
import type { VerificationKind, VerificationResult } from "../../verification/domain/types"
import { CONDITION_LABELS, OPERATION_LABELS, operationErrorText } from "../domain/labels"
import { addMonths, formatDate } from "../../../shared/dates"
import { DateField } from "../../../shared/ui/DateField"

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

  if (!kind) return null

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

  const employeeOptions = directories.employees.filter((employee) => employee.isActive)

  return (
    <Dialog open onClose={ busy ? undefined : onClose } maxWidth="sm" fullWidth>
      <form onSubmit={ submit }>
        <DialogTitle>{ OPERATION_LABELS[kind] }</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={ { color: "text.secondary", mb: 2 } }>
            { instrument.inventoryNumber } · { instrument.name }
          </Typography>

          <Stack sx={ { gap: 2 } }>
            { kind === "CHECK_OUT" && (
              <>
                <TextField
                  select required label="Кому" value={ employeeId }
                  onChange={ (event) => {
                    setEmployeeId(event.target.value)
                    const employee = employeeOptions.find((row) => row.id === event.target.value)
                    if (employee?.departmentId) setDepartmentId(employee.departmentId)
                  } }
                >
                  { employeeOptions.map((employee) => (
                    <MenuItem key={ employee.id } value={ employee.id }>
                      { employee.fullName }
                      { employee.position ? ` — ${ employee.position }` : "" }
                    </MenuItem>
                  )) }
                </TextField>
                <TextField
                  select label="Подразделение" value={ departmentId }
                  onChange={ (event) => setDepartmentId(event.target.value) }
                >
                  <MenuItem value="">Не менять</MenuItem>
                  { directories.departments.filter((row) => !row.isArchived).map((department) => (
                    <MenuItem key={ department.id } value={ department.id }>{ department.name }</MenuItem>
                  )) }
                </TextField>
                <DateField
                  size="medium" label="Вернуть до" value={ expectedReturn }
                  onChange={ setExpectedReturn }
                  helperText="Пусто — без срока. По этому полю считается просрочка"
                />
              </>
            ) }

            { kind === "RETURN" && (
              <FormControl>
                <FormLabel>Состояние прибора</FormLabel>
                <RadioGroup
                  value={ condition }
                  onChange={ (event) => setCondition(event.target.value as ReturnCondition) }
                >
                  { (Object.keys(CONDITION_LABELS) as ReturnCondition[]).map((value) => (
                    <FormControlLabel
                      key={ value } value={ value } control={ <Radio/> }
                      label={ CONDITION_LABELS[value] }
                    />
                  )) }
                </RadioGroup>
                <Typography variant="caption" sx={ { color: "text.secondary" } }>
                  Повреждённый и требующий ремонта прибор уходит в ремонт, а не в наличие
                </Typography>
              </FormControl>
            ) }

            { kind === "TRANSFER" && (
              <>
                <TextField
                  select label="Подразделение" value={ departmentId }
                  onChange={ (event) => setDepartmentId(event.target.value) }
                >
                  <MenuItem value="">Не менять</MenuItem>
                  { directories.departments.filter((row) => !row.isArchived).map((department) => (
                    <MenuItem key={ department.id } value={ department.id }>{ department.name }</MenuItem>
                  )) }
                </TextField>
                <TextField
                  select label="Место хранения" value={ locationId }
                  onChange={ (event) => setLocationId(event.target.value) }
                >
                  <MenuItem value="">Не менять</MenuItem>
                  { directories.locations.filter((row) => !row.isArchived).map((location) => (
                    <MenuItem key={ location.id } value={ location.id }>{ location.name }</MenuItem>
                  )) }
                </TextField>
                <FormControlLabel
                  control={ <Checkbox checked={ permanent } onChange={ (event) => setPermanent(event.target.checked) }/> }
                  label="Перевести насовсем"
                />
                <Typography variant="caption" sx={ { color: "text.secondary", mt: -1.5 } }>
                  { permanent
                    ? "Сменится и балансовая принадлежность, и место, куда прибор вернётся"
                    : "Командировка: «Вернуть» приведёт прибор на прежнее место" }
                </Typography>
                <TextField
                  label="Причина" value={ reason }
                  onChange={ (event) => setReason(event.target.value) }
                />
              </>
            ) }

            { kind === "REPAIR_SEND" && (
              <>
                <TextField
                  select label="Куда" value={ locationId }
                  onChange={ (event) => setLocationId(event.target.value) }
                >
                  <MenuItem value="">Оставить на месте</MenuItem>
                  { directories.locations.filter((row) => !row.isArchived).map((location) => (
                    <MenuItem key={ location.id } value={ location.id }>{ location.name }</MenuItem>
                  )) }
                </TextField>
                <TextField
                  required label="Что случилось" value={ reason }
                  onChange={ (event) => setReason(event.target.value) }
                />
              </>
            ) }

            { kind === "VERIFY_SEND" && (
              <>
                <TextField
                  select label="Вид работ" value={ verificationKind }
                  onChange={ (event) => setVerificationKind(event.target.value as VerificationKind) }
                >
                  <MenuItem value="VERIFICATION">Поверка</MenuItem>
                  <MenuItem value="CALIBRATION">Калибровка</MenuItem>
                </TextField>
                <TextField
                  select label="Куда" value={ locationId }
                  onChange={ (event) => setLocationId(event.target.value) }
                >
                  <MenuItem value="">Оставить на месте</MenuItem>
                  { directories.locations.filter((row) => !row.isArchived).map((location) => (
                    <MenuItem key={ location.id } value={ location.id }>{ location.name }</MenuItem>
                  )) }
                </TextField>
              </>
            ) }

            { kind === "VERIFY_DONE" && (
              <>
                <TextField
                  select label="Вид работ" value={ verificationKind }
                  onChange={ (event) => setVerificationKind(event.target.value as VerificationKind) }
                >
                  <MenuItem value="VERIFICATION">Поверка</MenuItem>
                  <MenuItem value="CALIBRATION">Калибровка</MenuItem>
                </TextField>
                <TextField
                  select label="Результат" value={ result }
                  onChange={ (event) => setResult(event.target.value as VerificationResult) }
                >
                  <MenuItem value="PASS">Годен</MenuItem>
                  <MenuItem value="FAIL">Не годен</MenuItem>
                </TextField>
                { result === "FAIL" ? (
                  <Alert severity="warning">
                    Непройденная поверка отправит прибор в ремонт, а не в наличие: пользоваться им нельзя
                  </Alert>
                ) : null }
                <DateField
                  size="medium" label="Дата поверки" value={ performedAt }
                  onChange={ setPerformedAt }
                />
                { result === "PASS" ? (
                  <DateField
                    size="medium" label="Действительна до" value={ effectiveValidUntil }
                    onChange={ setValidUntil }
                    helperText={ type?.defaultVerificationIntervalMonths
                      ? `По умолчанию — ${ type.defaultVerificationIntervalMonths } мес. от даты поверки`
                      : " " }
                  />
                ) : null }
                <TextField
                  label="Номер свидетельства" value={ certificate }
                  onChange={ (event) => setCertificate(event.target.value) }
                />
                <TextField
                  label="Кто поверял" value={ organization }
                  onChange={ (event) => setOrganization(event.target.value) }
                />
              </>
            ) }

            { kind === "WRITE_OFF" && (
              <>
                <Alert severity="warning">
                  Списание необратимо: с прибором больше нельзя будет работать. Журнал сохранится.
                </Alert>
                <TextField
                  required label="Причина списания" value={ reason }
                  onChange={ (event) => setReason(event.target.value) }
                />
              </>
            ) }

            { kind === "REPAIR_DONE" && (
              <Typography variant="body2">
                Прибор вернётся на своё место — { directories.locationName(instrument.baseLocationId) }.
              </Typography>
            ) }

            <TextField
              label="Примечание" value={ note } multiline minRows={ 2 }
              onChange={ (event) => setNote(event.target.value) }
            />

            { instrument.expectedReturnAt !== null && kind === "RETURN" ? (
              <Typography variant="caption" sx={ { color: "text.secondary" } }>
                Ожидался до { formatDate(instrument.expectedReturnAt) }
              </Typography>
            ) : null }

            { failure ? <Alert severity="error">{ failure }</Alert> : null }
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={ onClose } disabled={ busy }>Отмена</Button>
          <Button type="submit" variant="contained" disabled={ busy }>
            { OPERATION_LABELS[kind] }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
