import { useNavigate } from "react-router-dom"
import Chip from "@mui/material/Chip"
import Link from "@mui/material/Link"
import type { GridColDef } from "@mui/x-data-grid"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { Employee } from "../features/directories/domain/types"
import { ROUTES } from "../app/routes"

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

  const columns: GridColDef<Employee>[] = [
    {
      field: "fullName",
      headerName: "Сотрудник",
      flex: 1.3,
      minWidth: 190,
      renderCell: (params) => (
        <Link
          component="button" type="button" underline="hover"
          onClick={ () => navigate(ROUTES.employee(params.row.id)) }
        >
          { params.value }
        </Link>
      ),
    },
    { field: "personnelNumber", headerName: "Табельный", width: 105 },
    {
      field: "departmentId",
      headerName: "Подразделение",
      flex: 1,
      minWidth: 130,
      valueGetter: (value: string | null) => directories.data?.departmentName(value) ?? "—",
    },
    { field: "position", headerName: "Должность", flex: 1, minWidth: 140 },
    { field: "phone", headerName: "Телефон", width: 120 },
    {
      field: "__onHands",
      headerName: "На руках",
      width: 95,
      sortable: false,
      renderCell: (params) => {
        const count = state.data?.onHands.get(params.row.id) ?? 0
        return count === 0 ? "—" : <Chip size="small" color="info" variant="outlined" label={ count }/>
      },
    },
    {
      field: "isActive",
      headerName: "Состояние",
      width: 115,
      renderCell: (params) => (params.row.isActive
        ? <Chip size="small" color="success" variant="outlined" label="Работает"/>
        : <Chip size="small" label="Уволен"/>),
    },
  ]

  return (
    <DirectoryScreen<Employee>
      title="Сотрудники"
      addLabel="Добавить сотрудника"
      hint="Кому можно выдавать приборы. Уволенный остаётся в списке — в журнале есть его выдачи"
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
