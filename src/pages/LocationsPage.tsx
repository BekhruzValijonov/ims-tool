import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { StorageLocation } from "../features/directories/domain/types"
import { Chip } from "../ui/Chip"
import type { Column } from "../ui/DataTable"

export function LocationsPage() {
  const repo = useRepo()
  const directories = useDirectories()
  const state = useAsync(() => repo.directories.locations(true), [repo])

  const columns: Column<StorageLocation>[] = [
    { key: "name", header: "Место хранения", minWidth: 200, render: (row) => row.name },
    {
      key: "department", header: "Подразделение", minWidth: 180,
      render: (row) => (row.departmentId ? directories.data?.departmentName(row.departmentId) ?? "—" : "Общее"),
    },
    { key: "code", header: "Код", width: 110, render: (row) => row.code ?? "—" },
    {
      key: "state", header: "Состояние", width: 150,
      render: (row) => (row.isArchived
        ? <Chip>В архиве</Chip>
        : <Chip color="primary">Используется</Chip>),
    },
  ]

  return (
    <DirectoryScreen<StorageLocation>
      title="Места хранения"
      addLabel="Добавить место"
      hint="Шкафы, стеллажи и верстаки. Сюда прибор возвращается после выдачи"
      emptyText="Заведите шкафы и стеллажи. В место хранения прибор вернётся сам, когда его сдадут: в форме возврата места нет."
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
