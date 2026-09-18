import { useState, type FormEvent, type ReactNode } from "react"
import { PageHeader } from "../../../shared/ui/PageHeader"
import { EmptyState } from "../../../shared/ui/EmptyState"
import type { TourId } from "../../../tour/steps"
import { Alert } from "../../../ui/Alert"
import { Button } from "../../../ui/Button"
import { Card } from "../../../ui/Card"
import { Page } from "../../../ui/Page"
import { DataTable, type Column } from "../../../ui/DataTable"
import { Dialog } from "../../../ui/Dialog"
import { TextField } from "../../../ui/Field"
import { Select, type Option } from "../../../ui/Select"
import { Checkbox } from "../../../ui/Choice"
import { Stack } from "../../../ui/layout"
import { IconPlus } from "../../../ui/icons"

export type FieldSpec =
  | { kind: "text"; key: string; label: string; required?: boolean; helper?: string }
  | { kind: "number"; key: string; label: string; helper?: string }
  | { kind: "select"; key: string; label: string; options: readonly Option[] }
  | { kind: "switch"; key: string; label: string; helper?: string }

export type FormValues = Record<string, string | boolean>

interface DirectoryScreenProps<T extends { id: string }> {
  readonly title: string
  readonly addLabel: string
  /** Обход экрана: у четырёх справочников он свой, хотя разметка общая. */
  readonly tour: TourId
  /** Одна строка о том, зачем справочник нужен. */
  readonly hint?: string
  /** Что написать, когда справочник ещё пуст. */
  readonly emptyText: string
  readonly rows: readonly T[]
  readonly columns: readonly Column<T>[]
  readonly fields: readonly FieldSpec[]
  readonly loading?: boolean
  readonly error?: string | null
  /** Что подставить в форму при правке существующей записи. */
  toForm(row: T): FormValues
  onSave(values: FormValues, id: string | null): Promise<void>
  /** Заголовок кнопки архивирования зависит от справочника: «в архив» или «уволить». */
  readonly archiveLabel: { archive: string; restore: string }
  isArchived(row: T): boolean
  onArchive(row: T, archived: boolean): Promise<void>
}

/**
 * Экран справочника.
 *
 * Четыре справочника отличаются только набором полей, поэтому таблица, окно
 * правки и архивирование написаны один раз.
 *
 * Удаления нет нигде: на записи справочника ссылается журнал, и удалить
 * подразделение значит стереть смысл прошлых операций. Есть архивирование —
 * запись перестаёт предлагаться в формах, но прошлое остаётся читаемым.
 */
export function DirectoryScreen<T extends { id: string }>({
  title, addLabel, tour, hint, emptyText, rows, columns, fields, loading, error,
  toForm, onSave, archiveLabel, isArchived, onArchive,
}: DirectoryScreenProps<T>) {
  const [editing, setEditing] = useState<T | null>(null)
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  function openCreate() {
    const blank: FormValues = {}
    for (const field of fields) blank[field.key] = field.kind === "switch" ? false : ""
    setValues(blank)
    setEditing(null)
    setFailure(null)
    setOpen(true)
  }

  function openEdit(row: T) {
    setValues(toForm(row))
    setEditing(row)
    setFailure(null)
    setOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setFailure(null)
    try {
      await onSave(values, editing?.id ?? null)
      setOpen(false)
    } catch (problem: unknown) {
      setFailure(problem instanceof Error ? problem.message : String(problem))
    } finally {
      setBusy(false)
    }
  }

  const actionsColumn: Column<T> = {
    key: "__actions",
    header: "",
    width: 190,
    align: "right",
    render: (row) => (
      <Stack row gap={ 0.5 } justify="end">
        <Button size="small" onClick={ () => openEdit(row) }>Править</Button>
        <Button
          size="small"
          color={ isArchived(row) ? "primary" : "inherit" }
          onClick={ () => onArchive(row, !isArchived(row)) }
        >
          { isArchived(row) ? archiveLabel.restore : archiveLabel.archive }
        </Button>
      </Stack>
    ),
  }

  const addButton: ReactNode = (
    <Button variant="contained" startIcon={ <IconPlus size={ 18 }/> } onClick={ openCreate }>
      { addLabel }
    </Button>
  )

  return (
    <Page fill>
      <PageHeader
        title={ title } hint={ hint } tour={ tour }
        /* Та же кнопка стоит и в пустом состоянии, а якорь обхода достаётся
           заголовочной: два элемента с одним `data-tour` — подсветка наугад. */
        actions={ <span data-tour="directory-add">{ addButton }</span> }
      />

      { error ? <Alert severity="error" className="mb-2">{ error }</Alert> : null }

      <Card
        padding="none"
        style={ { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } }
        data-tour="directory-table"
      >
        <DataTable
          columns={ [...columns, actionsColumn] }
          rows={ rows }
          rowKey={ (row) => row.id }
          loading={ loading }
          empty={
            <EmptyState title={ `${ title }: пока пусто` } action={ addButton }>
              { emptyText }
            </EmptyState>
          }
        />
      </Card>

      <Dialog
        open={ open }
        title={ editing ? "Правка записи" : addLabel }
        onClose={ busy ? undefined : () => setOpen(false) }
        onSubmit={ submit }
        actions={ <>
          <Button onClick={ () => setOpen(false) } disabled={ busy }>Отмена</Button>
          <Button type="submit" variant="contained" disabled={ busy }>Сохранить</Button>
        </> }
      >
        <Stack gap={ 2 }>
          { fields.map((field) => {
            if (field.kind === "switch") {
              return (
                <Checkbox
                  key={ field.key }
                  checked={ Boolean(values[field.key]) }
                  onChange={ (checked) =>
                    setValues((current) => ({ ...current, [field.key]: checked })) }
                >
                  { field.label }
                </Checkbox>
              )
            }

            if (field.kind === "select") {
              return (
                <Select
                  key={ field.key }
                  label={ field.label }
                  value={ String(values[field.key] ?? "") }
                  options={ field.options }
                  emptyLabel="Не указано"
                  onChange={ (value) => setValues((current) => ({ ...current, [field.key]: value })) }
                  fullWidth
                />
              )
            }

            return (
              <TextField
                key={ field.key }
                label={ field.label }
                type={ field.kind === "number" ? "number" : "text" }
                required={ field.kind === "text" && field.required }
                helper={ field.helper }
                value={ String(values[field.key] ?? "") }
                onChange={ (value) => setValues((current) => ({ ...current, [field.key]: value })) }
                fullWidth
              />
            )
          }) }
          { failure ? <Alert severity="error">{ failure }</Alert> : null }
        </Stack>
      </Dialog>
    </Page>
  )
}
