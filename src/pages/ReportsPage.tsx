import { useMemo, useState } from "react"
import Alert from "@mui/material/Alert"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardActionArea from "@mui/material/CardActionArea"
import CardContent from "@mui/material/CardContent"
import Grid from "@mui/material/Grid"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import { DataGrid } from "@mui/x-data-grid"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { REPORTS, type ReportInput } from "../features/reports/data/reports"
import { csvFileName, toCsv } from "../shared/csv"
import { saveTextFile } from "../platform/saveFile"
import { DAY_MS } from "../shared/dates"

function toDateInput(timestamp: number): string {
  const date = new Date(timestamp)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

export function ReportsPage() {
  const repo = useRepo()
  const directories = useDirectories()

  const [selected, setSelected] = useState(REPORTS[0].id)
  const [from, setFrom] = useState(toDateInput(Date.now() - 30 * DAY_MS))
  const [to, setTo] = useState(toDateInput(Date.now()))
  const [horizonDays, setHorizonDays] = useState(30)
  const [instrumentId, setInstrumentId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const report = REPORTS.find((item) => item.id === selected) ?? REPORTS[0]

  const input = useMemo<ReportInput>(() => ({
    from: new Date(from).getTime(),
    to: new Date(to).getTime() + DAY_MS - 1,
    horizonDays,
    instrumentId,
  }), [from, to, horizonDays, instrumentId])

  /* Список приборов нужен единственному отчёту — паспорту движения, — поэтому
     грузится только когда выбран он. */
  const instruments = useAsync(
    async () => (report.params.includes("instrument")
      ? (await repo.instruments.list({ pageSize: 100000 })).rows
      : []),
    [repo, report.id],
  )

  const state = useAsync(
    async () => (directories.data ? report.run(repo, directories.data, input) : null),
    [repo, directories.data, report.id, input],
  )

  async function exportCsv() {
    if (!state.data) return
    setExporting(true)
    try {
      const csv = toCsv(state.data.rows, [...state.data.csv])
      await saveTextFile(csvFileName(state.data.fileName), csv)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box sx={ { width: "100%", maxWidth: { sm: "100%", md: "1700px" } } }>
      <Typography component="h2" variant="h6" sx={ { mb: 2 } }>Отчёты</Typography>

      <Grid container spacing={ 2 } columns={ 12 } sx={ { mb: 2 } }>
        { REPORTS.map((item) => (
          <Grid key={ item.id } size={ { xs: 12, sm: 6, lg: 4 } }>
            <Card variant={ item.id === selected ? "elevation" : "outlined" } sx={ { height: "100%" } }>
              <CardActionArea sx={ { height: "100%" } } onClick={ () => setSelected(item.id) }>
                <CardContent>
                  <Typography variant="subtitle2">{ item.title }</Typography>
                  <Typography variant="caption" sx={ { color: "text.secondary" } }>
                    { item.description }
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        )) }
      </Grid>

      <Card variant="outlined" sx={ { mb: 2 } }>
        <CardContent>
          <Stack direction="row" sx={ { gap: 2, flexWrap: "wrap", alignItems: "center" } }>
            <Typography variant="subtitle2" sx={ { minWidth: 220 } }>{ report.title }</Typography>

            { report.params.includes("period") ? (
              <>
                <TextField
                  size="small" type="date" label="С" slotProps={ { inputLabel: { shrink: true } } }
                  value={ from } onChange={ (event) => setFrom(event.target.value) }
                />
                <TextField
                  size="small" type="date" label="По" slotProps={ { inputLabel: { shrink: true } } }
                  value={ to } onChange={ (event) => setTo(event.target.value) }
                />
              </>
            ) : null }

            { report.params.includes("horizon") ? (
              <TextField
                size="small" select label="Горизонт" sx={ { minWidth: 180 } }
                value={ horizonDays }
                onChange={ (event) => setHorizonDays(Number(event.target.value)) }
              >
                <MenuItem value={ 30 }>30 дней</MenuItem>
                <MenuItem value={ 60 }>60 дней</MenuItem>
                <MenuItem value={ 90 }>90 дней</MenuItem>
              </TextField>
            ) : null }

            { report.params.includes("instrument") ? (
              <Autocomplete
                size="small"
                sx={ { minWidth: 360 } }
                options={ instruments.data ?? [] }
                getOptionLabel={ (option) => `${ option.inventoryNumber } — ${ option.name }` }
                value={ (instruments.data ?? []).find((row) => row.id === instrumentId) ?? null }
                onChange={ (_event, value) => setInstrumentId(value?.id ?? null) }
                renderInput={ (params) => <TextField { ...params } label="Прибор"/> }
              />
            ) : null }

            <Box sx={ { flexGrow: 1 } }/>
            <Button
              variant="outlined" size="small" startIcon={ <FileDownloadIcon/> }
              onClick={ exportCsv } disabled={ exporting || !state.data || state.data.rows.length === 0 }
            >
              Выгрузить CSV
            </Button>
          </Stack>

          { state.data ? (
            <Typography variant="caption" sx={ { color: "text.secondary", mt: 1, display: "block" } }>
              { state.data.summary }
            </Typography>
          ) : null }
        </CardContent>
      </Card>

      { state.error ? <Alert severity="error" sx={ { mb: 2 } }>{ state.error }</Alert> : null }

      <Card variant="outlined">
        <CardContent sx={ { p: 0, "&:last-child": { pb: 0 } } }>
          <DataGrid
            rows={ [...(state.data?.rows ?? [])] }
            columns={ [...(state.data?.columns ?? [])] }
            loading={ state.loading }
            density="compact"
            disableColumnResize
            disableRowSelectionOnClick
            initialState={ { pagination: { paginationModel: { pageSize: 25 } } } }
            pageSizeOptions={ [25, 50, 100] }
            sx={ { border: 0, minHeight: 320 } }
          />
        </CardContent>
      </Card>
    </Box>
  )
}
