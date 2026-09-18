import { useNavigate } from "react-router-dom"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import Chip from "@mui/material/Chip"
import Link from "@mui/material/Link"
import Tooltip from "@mui/material/Tooltip"
import type { Instrument } from "../domain/types"
import { STATUS_COLORS, STATUS_LABELS } from "../domain/labels"
import { formatDate } from "../../../shared/dates"
import { ROUTES } from "../../../app/routes"
import type { Directories } from "../../directories/ui/useDirectories"

interface InstrumentsGridProps {
  readonly rows: readonly Instrument[]
  readonly directories: Directories
  readonly loading?: boolean
  readonly rowCount: number
  readonly page: number
  readonly pageSize: number
  onPageChange(page: number): void
}

export function InstrumentsGrid({
  rows, directories, loading, rowCount, page, pageSize, onPageChange,
}: InstrumentsGridProps) {
  const navigate = useNavigate()
  const now = Date.now()

  const columns: GridColDef<Instrument>[] = [
    {
      field: "inventoryNumber",
      headerName: "Инв. номер",
      width: 130,
      renderCell: (params) => (
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={ () => navigate(ROUTES.instrument(params.row.id)) }
        >
          { params.value }
        </Link>
      ),
    },
    { field: "name", headerName: "Прибор", flex: 1.4, minWidth: 150 },
    {
      field: "typeId",
      headerName: "Тип",
      flex: 0.9,
      minWidth: 110,
      valueGetter: (value: string | null) => directories.typeName(value),
    },
    {
      field: "status",
      headerName: "Статус",
      width: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          label={ STATUS_LABELS[params.row.status] }
          color={ STATUS_COLORS[params.row.status] }
          variant="outlined"
        />
      ),
    },
    {
      field: "currentDepartmentId",
      headerName: "Подразделение",
      flex: 1,
      minWidth: 120,
      valueGetter: (value: string | null) => directories.departmentName(value),
    },
    {
      field: "currentLocationId",
      headerName: "Место",
      flex: 1,
      minWidth: 120,
      valueGetter: (value: string | null) => directories.locationName(value),
    },
    {
      field: "currentEmployeeId",
      headerName: "У кого",
      flex: 1.2,
      minWidth: 140,
      valueGetter: (value: string | null) => (value ? directories.employeeName(value) : "—"),
    },
    {
      field: "expectedReturnAt",
      headerName: "Вернуть до",
      width: 120,
      renderCell: (params) => {
        const due = params.row.expectedReturnAt
        if (due === null) return "—"
        const overdue = params.row.status === "CHECKED_OUT" && due < now
        if (!overdue) return formatDate(due)
        return (
          <Tooltip title="Срок возврата прошёл">
            <Chip size="small" color="error" label={ formatDate(due) }/>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <DataGrid
      rows={ [...rows] }
      columns={ columns }
      loading={ loading }
      density="compact"
      disableColumnResize
      disableRowSelectionOnClick
      rowCount={ rowCount }
      paginationMode="server"
      paginationModel={ { page, pageSize } }
      onPaginationModelChange={ (model) => onPageChange(model.page) }
      pageSizeOptions={ [pageSize] }
      sx={ { border: 0 } }
    />
  )
}
