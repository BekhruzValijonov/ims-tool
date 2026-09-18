import { useMemo, useState } from "react"
import Alert from "@mui/material/Alert"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import ButtonBase from "@mui/material/ButtonBase"
import Paper from "@mui/material/Paper"
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
import { DateField } from "../shared/ui/DateField"
import { PageHeader } from "../shared/ui/PageHeader"

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
    <Box>
      <PageHeader title="Отчёты" hint="Выберите отчёт, задайте параметры и выгрузите его в CSV"/>

      <Grid container spacing={ 1.5 } columns={ 12 } sx={ { mb: 2 } }>
        { REPORTS.map((item) => {
          const active = item.id === selected
          return (
            <Grid key={ item.id } size={ { xs: 12, sm: 6, lg: 4 } }>
              <ButtonBase
                onClick={ () => setSelected(item.id) }
                sx={ {
                  width: "100%", height: "100%", textAlign: "left", display: "block",
                  p: 1.5, borderRadius: 1,
                  border: 1,
                  borderColor: active ? "text.primary" : "divider",
                  backgroundColor: "background.paper",
                  /* Выбранный отчёт отмечен планкой слева и рамкой потемнее —
                     тем же приёмом, что и текущий раздел в меню. */
                  boxShadow: active ? (theme) => `inset 3px 0 0 ${ theme.palette.text.primary }` : "none",
                } }
              >
                <Typography variant="subtitle2">{ item.title }</Typography>
                <Typography variant="caption" sx={ { color: "text.secondary", display: "block" } }>
                  { item.description }
                </Typography>
              </ButtonBase>
            </Grid>
          )
        }) }
      </Grid>

      <Paper sx={ { p: 2, mb: 2 } }>
          <Stack direction="row" sx={ { gap: 2, flexWrap: "wrap", alignItems: "center" } }>
            <Typography variant="subtitle2" sx={ { minWidth: 220 } }>{ report.title }</Typography>

            { report.params.includes("period") ? (
              <>
                <DateField label="С" value={ from } onChange={ setFrom }/>
                <DateField label="По" value={ to } onChange={ setTo }/>
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
          <Typography variant="body2" sx={ { color: "text.secondary", mt: 1.5 } }>
            { state.data.summary }
          </Typography>
        ) : null }
      </Paper>

      { state.error ? <Alert severity="error" sx={ { mb: 2 } }>{ state.error }</Alert> : null }

      <Paper>
        <DataGrid
          rows={ [...(state.data?.rows ?? [])] }
          columns={ [...(state.data?.columns ?? [])] }
          loading={ state.loading }
          rowHeight={ 40 }
          columnHeaderHeight={ 40 }
          disableColumnResize
          disableRowSelectionOnClick
          initialState={ { pagination: { paginationModel: { pageSize: 25 } } } }
          pageSizeOptions={ [25, 50, 100] }
          sx={ { minHeight: 320 } }
        />
      </Paper>
    </Box>
  )
}
