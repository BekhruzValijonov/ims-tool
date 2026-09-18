import { useNavigate } from "react-router-dom"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { Employee } from "../features/directories/domain/types"
import { ROUTES } from "../app/routes"
import { Chip } from "../ui/Chip"
import type { Column } from "../ui/DataTable"

export function EmployeesPage() {
  const repo = useRepo()
  const navigate = useNavigate()
  const directories = useDirectories()

  const state = useAsync(async () => {
    const [employees, issued] = await Promise.all([
      repo.directories.employees({ includeInactive: true }),
      repo.instruments.list({ statuses: ["CHECKED_OUT"], pageSize: 100000 }),
    ])
    const onHands = new Map<string, number>()
    for (const instrument of issued.rows) {
      if (!instrument.currentEmployeeId) continue
      onHands.set(instrument.currentEmployeeId, (onHands.get(instrument.currentEmployeeId) ?? 0) + 1)
    }
    return { employees, onHands }
  }, [repo])

  const columns: Column<Employee>[] = [
    {
      key: "fullName", header: "Сотрудник", minWidth: 200,
      render: (row) => (
        <a
          href={ `#${ ROUTES.employee(row.id) }` }
          onClick={ (event) => { event.preventDefault(); navigate(ROUTES.employee(row.id)) } }
          style={ { color: "var(--primary-main)", fontWeight: 600, textDecoration: "none" } }
        >
          { row.fullName }
        </a>
      ),
    },
    { key: "personnelNumber", header: "Табельный", width: 110, mono: true, render: (row) => row.personnelNumber ?? "—" },
    {
      key: "department", header: "Подразделение", minWidth: 140,
      render: (row) => directories.data?.departmentName(row.departmentId) ?? "—",
    },
    { key: "position", header: "Должность", minWidth: 150, render: (row) => row.position ?? "—" },
    { key: "phone", header: "Телефон", width: 130, render: (row) => row.phone ?? "—" },
    {
      key: "onHands", header: "На руках", width: 100, align: "right",
      render: (row) => {
        const count = state.data?.onHands.get(row.id) ?? 0
        return count === 0 ? "—" : <Chip color="info">{ count }</Chip>
      },
    },
    {
      key: "state", header: "Состояние", width: 130,
      render: (row) => (row.isActive ? <Chip color="primary">Работает</Chip> : <Chip>Уволен</Chip>),
    },
  ]

  return (
    <DirectoryScreen<Employee>
      title="Сотрудники"
      addLabel="Добавить сотрудника"
      tour="employees"
      hint="Кому можно выдавать приборы. Уволенный остаётся в списке — в журнале есть его выдачи"
      emptyText="Добавьте тех, кому будете выдавать приборы: выдать прибор человеку, которого нет в списке, нельзя."
      rows={ state.data?.employees ?? [] }
      columns={ columns }
      loading={ state.loading }
      error={ state.error }
      fields={ [
        { kind: "text", key: "fullName", label: "ФИО", required: true },
        { kind: "text", key: "personnelNumber", label: "Табельный номер" },
        {
          kind: "select",
          key: "departmentId",
          label: "Подразделение",
          options: (directories.data?.departments ?? [])
            .filter((row) => !row.isArchived)
            .map((row) => ({ value: row.id, label: row.name })),
        },
        { kind: "text", key: "position", label: "Должность" },
        { kind: "text", key: "phone", label: "Телефон" },
      ] }
      toForm={ (row) => ({
        fullName: row.fullName,
        personnelNumber: row.personnelNumber ?? "",
        departmentId: row.departmentId ?? "",
        position: row.position ?? "",
        phone: row.phone ?? "",
      }) }
      onSave={ async (values: FormValues, id) => {
        const draft = {
          fullName: String(values.fullName).trim(),
          personnelNumber: String(values.personnelNumber).trim() || null,
          departmentId: String(values.departmentId) || null,
          position: String(values.position).trim() || null,
          phone: String(values.phone).trim() || null,
        }
        if (id) await repo.directories.updateEmployee(id, draft)
        else await repo.directories.createEmployee(draft)
        state.reload()
      } }
      /* Уволенному сотруднику прибор выдать нельзя — это проверяется при
         выдаче. Из справочника он не исчезает: в журнале остались его выдачи. */
      archiveLabel={ { archive: "Уволить", restore: "Вернуть" } }
      isArchived={ (row) => !row.isActive }
      onArchive={ async (row, archived) => {
        await repo.directories.setEmployeeActive(row.id, !archived)
        state.reload()
      } }
    />
  )
}
