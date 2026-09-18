import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useRepo, useOperatorName } from "../../../app/AppContext"
import { useDirectories } from "../../directories/ui/useDirectories"
import { useAsync } from "../../../shared/useAsync"
import type { WriteError } from "../../../data/AppRepo"
import { Alert } from "../../../ui/Alert"
import { Button } from "../../../ui/Button"
import { DateInput } from "../../../ui/DateInput"
import { TextArea, TextField } from "../../../ui/Field"
import { Select } from "../../../ui/Select"
import { Grid, Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"

interface FormState {
  inventoryNumber: string
  name: string
  typeId: string
  serialNumber: string
  manufacturer: string
  model: string
  ownerDepartmentId: string
  baseLocationId: string
  responsibleEmployeeId: string
  purchasedAt: string
  price: string
  description: string
  note: string
  verificationPerformedAt: string
  verificationValidUntil: string
  certificateNumber: string
  organization: string
}

const EMPTY: FormState = {
  inventoryNumber: "", name: "", typeId: "", serialNumber: "", manufacturer: "", model: "",
  ownerDepartmentId: "", baseLocationId: "", responsibleEmployeeId: "", purchasedAt: "",
  price: "", description: "", note: "",
  verificationPerformedAt: "", verificationValidUntil: "", certificateNumber: "", organization: "",
}

function writeErrorText(error: WriteError): string {
  switch (error.code) {
    case "DUPLICATE_INVENTORY_NUMBER":
      return `Прибор с номером ${ error.inventoryNumber } уже заведён`
    case "INVENTORY_NUMBER_REQUIRED":
      return "Укажите инвентарный номер"
    case "NAME_REQUIRED":
      return "Укажите наименование"
    case "NOT_FOUND":
      return "Прибор не найден"
  }
}

function toDateInput(timestamp: number | null): string {
  if (timestamp === null) return ""
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
  return new Date(year, month - 1, day).getTime()
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Stack gap={ 1.5 }>
      <div>
        <Text variant="subtitle1" as="h3">{ title }</Text>
        { hint ? <Text variant="caption" tone="secondary">{ hint }</Text> : null }
      </div>
      { children }
    </Stack>
  )
}

export interface InstrumentFormHandlers {
  /** Что нарисовать под формой: в окне это кнопки подвала, на странице — свои. */
  renderActions(state: { busy: boolean; submitLabel: string }): ReactNode
}

interface InstrumentFormProps extends InstrumentFormHandlers {
  /** Задан — правка существующего прибора, иначе заведение нового. */
  readonly instrumentId?: string
  onSaved(id: string): void
  /** Идентификатор формы: кнопка подвала окна лежит вне <form> и ссылается на него. */
  readonly formId?: string
}

/**
 * Форма прибора: четыре блока вместо тридцати полей подряд.
 *
 * Блок «Метрология» показывается, только если у выбранного типа стоит признак
 * поверки: у набора отвёрток свидетельства нет, и спрашивать про него незачем.
 *
 * Одна и та же форма работает в окне заведения и на странице правки —
 * расходятся только кнопки, поэтому они приходят снаружи.
 */
export function InstrumentForm({ instrumentId, onSaved, renderActions, formId }: InstrumentFormProps) {
  const editing = Boolean(instrumentId)
  const repo = useRepo()
  const operatorName = useOperatorName()
  const directories = useDirectories()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const existing = useAsync(
    async () => (instrumentId ? repo.instruments.getById(instrumentId) : null),
    [repo, instrumentId],
  )

  useEffect(() => {
    const instrument = existing.data
    if (!instrument) return
    setForm({
      inventoryNumber: instrument.inventoryNumber,
      name: instrument.name,
      typeId: instrument.typeId ?? "",
      serialNumber: instrument.serialNumber ?? "",
      manufacturer: instrument.manufacturer ?? "",
      model: instrument.model ?? "",
      ownerDepartmentId: instrument.ownerDepartmentId ?? "",
      baseLocationId: instrument.baseLocationId ?? "",
      responsibleEmployeeId: instrument.responsibleEmployeeId ?? "",
      purchasedAt: toDateInput(instrument.purchasedAt),
      price: instrument.priceMinor === null ? "" : String(instrument.priceMinor / 100),
      description: instrument.description ?? "",
      note: instrument.note ?? "",
      verificationPerformedAt: "", verificationValidUntil: "", certificateNumber: "", organization: "",
    })
  }, [existing.data])

  function set(key: keyof FormState) {
    return (value: string) => setForm((current) => ({ ...current, [key]: value }))
  }

  const dirs = directories.data
  const type = dirs?.typeById(form.typeId || null) ?? null
  const showMetrology = Boolean(type?.requiresVerification)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setFailure(null)

    // Стоимость хранится целым числом в тийинах: копейки в REAL рано или поздно
    // превращаются в 1 249,9999.
    const priceMinor = form.price.trim() === "" ? null : Math.round(Number(form.price) * 100)
    const draft = {
      inventoryNumber: form.inventoryNumber,
      name: form.name,
      typeId: form.typeId || null,
      serialNumber: form.serialNumber || null,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      ownerDepartmentId: form.ownerDepartmentId || null,
      baseLocationId: form.baseLocationId || null,
      responsibleEmployeeId: form.responsibleEmployeeId || null,
      purchasedAt: fromDateInput(form.purchasedAt),
      priceMinor,
      currency: priceMinor === null ? null : "UZS",
      description: form.description || null,
      note: form.note || null,
    }

    try {
      const result = editing && instrumentId
        ? await repo.instruments.update(instrumentId, draft, operatorName)
        : await repo.instruments.create(draft, operatorName)

      if (!result.ok) {
        setFailure(writeErrorText(result.error))
        return
      }

      /* Свидетельство при заведении — отдельная запись, а не поля в карточке:
         история поверок должна начинаться с того, что уже есть на руках. */
      if (!editing && showMetrology && form.verificationPerformedAt) {
        await repo.verification.add({
          instrumentId: result.value.id,
          kind: "VERIFICATION",
          performedAt: fromDateInput(form.verificationPerformedAt) ?? Date.now(),
          validUntil: fromDateInput(form.verificationValidUntil),
          certificateNumber: form.certificateNumber || null,
          organization: form.organization || null,
          result: "PASS",
          note: null,
        })
      }

      onSaved(result.value.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form id={ formId } onSubmit={ submit }>
      <Stack gap={ 3 }>
        <Section title="Основное">
          <Grid cols={ { xs: 1, sm: 2 } } gap={ 2 }>
            <TextField label="Наименование" required value={ form.name } onChange={ set("name") } fullWidth/>
            <Select
              label="Тип" value={ form.typeId } onChange={ set("typeId") } emptyLabel="Не указан"
              options={ (dirs?.types ?? []).filter((row) => !row.isArchived)
                .map((row) => ({ value: row.id, label: row.name })) }
              fullWidth
            />
            <TextField
              label="Инвентарный номер" required value={ form.inventoryNumber }
              onChange={ set("inventoryNumber") }
              helper="Уникален. По нему сверяются с бухгалтерией"
              fullWidth
            />
            <TextField label="Серийный номер" value={ form.serialNumber } onChange={ set("serialNumber") } fullWidth/>
            <TextField label="Производитель" value={ form.manufacturer } onChange={ set("manufacturer") } fullWidth/>
            <TextField label="Модель" value={ form.model } onChange={ set("model") } fullWidth/>
          </Grid>
        </Section>

        <Section title="Учёт">
          <Grid cols={ { xs: 1, sm: 2 } } gap={ 2 }>
            <Select
              label="Подразделение" value={ form.ownerDepartmentId }
              onChange={ set("ownerDepartmentId") } emptyLabel="Не указано"
              options={ (dirs?.departments ?? []).filter((row) => !row.isArchived)
                .map((row) => ({ value: row.id, label: row.name })) }
              fullWidth
            />
            <Select
              label="Место хранения" value={ form.baseLocationId }
              onChange={ set("baseLocationId") } emptyLabel="Не указано"
              helper="Сюда прибор вернётся при возврате"
              options={ (dirs?.locations ?? []).filter((row) => !row.isArchived)
                .map((row) => ({ value: row.id, label: row.name })) }
              fullWidth
            />
            <Select
              label="Материально ответственное лицо" value={ form.responsibleEmployeeId }
              onChange={ set("responsibleEmployeeId") } emptyLabel="Не указано"
              options={ (dirs?.employees ?? []).filter((row) => row.isActive)
                .map((row) => ({ value: row.id, label: row.fullName })) }
              fullWidth
            />
          </Grid>
        </Section>

        <Section title="Дополнительно">
          <Grid cols={ { xs: 1, sm: 2 } } gap={ 2 }>
            <DateInput label="Дата приобретения" value={ form.purchasedAt } onChange={ set("purchasedAt") } fullWidth/>
            <TextField label="Стоимость, сум" type="number" value={ form.price } onChange={ set("price") } fullWidth/>
          </Grid>
          <TextArea label="Описание" value={ form.description } onChange={ set("description") } fullWidth/>
          <TextArea label="Комментарий" value={ form.note } onChange={ set("note") } fullWidth/>
        </Section>

        { showMetrology && !editing ? (
          <Section
            title="Метрология"
            hint="Действующее свидетельство, если оно уже есть. Дальше поверки заносятся операцией «Принять с поверки» и копятся историей."
          >
            <Grid cols={ { xs: 1, sm: 2 } } gap={ 2 }>
              <DateInput
                label="Дата поверки" value={ form.verificationPerformedAt }
                onChange={ set("verificationPerformedAt") } fullWidth
              />
              <DateInput
                label="Действительна до" value={ form.verificationValidUntil }
                onChange={ set("verificationValidUntil") } fullWidth
              />
              <TextField
                label="Номер свидетельства" value={ form.certificateNumber }
                onChange={ set("certificateNumber") } fullWidth
              />
              <TextField label="Кто поверял" value={ form.organization } onChange={ set("organization") } fullWidth/>
            </Grid>
          </Section>
        ) : null }

        { failure ? <Alert severity="error">{ failure }</Alert> : null }

        { renderActions({ busy, submitLabel: editing ? "Сохранить" : "Завести прибор" }) }
      </Stack>
    </form>
  )
}

/** Кнопки формы на странице правки. */
export function FormPageActions({
  busy, submitLabel, onCancel,
}: { busy: boolean; submitLabel: string; onCancel(): void }) {
  return (
    <Stack row gap={ 1 }>
      <Button type="submit" variant="contained" disabled={ busy }>{ submitLabel }</Button>
      <Button onClick={ onCancel } disabled={ busy }>Отмена</Button>
    </Stack>
  )
}
