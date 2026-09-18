import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { OperationRow } from "./operationRows"
import { formatDateTime } from "../../../shared/dates"
import { ROUTES } from "../../../app/routes"
import { DataTable, type Column } from "../../../ui/DataTable"

interface OperationsTableProps {
  readonly rows: readonly OperationRow[]
  readonly loading?: boolean
  readonly rowCount?: number
  readonly page?: number
  readonly pageSize?: number
  onPageChange?(page: number): void
  /** Сокращённый вид — для врезок на дашборде и в карточке сотрудника. */
  readonly dense?: boolean
  readonly empty?: ReactNode
}

export function OperationsTable({
  rows, loading, rowCount, page, pageSize = 25, onPageChange, dense, empty,
}: OperationsTableProps) {
  const navigate = useNavigate()

  const columns: Column<OperationRow>[] = [
    {
      key: "occurredAt", header: "Когда", width: 180, mono: true,
      render: (row) => formatDateTime(row.occurredAt),
    },
    {
      key: "inventoryNumber",
      header: "Инв. номер",
      width: 130,
      mono: true,
      render: (row) => (
        <a
          href={ `#${ ROUTES.instrument(row.instrumentId) }` }
          onClick={ (event) => { event.preventDefault(); navigate(ROUTES.instrument(row.instrumentId)) } }
          style={ { color: "var(--primary-main)", fontWeight: 600, textDecoration: "none" } }
        >
          { row.inventoryNumber }
        </a>
      ),
    },
    { key: "instrumentName", header: "Прибор", minWidth: 160, render: (row) => row.instrumentName },
    { key: "kind", header: "Операция", width: 130, render: (row) => row.kind },
    { key: "employee", header: "Сотрудник", minWidth: 160, render: (row) => row.employee },
    { key: "place", header: "Место", minWidth: 140, render: (row) => row.place },
    ...(dense ? [] : [
      { key: "operator", header: "Внёс", minWidth: 160, render: (row: OperationRow) => row.operator },
      { key: "note", header: "Примечание", minWidth: 160, render: (row: OperationRow) => row.note },
    ]),
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
