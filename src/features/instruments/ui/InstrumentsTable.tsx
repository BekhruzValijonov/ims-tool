import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { Instrument } from "../domain/types"
import { StatusMark } from "./StatusMark"
import { formatDate } from "../../../shared/dates"
import { ROUTES } from "../../../app/routes"
import type { Directories } from "../../directories/ui/useDirectories"
import { DataTable, type Column } from "../../../ui/DataTable"
import { Text } from "../../../ui/Text"
import { useStateColors } from "../../../app/theme/useStateColors"

interface InstrumentsTableProps {
  readonly rows: readonly Instrument[]
  readonly directories: Directories
  readonly loading?: boolean
  readonly rowCount: number
  readonly page: number
  readonly pageSize: number
  onPageChange(page: number): void
  readonly empty?: ReactNode
}

export function InstrumentsTable({
  rows, directories, loading, rowCount, page, pageSize, onPageChange, empty,
}: InstrumentsTableProps) {
  const navigate = useNavigate()
  const { state } = useStateColors()
  const now = Date.now()

  const columns: Column<Instrument>[] = [
    {
      key: "inventoryNumber",
      header: "Инв. номер",
      width: 130,
      mono: true,
      render: (row) => (
        <a
          href={ `#${ ROUTES.instrument(row.id) }` }
          onClick={ (event) => { event.preventDefault(); navigate(ROUTES.instrument(row.id)) } }
          style={ { color: "var(--primary-main)", fontWeight: 600, textDecoration: "none" } }
        >
          { row.inventoryNumber }
        </a>
      ),
    },
    { key: "name", header: "Прибор", minWidth: 160, render: (row) => row.name },
    {
      key: "type", header: "Тип", minWidth: 120,
      render: (row) => directories.typeName(row.typeId),
    },
    { key: "status", header: "Состояние", width: 140, render: (row) => <StatusMark status={ row.status }/> },
    {
      key: "department", header: "Подразделение", minWidth: 130,
      render: (row) => directories.departmentName(row.currentDepartmentId),
    },
    {
      key: "location", header: "Место", minWidth: 130,
      render: (row) => directories.locationName(row.currentLocationId),
    },
    {
      key: "employee", header: "У кого", minWidth: 150,
      render: (row) => (row.currentEmployeeId ? directories.employeeName(row.currentEmployeeId) : "—"),
    },
    {
      key: "expectedReturnAt",
      header: "Вернуть до",
      width: 126,
      mono: true,
      render: (row) => {
        const due = row.expectedReturnAt
        if (due === null) return "—"
        /* Просрочка красит саму дату, а не вешает рядом метку: в столбце дат
           метка ломает выравнивание и мешает сравнивать сроки. */
        const overdue = row.status === "CHECKED_OUT" && due < now
        return (
          <Text
            as="span"
            variant="body2"
            mono
            style={ overdue ? { color: state.signal, fontWeight: 600 } : undefined }
          >
            { formatDate(due) }
          </Text>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={ columns }
      rows={ rows }
      rowKey={ (row) => row.id }
      loading={ loading }
      empty={ empty }
      rowCount={ rowCount }
      page={ page }
      pageSize={ pageSize }
      onPageChange={ onPageChange }
    />
  )
}
