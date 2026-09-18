import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Grid from "@mui/material/Grid"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useRepo, useOperatorName } from "../app/AppContext"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { useAsync } from "../shared/useAsync"
import type { WriteError } from "../data/AppRepo"
import { ROUTES } from "../app/routes"
import { DateField } from "../shared/ui/DateField"

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

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (event: { target: { value: string } }) =>
        setForm((current) => ({ ...current, [key]: event.target.value })),
    }
  }

  const type = directories.data?.typeById(form.typeId || null) ?? null
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

  const dirs = directories.data

  return (
    <Box sx={ { width: "100%", maxWidth: 900 } }>
      <Button size="small" startIcon={ <ArrowBackIcon/> } sx={ { mb: 1 } } onClick={ () => navigate(-1) }>
        Назад
      </Button>
      <Typography variant="h6" component="h2" sx={ { mb: 2 } }>
        { editing ? "Редактирование прибора" : "Новый прибор" }
      </Typography>

      <form onSubmit={ submit }>
        <Stack sx={ { gap: 2 } }>
          <Card variant="outlined">
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>Основное</Typography>
              <Grid container spacing={ 2 } sx={ { mt: 0.5 } }>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField fullWidth required size="small" label="Наименование" { ...field("name") }/>
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField fullWidth select size="small" label="Тип" { ...field("typeId") }>
                    <MenuItem value="">Не указан</MenuItem>
                    { dirs?.types.filter((row) => !row.isArchived).map((row) => (
                      <MenuItem key={ row.id } value={ row.id }>{ row.name }</MenuItem>
                    )) }
                  </TextField>
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField
                    fullWidth required size="small" label="Инвентарный номер"
                    helperText="Уникален. По нему сверяются с бухгалтерией"
                    { ...field("inventoryNumber") }
                  />
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField fullWidth size="small" label="Серийный номер" { ...field("serialNumber") }/>
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField fullWidth size="small" label="Производитель" { ...field("manufacturer") }/>
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField fullWidth size="small" label="Модель" { ...field("model") }/>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>Учёт</Typography>
              <Grid container spacing={ 2 } sx={ { mt: 0.5 } }>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField fullWidth select size="small" label="Подразделение" { ...field("ownerDepartmentId") }>
                    <MenuItem value="">Не указано</MenuItem>
                    { dirs?.departments.filter((row) => !row.isArchived).map((row) => (
                      <MenuItem key={ row.id } value={ row.id }>{ row.name }</MenuItem>
                    )) }
                  </TextField>
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField
                    fullWidth select size="small" label="Место хранения"
                    helperText="Сюда прибор вернётся при возврате"
                    { ...field("baseLocationId") }
                  >
                    <MenuItem value="">Не указано</MenuItem>
                    { dirs?.locations.filter((row) => !row.isArchived).map((row) => (
                      <MenuItem key={ row.id } value={ row.id }>{ row.name }</MenuItem>
                    )) }
                  </TextField>
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField
                    fullWidth select size="small" label="Материально ответственное лицо"
                    { ...field("responsibleEmployeeId") }
                  >
                    <MenuItem value="">Не указано</MenuItem>
                    { dirs?.employees.filter((row) => row.isActive).map((row) => (
                      <MenuItem key={ row.id } value={ row.id }>{ row.fullName }</MenuItem>
                    )) }
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography component="h3" variant="subtitle2" gutterBottom>Дополнительно</Typography>
              <Grid container spacing={ 2 } sx={ { mt: 0.5 } }>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <DateField
                    fullWidth label="Дата приобретения"
                    value={ form.purchasedAt }
                    onChange={ (value) => setForm((current) => ({ ...current, purchasedAt: value })) }
                  />
                </Grid>
                <Grid size={ { xs: 12, sm: 6 } }>
                  <TextField
                    fullWidth size="small" type="number" label="Стоимость, сум"
                    { ...field("price") }
                  />
                </Grid>
                <Grid size={ 12 }>
                  <TextField fullWidth size="small" label="Описание" multiline minRows={ 2 } { ...field("description") }/>
                </Grid>
                <Grid size={ 12 }>
                  <TextField fullWidth size="small" label="Комментарий" multiline minRows={ 2 } { ...field("note") }/>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          { showMetrology && !editing ? (
            <Card variant="outlined">
              <CardContent>
                <Typography component="h3" variant="subtitle2" gutterBottom>Метрология</Typography>
                <Typography variant="caption" sx={ { color: "text.secondary" } }>
                  Действующее свидетельство, если оно уже есть. Дальше поверки заносятся операцией
                  «Принять с поверки» и копятся историей.
                </Typography>
                <Grid container spacing={ 2 } sx={ { mt: 0.5 } }>
                  <Grid size={ { xs: 12, sm: 6 } }>
                    <DateField
                      fullWidth label="Дата поверки"
                      value={ form.verificationPerformedAt }
                      onChange={ (value) =>
                        setForm((current) => ({ ...current, verificationPerformedAt: value })) }
                    />
                  </Grid>
                  <Grid size={ { xs: 12, sm: 6 } }>
                    <DateField
                      fullWidth label="Действительна до"
                      value={ form.verificationValidUntil }
                      onChange={ (value) =>
                        setForm((current) => ({ ...current, verificationValidUntil: value })) }
                    />
                  </Grid>
                  <Grid size={ { xs: 12, sm: 6 } }>
                    <TextField fullWidth size="small" label="Номер свидетельства" { ...field("certificateNumber") }/>
                  </Grid>
                  <Grid size={ { xs: 12, sm: 6 } }>
                    <TextField fullWidth size="small" label="Кто поверял" { ...field("organization") }/>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ) : null }

          { failure ? <Alert severity="error">{ failure }</Alert> : null }

          <Stack direction="row" sx={ { gap: 1 } }>
            <Button type="submit" variant="contained" disabled={ busy }>
              { editing ? "Сохранить" : "Завести прибор" }
            </Button>
            <Button onClick={ () => navigate(-1) } disabled={ busy }>Отмена</Button>
          </Stack>
        </Stack>
      </form>
    </Box>
  )
}
