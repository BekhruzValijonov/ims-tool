import { useNavigate } from "react-router-dom"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import Link from "@mui/material/Link"
import type { OperationRow } from "./operationRows"
import { formatDateTime } from "../../../shared/dates"
import { MONO_CELL, monoSx } from "../../../shared/ui/dataText"
import { ROUTES } from "../../../app/routes"

interface OperationsGridProps {
  readonly rows: readonly OperationRow[]
  readonly loading?: boolean
  readonly rowCount?: number
  readonly page?: number
  readonly pageSize?: number
  onPageChange?(page: number): void
  readonly dense?: boolean
}

export function OperationsGrid({
  rows, loading, rowCount, page = 0, pageSize = 25, onPageChange, dense,
}: OperationsGridProps) {
  const navigate = useNavigate()

  const columns: GridColDef<OperationRow>[] = [
    {
      field: "occurredAt",
      headerName: "Когда",
      width: 166,
      cellClassName: MONO_CELL,
      valueFormatter: (value: number) => formatDateTime(value),
    },
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
          onClick={ () => navigate(ROUTES.instrument(params.row.instrumentId)) }
        >
          { params.value }
        </Link>
      ),
    },
    { field: "instrumentName", headerName: "Прибор", flex: 1, minWidth: 160 },
    { field: "kind", headerName: "Операция", width: 130 },
    { field: "employee", headerName: "Сотрудник", flex: 1, minWidth: 160 },
    { field: "place", headerName: "Место", flex: 1, minWidth: 150 },
    ...(dense ? [] : [
      { field: "operator", headerName: "Внёс", flex: 1, minWidth: 160 } as GridColDef<OperationRow>,
      { field: "note", headerName: "Примечание", flex: 1, minWidth: 160 } as GridColDef<OperationRow>,
    ]),
  ]

  const serverSide = rowCount !== undefined

  return (
    <DataGrid
      rows={ [...rows] }
      columns={ columns }
      loading={ loading }
      rowHeight={ 40 }
      columnHeaderHeight={ 40 }
      disableColumnResize
      disableRowSelectionOnClick
      hideFooter={ !serverSide }
      rowCount={ rowCount }
      paginationMode={ serverSide ? "server" : "client" }
      paginationModel={ serverSide ? { page, pageSize } : undefined }
      onPaginationModelChange={ serverSide ? (model) => onPageChange?.(model.page) : undefined }
      pageSizeOptions={ [pageSize] }
    />
  )
}
