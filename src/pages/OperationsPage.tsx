import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { OperationsGrid } from "../features/operations/ui/OperationsGrid"
import { toOperationRows } from "../features/operations/ui/operationRows"
import { EVENT_LABELS } from "../features/operations/domain/labels"
import type { EventKind, JournalQuery } from "../features/operations/domain/types"
import type { Instrument } from "../features/instruments/domain/types"
import { csvFileName, toCsv } from "../shared/csv"
import { saveTextFile } from "../platform/saveFile"
import { DAY_MS, formatDateTime } from "../shared/dates"

const PAGE_SIZE = 25

function readQuery(params: URLSearchParams): JournalQuery {
  const kind = params.get("kind")
  return {
    kinds: kind ? [kind as EventKind] : undefined,
    employeeId: params.get("employee") ?? undefined,
    departmentId: params.get("department") ?? undefined,
    from: params.get("from") ? new Date(params.get("from")!).getTime() : undefined,
    to: params.get("to") ? new Date(params.get("to")!).getTime() + DAY_MS - 1 : undefined,
  }
}

/**
 * Журнал операций.
 *
 * Главный источник ответов на вопрос «что происходило»: по нему строятся
 * отчёты, и именно он остаётся, когда прибор списан.
 */
export function OperationsPage() {
  const repo = useRepo()
  const directories = useDirectories()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)

  const query = readQuery(params)
  const state = useAsync(async () => {
    const journal = await repo.operations.journal({ ...query, page, pageSize: PAGE_SIZE })
    const ids = [...new Set(journal.rows.map((event) => event.instrumentId))]
    const loaded = await Promise.all(ids.map((id) => repo.instruments.getById(id)))
    const instruments = new Map<string, Instrument>()
    for (const instrument of loaded) if (instrument) instruments.set(instrument.id, instrument)
    return { journal, instruments }
  }, [repo, params.toString(), page])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === "") next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
    setPage(0)
  }

  async function exportCsv() {
    if (!directories.data) return
    setExporting(true)
    try {
      const all = await repo.operations.journal({ ...query, page: 0, pageSize: 100000 })
      const ids = [...new Set(all.rows.map((event) => event.instrumentId))]
      const loaded = await Promise.all(ids.map((id) => repo.instruments.getById(id)))
      const instruments = new Map<string, Instrument>()
      for (const instrument of loaded) if (instrument) instruments.set(instrument.id, instrument)

      const rows = toOperationRows(all.rows, instruments, directories.data)
      const csv = toCsv(rows, [
        { header: "Когда", value: (row) => formatDateTime(row.occurredAt) },
        { header: "Инвентарный номер", value: (row) => row.inventoryNumber },
        { header: "Прибор", value: (row) => row.instrumentName },
        { header: "Операция", value: (row) => row.kind },
        { header: "Сотрудник", value: (row) => row.employee },
        { header: "Место", value: (row) => row.place },
        { header: "Внёс", value: (row) => row.operator },
        { header: "Примечание", value: (row) => row.note },
      ])
      await saveTextFile(csvFileName("zhurnal-operaciy"), csv)
    } finally {
      setExporting(false)
    }
  }

  const dirs = directories.data

  return (
    <Box sx={ { width: "100%", maxWidth: { sm: "100%", md: "1700px" } } }>
      <Stack
        direction="row"
        sx={ { justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" } }
      >
        <Typography component="h2" variant="h6">
          Операции
          { state.data ? <Chip size="small" sx={ { ml: 1 } } label={ state.data.journal.total }/> : null }
        </Typography>
        <Button
          variant="outlined" size="small" startIcon={ <FileDownloadIcon/> }
          onClick={ exportCsv } disabled={ exporting || !dirs }
        >
          Экспорт
        </Button>
      </Stack>

      <Card variant="outlined" sx={ { mb: 2 } }>
        <CardContent>
          <Stack direction="row" sx={ { gap: 2, flexWrap: "wrap" } }>
            <TextField
              size="small" select label="Операция" sx={ { minWidth: 180 } }
              value={ params.get("kind") ?? "" }
              onChange={ (event) => setParam("kind", event.target.value) }
            >
              <MenuItem value="">Любая</MenuItem>
              { (Object.keys(EVENT_LABELS) as EventKind[]).map((kind) => (
                <MenuItem key={ kind } value={ kind }>{ EVENT_LABELS[kind] }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" select label="Сотрудник" sx={ { minWidth: 220 } }
              value={ params.get("employee") ?? "" }
              onChange={ (event) => setParam("employee", event.target.value) }
            >
              <MenuItem value="">Любой</MenuItem>
              { dirs?.employees.map((employee) => (
                <MenuItem key={ employee.id } value={ employee.id }>{ employee.fullName }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" select label="Подразделение" sx={ { minWidth: 200 } }
              value={ params.get("department") ?? "" }
              onChange={ (event) => setParam("department", event.target.value) }
            >
              <MenuItem value="">Любое</MenuItem>
              { dirs?.departments.map((department) => (
                <MenuItem key={ department.id } value={ department.id }>{ department.name }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" type="date" label="С" slotProps={ { inputLabel: { shrink: true } } }
              value={ params.get("from") ?? "" }
              onChange={ (event) => setParam("from", event.target.value) }
            />
            <TextField
              size="small" type="date" label="По" slotProps={ { inputLabel: { shrink: true } } }
              value={ params.get("to") ?? "" }
              onChange={ (event) => setParam("to", event.target.value) }
            />
          </Stack>
        </CardContent>
      </Card>

      { state.error ? <Alert severity="error" sx={ { mb: 2 } }>{ state.error }</Alert> : null }

      <Card variant="outlined">
        <CardContent sx={ { p: 0, "&:last-child": { pb: 0 } } }>
          { dirs && state.data ? (
            <OperationsGrid
              rows={ toOperationRows(state.data.journal.rows, state.data.instruments, dirs) }
              loading={ state.loading }
              rowCount={ state.data.journal.total }
              page={ page }
              pageSize={ PAGE_SIZE }
              onPageChange={ setPage }
            />
          ) : null }
        </CardContent>
      </Card>
    </Box>
  )
}
