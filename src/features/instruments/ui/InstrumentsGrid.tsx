import { useNavigate } from "react-router-dom"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import Link from "@mui/material/Link"
import Typography from "@mui/material/Typography"
import type { Instrument } from "../domain/types"
import { StatusMark } from "./StatusMark"
import { formatDate } from "../../../shared/dates"
import { MONO_CELL, monoSx } from "../../../shared/ui/dataText"
import { useStateColors } from "../../../app/theme/useStateColors"
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
  const { state } = useStateColors()
  const now = Date.now()

  const columns: GridColDef<Instrument>[] = [
    {
      field: "inventoryNumber",
      headerName: "Инв. номер",
      width: 126,
      cellClassName: MONO_CELL,
      renderCell: (params) => (
        <Link
          component="button"
          type="button"
          sx={ monoSx }
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
      headerName: "Состояние",
      width: 130,
      renderCell: (params) => <StatusMark status={ params.row.status }/>,
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
      width: 118,
      cellClassName: MONO_CELL,
      renderCell: (params) => {
        const due = params.row.expectedReturnAt
        if (due === null) return "—"
        /* Просрочка помечается цветом самой даты, а не пилюлей: в столбце дат
           пилюля ломает выравнивание и мешает сравнивать сроки. */
        const overdue = params.row.status === "CHECKED_OUT" && due < now
        return (
          <Typography
            component="span"
            sx={ { ...monoSx, fontSize: "inherit", color: overdue ? state.signal : "inherit", fontWeight: overdue ? 500 : 400 } }
          >
            { formatDate(due) }
          </Typography>
        )
      },
    },
  ]

  return (
    <DataGrid
      rows={ [...rows] }
      columns={ columns }
      loading={ loading }
      rowHeight={ 40 }
      columnHeaderHeight={ 40 }
      disableColumnResize
      disableRowSelectionOnClick
      rowCount={ rowCount }
      paginationMode="server"
      paginationModel={ { page, pageSize } }
      onPaginationModelChange={ (model) => onPageChange(model.page) }
      pageSizeOptions={ [pageSize] }
    />
  )
}
