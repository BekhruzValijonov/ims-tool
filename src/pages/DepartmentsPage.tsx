import Chip from "@mui/material/Chip"
import type { GridColDef } from "@mui/x-data-grid"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { Department } from "../features/directories/domain/types"

export function DepartmentsPage() {
  const repo = useRepo()
  const state = useAsync(() => repo.directories.departments(true), [repo])

  const columns: GridColDef<Department>[] = [
    { field: "name", headerName: "Подразделение", flex: 1, minWidth: 200 },
    { field: "code", headerName: "Код", width: 120 },
    {
      field: "isArchived",
      headerName: "Состояние",
      width: 140,
      renderCell: (params) => (params.row.isArchived
        ? <Chip size="small" label="В архиве"/>
        : <Chip size="small" color="success" variant="outlined" label="Работает"/>),
    },
  ]

  return (
    <DirectoryScreen<Department>
      title="Подразделения"
      addLabel="Добавить подразделение"
      rows={ state.data ?? [] }
      columns={ columns }
      loading={ state.loading }
      error={ state.error }
      fields={ [
        { kind: "text", key: "name", label: "Название", required: true },
        { kind: "text", key: "code", label: "Код" },
      ] }
      toForm={ (row) => ({ name: row.name, code: row.code ?? "" }) }
      onSave={ async (values: FormValues, id) => {
        const draft = { name: String(values.name).trim(), code: String(values.code).trim() || null }
        if (id) await repo.directories.updateDepartment(id, draft)
        else await repo.directories.createDepartment(draft)
        state.reload()
      } }
      archiveLabel={ { archive: "В архив", restore: "Вернуть" } }
      isArchived={ (row) => row.isArchived }
      onArchive={ async (row, archived) => {
        await repo.directories.archiveDepartment(row.id, archived)
        state.reload()
      } }
    />
  )
}
