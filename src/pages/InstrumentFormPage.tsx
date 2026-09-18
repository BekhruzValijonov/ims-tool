import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useRepo, useOperatorName } from "../app/AppContext"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { useAsync } from "../shared/useAsync"
import type { WriteError } from "../data/AppRepo"
import { ROUTES } from "../app/routes"
import { PageHeader } from "../shared/ui/PageHeader"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { DateInput } from "../ui/DateInput"
import { Select, TextArea, TextField } from "../ui/Field"
import { Grid, Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconArrowLeft } from "../ui/icons"

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

/**
 * Форма прибора: четыре блока вместо тридцати полей подряд.
 *
 * Блок «Метрология» показывается, только если у выбранного типа стоит признак
 * поверки: у набора отвёрток свидетельства нет, и спрашивать про него незачем.
 */
export function InstrumentFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const repo = useRepo()
  const navigate = useNavigate()
  const operatorName = useOperatorName()
  const directories = useDirectories()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const existing = useAsync(
    async () => (id ? repo.instruments.getById(id) : null),
    [repo, id],
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
      const result = editing && id
        ? await repo.instruments.update(id, draft, operatorName)
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

      navigate(ROUTES.instrument(result.value.id))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={ { maxWidth: 900 } }>
      <Button
        startIcon={ <IconArrowLeft size={ 18 }/> }
        onClick={ () => navigate(-1) }
        style={ { marginLeft: -12, marginBottom: 8 } }
      >
        Назад
      </Button>
      <PageHeader
        title={ editing ? "Редактирование прибора" : "Новый прибор" }
        hint={ editing
          ? "Правка паспорта. Состояние и держатель меняются операциями из карточки."
          : "Заполните паспорт. Статус «в наличии» и место прибор получит сам." }
      />

      <form onSubmit={ submit }>
        <Stack gap={ 2 }>
          <Card>
            <Text variant="h6" as="h2" style={ { marginBottom: 16 } }>Основное</Text>
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
          </Card>

          <Card>
            <Text variant="h6" as="h2" style={ { marginBottom: 16 } }>Учёт</Text>
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
          </Card>

          <Card>
            <Text variant="h6" as="h2" style={ { marginBottom: 16 } }>Дополнительно</Text>
            <Grid cols={ { xs: 1, sm: 2 } } gap={ 2 }>
              <DateInput label="Дата приобретения" value={ form.purchasedAt } onChange={ set("purchasedAt") } fullWidth/>
              <TextField label="Стоимость, сум" type="number" value={ form.price } onChange={ set("price") } fullWidth/>
            </Grid>
            <Stack gap={ 2 } style={ { marginTop: 16 } }>
              <TextArea label="Описание" value={ form.description } onChange={ set("description") } fullWidth/>
              <TextArea label="Комментарий" value={ form.note } onChange={ set("note") } fullWidth/>
            </Stack>
          </Card>

          { showMetrology && !editing ? (
            <Card>
              <Text variant="h6" as="h2">Метрология</Text>
              <Text variant="caption" tone="secondary">
                Действующее свидетельство, если оно уже есть. Дальше поверки заносятся операцией
                «Принять с поверки» и копятся историей.
              </Text>
              <Grid cols={ { xs: 1, sm: 2 } } gap={ 2 } style={ { marginTop: 16 } }>
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
                <TextField
                  label="Кто поверял" value={ form.organization }
                  onChange={ set("organization") } fullWidth
                />
              </Grid>
            </Card>
          ) : null }

          { failure ? <Alert severity="error">{ failure }</Alert> : null }

          <Stack row gap={ 1 }>
            <Button type="submit" variant="contained" disabled={ busy }>
              { editing ? "Сохранить" : "Завести прибор" }
            </Button>
            <Button onClick={ () => navigate(-1) } disabled={ busy }>Отмена</Button>
          </Stack>
        </Stack>
      </form>
    </div>
  )
}
