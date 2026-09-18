import Chip from "@mui/material/Chip"
import type { GridColDef } from "@mui/x-data-grid"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { InstrumentType } from "../features/directories/domain/types"

export function InstrumentTypesPage() {
  const repo = useRepo()
  const state = useAsync(() => repo.directories.instrumentTypes(true), [repo])

  const columns: GridColDef<InstrumentType>[] = [
    { field: "name", headerName: "Тип прибора", flex: 1, minWidth: 220 },
    {
      field: "requiresVerification",
      headerName: "Поверка",
      width: 150,
      renderCell: (params) => (params.row.requiresVerification
        ? <Chip size="small" color="info" variant="outlined" label="Требуется"/>
        : <Chip size="small" label="Не требуется"/>),
    },
    {
      field: "defaultVerificationIntervalMonths",
      headerName: "Межповерочный интервал",
      width: 210,
      valueGetter: (value: number | null) => (value === null ? "—" : `${ value } мес.`),
    },
    {
      field: "isArchived",
      headerName: "Состояние",
      width: 130,
      renderCell: (params) => (params.row.isArchived
        ? <Chip size="small" label="В архиве"/>
        : <Chip size="small" color="success" variant="outlined" label="Используется"/>),
    },
  ]

  return (
    <DirectoryScreen<InstrumentType>
      title="Типы приборов"
      addLabel="Добавить тип"
      rows={ state.data ?? [] }
      columns={ columns }
      loading={ state.loading }
      error={ state.error }
      fields={ [
        { kind: "text", key: "name", label: "Название", required: true },
        {
          kind: "switch",
          key: "requiresVerification",
          label: "Подлежит поверке",
        },
        {
          kind: "number",
          key: "defaultVerificationIntervalMonths",
          label: "Межповерочный интервал, мес.",
          helper: "Подставляется при приёме с поверки",
        },
      ] }
      toForm={ (row) => ({
        name: row.name,
        requiresVerification: row.requiresVerification,
        defaultVerificationIntervalMonths: row.defaultVerificationIntervalMonths === null
          ? ""
          : String(row.defaultVerificationIntervalMonths),
      }) }
      onSave={ async (values: FormValues, id) => {
        const months = String(values.defaultVerificationIntervalMonths).trim()
        const draft = {
          name: String(values.name).trim(),
          requiresVerification: Boolean(values.requiresVerification),
          defaultVerificationIntervalMonths: months === "" ? null : Number(months),
        }
        if (id) await repo.directories.updateInstrumentType(id, draft)
        else await repo.directories.createInstrumentType(draft)
        state.reload()
      } }
      archiveLabel={ { archive: "В архив", restore: "Вернуть" } }
      isArchived={ (row) => row.isArchived }
      onArchive={ async (row, archived) => {
        await repo.directories.archiveInstrumentType(row.id, archived)
        state.reload()
      } }
    />
  )
}
