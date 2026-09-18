import { useMemo, useState } from "react"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { REPORTS, type ReportInput } from "../features/reports/data/reports"
import { csvFileName, toCsv } from "../shared/csv"
import { saveTextFile } from "../platform/saveFile"
import { DAY_MS } from "../shared/dates"
import { PageHeader } from "../shared/ui/PageHeader"
import { EmptyState } from "../shared/ui/EmptyState"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { DataTable } from "../ui/DataTable"
import { DateInput } from "../ui/DateInput"
import { Select } from "../ui/Field"
import { Grid, Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconDownload } from "../ui/icons"

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
    <Page>
      <PageHeader title="Отчёты" hint="Выберите отчёт, задайте параметры и выгрузите его в CSV"/>

      <Grid cols={ { xs: 1, sm: 2, lg: 3 } } gap={ 1.5 } style={ { marginBottom: 16 } }>
        { REPORTS.map((item) => {
          const active = item.id === selected
          return (
            <button
              key={ item.id }
              type="button"
              onClick={ () => setSelected(item.id) }
              style={ {
                width: "100%", height: "100%", textAlign: "left", cursor: "pointer",
                padding: 16, borderRadius: "var(--radius-card)",
                background: "var(--bg-paper)",
                border: `1px solid ${ active ? "var(--primary-main)" : "transparent" }`,
                boxShadow: "var(--shadow-card)",
              } }
            >
              <Text variant="subtitle2">{ item.title }</Text>
              <Text variant="caption" tone="secondary" style={ { display: "block", marginTop: 4 } }>
                { item.description }
              </Text>
            </button>
          )
        }) }
      </Grid>

      <Card padding="tight" className="mb-2">
        <Stack row gap={ 2 } wrap align="end">
          <Text variant="subtitle2" style={ { minWidth: 200, paddingBottom: 8 } }>{ report.title }</Text>

          { report.params.includes("period") ? (
            <>
              <DateInput label="С" value={ from } onChange={ setFrom }/>
              <DateInput label="По" value={ to } onChange={ setTo }/>
            </>
          ) : null }

          { report.params.includes("horizon") ? (
            <Select
              label="Горизонт"
              value={ String(horizonDays) }
              options={ [
                { value: "30", label: "30 дней" },
                { value: "60", label: "60 дней" },
                { value: "90", label: "90 дней" },
              ] }
              onChange={ (value) => setHorizonDays(Number(value)) }
              style={ { minWidth: 160 } }
            />
          ) : null }

          { report.params.includes("instrument") ? (
            <Select
              label="Прибор"
              value={ instrumentId ?? "" }
              emptyLabel="Выберите прибор"
              options={ (instruments.data ?? []).map((row) => ({
                value: row.id,
                label: `${ row.inventoryNumber } — ${ row.name }`,
              })) }
              onChange={ (value) => setInstrumentId(value || null) }
              style={ { minWidth: 320 } }
            />
          ) : null }

          <Stack row grow/>
          <Button
            variant="outlined" startIcon={ <IconDownload size={ 18 }/> }
            onClick={ exportCsv }
            disabled={ exporting || !state.data || state.data.rows.length === 0 }
          >
            Выгрузить CSV
          </Button>
        </Stack>

        { state.data ? (
          <Text tone="secondary" style={ { marginTop: 12 } }>{ state.data.summary }</Text>
        ) : null }
      </Card>

      { state.error ? <Alert severity="error" className="mb-2">{ state.error }</Alert> : null }

      <Card padding="none">
        <DataTable
          columns={ state.data?.columns ?? [] }
          rows={ state.data?.rows ?? [] }
          rowKey={ (row) => String(row.id) }
          loading={ state.loading }
          empty={ report.params.includes("instrument") && !instrumentId ? (
            <EmptyState title="Выберите прибор">
              Паспорт движения строится по одному прибору. Найдите его в поле выше —
              по инвентарному номеру или названию.
            </EmptyState>
          ) : (
            <EmptyState title="Для отчёта нет данных">
              Отчёты строятся по журналу и реестру. Как только появятся приборы и первые
              операции, эта таблица заполнится.
            </EmptyState>
          ) }
        />
      </Card>
    </Page>
  )
}
