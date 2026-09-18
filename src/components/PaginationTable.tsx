import { DataGrid } from '@mui/x-data-grid'

interface PaginationTableProps {}

function PaginationTable(props: PaginationTableProps) {
  const {} = props

  return <div>
    <DataGrid
      showToolbar
      columns={ [] }
      { ...props }
    />
  </div>
}

export default PaginationTable
