import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { Department } from "../features/directories/domain/types"
import { Chip } from "../ui/Chip"
import { Text } from "../ui/Text"
import type { Column } from "../ui/DataTable"

export function DepartmentsPage() {
  const repo = useRepo()
  const state = useAsync(() => repo.directories.departments(true), [repo])

  const columns: Column<Department>[] = [
    { key: "name", header: "Подразделение", minWidth: 200, render: (row) => row.name },
    { key: "code", header: "Код", width: 120, render: (row) => row.code ?? "—" },
    {
      /* Метку получает архивная запись, а не работающая: помечать норму
         значит закрасить весь столбец и спрятать в нём исключение. */
      key: "state", header: "Состояние", width: 140,
      render: (row) => (row.isArchived
        ? <Chip>В архиве</Chip>
        : <Text tone="secondary" as="span">Работает</Text>),
    },
  ]

  return (
    <DirectoryScreen<Department>
      title="Подразделения"
      addLabel="Добавить подразделение"
      tour="departments"
      hint="Цеха, лаборатории и участки, за которыми числятся приборы"
      emptyText="Заведите цеха и лаборатории — за ними будут числиться приборы. Пока их нет, прибор некуда приписать."
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
