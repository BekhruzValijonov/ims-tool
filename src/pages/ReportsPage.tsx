import { useMemo, useState } from "react"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { REPORTS, type ReportInput } from "../features/reports/data/reports"
import { csvFileName, toCsv } from "../shared/csv"
import { exportFileName, toXlsx } from "../shared/xlsx"
import { saveBinaryFile, saveTextFile } from "../platform/saveFile"
import { DAY_MS } from "../shared/dates"
import { PageHeader } from "../shared/ui/PageHeader"
import { EmptyState } from "../shared/ui/EmptyState"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { DataTable } from "../ui/DataTable"
import { DateInput } from "../ui/DateInput"
import { Select } from "../ui/Select"
import { Grid, Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconDownload } from "../ui/icons"

export function ReportsPage() {
  const repo = useRepo()
  const directories = useDirectories()

  const [selected, setSelected] = useState(REPORTS[0].id)
  /* Период начинается пустым: у ведомости приборов и списка на руках он
     ограничивает выборку, и подставленный «последний месяц» прятал бы почти
     весь реестр, ничего об этом не говоря. */
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [horizonDays, setHorizonDays] = useState(30)
  const [instrumentId, setInstrumentId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const report = REPORTS.find((item) => item.id === selected) ?? REPORTS[0]

  const input = useMemo<ReportInput>(() => ({
    from: from === "" ? null : new Date(from).getTime(),
    // Верхняя граница включает весь последний день, а не его первую секунду.
    to: to === "" ? null : new Date(to).getTime() + DAY_MS - 1,
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

  async function download(kind: "xlsx" | "csv") {
    if (!state.data) return
    setExporting(true)
    try {
      if (kind === "csv") {
        await saveTextFile(csvFileName(state.data.fileName), toCsv(state.data.rows, [...state.data.csv]))
        return
      }
      const book = toXlsx(report.title, state.data.rows, [...state.data.csv])
      await saveBinaryFile(exportFileName(state.data.fileName, "xlsx"), book)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Page fill>
      <PageHeader
        title="Отчёты" hint="Выберите отчёт, задайте параметры и выгрузите его книгой Excel"
        tour="reports"
      />

      {/* Только названия: описание выбранного отчёта стоит ниже, у его
          параметров. Шесть описаний разом съедали половину экрана, и на таблицу
          — то, ради чего сюда приходят, — оставалось четыре строки. */}
      {/* Выбор и параметры не сжимаются: на невысоком окне флексбокс иначе
          отбирает высоту у них, и поля с кнопками выгрузки просто пропадают. */}
      <Grid
        cols={ { xs: 1, sm: 2, lg: 3 } } gap={ 1 }
        style={ { marginBottom: 16, flexShrink: 0 } }
        data-tour="reports-list"
      >
        { REPORTS.map((item) => {
          const active = item.id === selected
          return (
            <button
              key={ item.id }
              type="button"
              aria-pressed={ active }
              onClick={ () => setSelected(item.id) }
              style={ {
                width: "100%", textAlign: "left", cursor: "pointer",
                padding: "10px 16px", borderRadius: "var(--radius)",
                background: active ? "var(--action-selected)" : "var(--bg-paper)",
                border: `1px solid ${ active ? "var(--accent)" : "var(--divider)" }`,
                color: "var(--text-primary)",
              } }
            >
              <Text variant="subtitle2">{ item.title }</Text>
            </button>
          )
        }) }
      </Grid>

      <Card
        padding="tight" className="mb-2" style={ { flexShrink: 0 } }
        data-tour="reports-params"
      >
        <Text variant="subtitle2">{ report.title }</Text>
        <Text variant="caption" tone="secondary" style={ { display: "block", marginBottom: 12 } }>
          { report.description }
        </Text>

        {/* Название отчёта в этой строке не повторяется: выбранная плитка выше
            и так обведена, а из-за него поля съезжали вниз на его собственную
            высоту. Подпись про пустые даты стоит под строкой, а не под вторым
            полем, — иначе она поднимала бы поле над соседними. */}
        <Stack row gap={ 2 } wrap align="end">
          { report.params.includes("period") ? (
            <>
              <DateInput label={ `${ report.periodLabel ?? "Дата" } с` } value={ from } onChange={ setFrom }/>
              <DateInput label="по" value={ to } onChange={ setTo }/>
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
          <Stack row gap={ 1 } data-tour="reports-export">
            <Button
              variant="contained" startIcon={ <IconDownload size={ 18 }/> }
              onClick={ () => download("xlsx") }
              disabled={ exporting || !state.data || state.data.rows.length === 0 }
            >
              Выгрузить в Excel
            </Button>
            <Button
              variant="outlined"
              onClick={ () => download("csv") }
              disabled={ exporting || !state.data || state.data.rows.length === 0 }
            >
              CSV
            </Button>
          </Stack>
        </Stack>

        { state.data || report.params.includes("period") ? (
          <Stack row gap={ 2 } wrap align="baseline" style={ { marginTop: 12 } }>
            { state.data ? <Text tone="secondary">{ state.data.summary }</Text> : null }
            { report.params.includes("period") ? (
              <Text variant="caption" tone="secondary">Пусто — без ограничения по дате</Text>
            ) : null }
          </Stack>
        ) : null }
      </Card>

      { state.error ? <Alert severity="error" className="mb-2">{ state.error }</Alert> : null }

      {/* Нижний предел высоты: над таблицей стоят выбор отчёта и параметры, и
          на невысоком окне они выдавливали её в ноль — экран оставался без
          того, ради чего его открывают. Дальше страница просто прокручивается. */}
      <Card
        padding="none"
        style={ { flex: 1, minHeight: 240, display: "flex", flexDirection: "column" } }
        data-tour="reports-table"
      >
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
