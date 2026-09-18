import Chip from "@mui/material/Chip"
import type { GridColDef } from "@mui/x-data-grid"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { StorageLocation } from "../features/directories/domain/types"

export function LocationsPage() {
  const repo = useRepo()
  const directories = useDirectories()
  const state = useAsync(() => repo.directories.locations(true), [repo])

  const columns: GridColDef<StorageLocation>[] = [
    { field: "name", headerName: "Место хранения", flex: 1, minWidth: 200 },
    {
      field: "departmentId",
      headerName: "Подразделение",
      flex: 1,
      minWidth: 180,
      valueGetter: (value: string | null) =>
        (value ? directories.data?.departmentName(value) ?? "—" : "Общее"),
    },
    { field: "code", headerName: "Код", width: 110 },
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
    <DirectoryScreen<StorageLocation>
      title="Места хранения"
      addLabel="Добавить место"
      hint="Шкафы, стеллажи и верстаки. Сюда прибор возвращается после выдачи"
      rows={ state.data ?? [] }
      columns={ columns }
      loading={ state.loading }
      error={ state.error }
      fields={ [
        { kind: "text", key: "name", label: "Название", required: true },
        {
          kind: "select",
          key: "departmentId",
          label: "Подразделение",
          options: (directories.data?.departments ?? [])
            .filter((row) => !row.isArchived)
            .map((row) => ({ value: row.id, label: row.name })),
        },
        { kind: "text", key: "code", label: "Код" },
        { kind: "text", key: "note", label: "Примечание" },
      ] }
      toForm={ (row) => ({
        name: row.name,
        departmentId: row.departmentId ?? "",
        code: row.code ?? "",
        note: row.note ?? "",
      }) }
      onSave={ async (values: FormValues, id) => {
        const draft = {
          name: String(values.name).trim(),
          departmentId: String(values.departmentId) || null,
          code: String(values.code).trim() || null,
          note: String(values.note).trim() || null,
        }
        if (id) await repo.directories.updateLocation(id, draft)
        else await repo.directories.createLocation(draft)
        state.reload()
      } }
      archiveLabel={ { archive: "В архив", restore: "Вернуть" } }
      isArchived={ (row) => row.isArchived }
      onArchive={ async (row, archived) => {
        await repo.directories.archiveLocation(row.id, archived)
        state.reload()
      } }
    />
  )
}
