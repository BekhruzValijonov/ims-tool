import { useState, type FormEvent } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControlLabel from "@mui/material/FormControlLabel"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import Switch from "@mui/material/Switch"
import TextField from "@mui/material/TextField"
import AddIcon from "@mui/icons-material/Add"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import { PageHeader } from "../../../shared/ui/PageHeader"

export type FieldSpec =
  | { kind: "text"; key: string; label: string; required?: boolean; helper?: string }
  | { kind: "number"; key: string; label: string; helper?: string }
  | { kind: "select"; key: string; label: string; options: readonly { value: string; label: string }[] }
  | { kind: "switch"; key: string; label: string; helper?: string }

export type FormValues = Record<string, string | boolean>

interface DirectoryScreenProps<T extends { id: string }> {
  readonly title: string
  readonly addLabel: string
  /** Одна строка о том, зачем справочник нужен. */
  readonly hint?: string
  readonly rows: readonly T[]
  readonly columns: readonly GridColDef<T>[]
  readonly fields: readonly FieldSpec[]
  readonly loading?: boolean
  readonly error?: string | null
  /** Что подставить в форму при правке существующей записи. */
  toForm(row: T): FormValues
  onSave(values: FormValues, id: string | null): Promise<void>
  /** Заголовок кнопки архивирования зависит от справочника: «архивировать» или «уволить». */
  readonly archiveLabel: { archive: string; restore: string }
  isArchived(row: T): boolean
  onArchive(row: T, archived: boolean): Promise<void>
}

/**
 * Экран справочника.
 *
 * Три справочника отличаются только набором полей, поэтому таблица, диалог и
 * архивирование живут здесь, а страницы задают, что именно редактируется.
 *
 * Удаления нет нигде: на записи справочника ссылается журнал, и удалить
 * подразделение значит стереть смысл прошлых операций. Есть архивирование —
 * запись перестаёт предлагаться в формах, но прошлое остаётся читаемым.
 */
export function DirectoryScreen<T extends { id: string }>({
  title, addLabel, hint, rows, columns, fields, loading, error,
  toForm, onSave, archiveLabel, isArchived, onArchive,
}: DirectoryScreenProps<T>) {
  const [editing, setEditing] = useState<T | null>(null)
  const [creating, setCreating] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  function openCreate() {
    const blank: FormValues = {}
    for (const field of fields) blank[field.key] = field.kind === "switch" ? false : ""
    setValues(blank)
    setEditing(null)
    setCreating(true)
  }

  function openEdit(row: T) {
    setValues(toForm(row))
    setEditing(row)
    setCreating(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setFailure(null)
    try {
      await onSave(values, editing?.id ?? null)
      setCreating(false)
    } catch (problem: unknown) {
      setFailure(problem instanceof Error ? problem.message : String(problem))
    } finally {
      setBusy(false)
    }
  }

  const gridColumns: GridColDef<T>[] = [
    ...columns,
    {
      field: "__actions",
      headerName: "",
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" sx={ { gap: 1 } }>
          <Button size="small" onClick={ () => openEdit(params.row) }>Править</Button>
          <Button
            size="small"
            color={ isArchived(params.row) ? "primary" : "warning" }
            onClick={ () => onArchive(params.row, !isArchived(params.row)) }
          >
            { isArchived(params.row) ? archiveLabel.restore : archiveLabel.archive }
          </Button>
        </Stack>
      ),
    },
  ]

  return (
    <Box>
      <PageHeader
        title={ title }
        count={ rows.length }
        hint={ hint }
        actions={
          <Button variant="contained" size="small" startIcon={ <AddIcon/> } onClick={ openCreate }>
            { addLabel }
          </Button>
        }
      />

      { error ? <Alert severity="error" sx={ { mb: 2 } }>{ error }</Alert> : null }

      <Paper>
        <DataGrid
          rows={ [...rows] }
          columns={ gridColumns }
          loading={ loading }
          rowHeight={ 40 }
          columnHeaderHeight={ 40 }
          disableColumnResize
          disableRowSelectionOnClick
          initialState={ { pagination: { paginationModel: { pageSize: 25 } } } }
          pageSizeOptions={ [25, 50] }
        />
      </Paper>

      <Dialog open={ creating } onClose={ busy ? undefined : () => setCreating(false) } maxWidth="xs" fullWidth>
        <form onSubmit={ submit }>
          <DialogTitle>{ editing ? "Правка записи" : addLabel }</DialogTitle>
          <DialogContent>
            <Stack sx={ { gap: 2, mt: 1 } }>
              { fields.map((field) => {
                if (field.kind === "switch") {
                  return (
                    <FormControlLabel
                      key={ field.key }
                      control={
                        <Switch
                          checked={ Boolean(values[field.key]) }
                          onChange={ (event) =>
                            setValues((current) => ({ ...current, [field.key]: event.target.checked })) }
                        />
                      }
                      label={ field.label }
                    />
                  )
                }

                return (
                  <TextField
                    key={ field.key }
                    label={ field.label }
                    required={ field.kind === "text" && field.required }
                    type={ field.kind === "number" ? "number" : "text" }
                    select={ field.kind === "select" }
                    helperText={ "helper" in field ? field.helper : undefined }
                    value={ String(values[field.key] ?? "") }
                    onChange={ (event) =>
                      setValues((current) => ({ ...current, [field.key]: event.target.value })) }
                  >
                    { field.kind === "select"
                      ? [
                        <MenuItem key="__empty" value="">Не указано</MenuItem>,
                        ...field.options.map((option) => (
                          <MenuItem key={ option.value } value={ option.value }>{ option.label }</MenuItem>
                        )),
                      ]
                      : null }
                  </TextField>
                )
              }) }
              { failure ? <Alert severity="error">{ failure }</Alert> : null }
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={ () => setCreating(false) } disabled={ busy }>Отмена</Button>
            <Button type="submit" variant="contained" disabled={ busy }>Сохранить</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
