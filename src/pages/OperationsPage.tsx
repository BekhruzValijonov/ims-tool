import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { OperationsTable } from "../features/operations/ui/OperationsTable"
import { toOperationRows } from "../features/operations/ui/operationRows"
import { EVENT_LABELS } from "../features/operations/domain/labels"
import type { EventKind, JournalQuery } from "../features/operations/domain/types"
import { exportFileName, toXlsx } from "../shared/xlsx"
import { saveBinaryFile } from "../platform/saveFile"
import { DAY_MS, formatDateTime } from "../shared/dates"
import { PageHeader } from "../shared/ui/PageHeader"
import { EmptyState } from "../shared/ui/EmptyState"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { Chip } from "../ui/Chip"
import { DateInput } from "../ui/DateInput"
import { Drawer } from "../ui/Drawer"
import { Select } from "../ui/Select"
import { Stack } from "../ui/layout"
import { IconDownload, IconSettings } from "../ui/icons"

const PAGE_SIZE = 25

/** Ключи, которые задают фильтр журнала. */
const FILTER_KEYS = ["kind", "employee", "department", "from", "to"]

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
  const [filtersOpen, setFiltersOpen] = useState(false)

  const query = readQuery(params)
  const activeFilters = FILTER_KEYS.filter((key) => params.get(key)).length
  const filtered = activeFilters > 0

  const state = useAsync(async () => {
    const journal = await repo.operations.journal({ ...query, page, pageSize: PAGE_SIZE })
    const instruments = await repo.instruments.byIds(
      journal.rows.map((event) => event.instrumentId))
    return { journal, instruments }
  }, [repo, params.toString(), page])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === "") next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
    setPage(0)
  }

  function resetFilters() {
    setParams({}, { replace: true })
    setPage(0)
  }

  async function exportCsv() {
    if (!directories.data) return
    setExporting(true)
    try {
      const all = await repo.operations.journal({ ...query, page: 0, pageSize: 100000 })
      const instruments = await repo.instruments.byIds(
        all.rows.map((event) => event.instrumentId))

      const rows = toOperationRows(all.rows, instruments, directories.data)
      const book = toXlsx("Операции", rows, [
        { header: "Когда", value: (row) => formatDateTime(row.occurredAt) },
        { header: "Инвентарный номер", value: (row) => row.inventoryNumber },
        { header: "Прибор", value: (row) => row.instrumentName },
        { header: "Операция", value: (row) => row.kind },
        { header: "Сотрудник", value: (row) => row.employee },
        { header: "Место", value: (row) => row.place },
        { header: "Внёс", value: (row) => row.operator },
        { header: "Примечание", value: (row) => row.note },
      ])
      await saveBinaryFile(exportFileName("zhurnal-operaciy", "xlsx"), book)
    } finally {
      setExporting(false)
    }
  }

  const dirs = directories.data

  return (
    <Page fill>
      <PageHeader
        title="Операции"
        hint="Всё, что происходило с приборами: выдачи, возвраты, перемещения, ремонты и поверки"
        tour="operations"
        actions={ <>
          <Button
            variant="outlined" startIcon={ <IconSettings size={ 18 }/> }
            onClick={ () => setFiltersOpen(true) }
            data-tour="operations-filters"
          >
            Фильтры
            { activeFilters > 0 ? <Chip color="ink">{ activeFilters }</Chip> : null }
          </Button>
          <Button
            variant="outlined" startIcon={ <IconDownload size={ 18 }/> }
            onClick={ exportCsv }
            disabled={ exporting || !dirs || (state.data?.journal.total ?? 0) === 0 }
            data-tour="operations-export"
          >
            Экспорт
          </Button>
        </> }
      />

      { state.error ? <Alert severity="error" className="mb-2">{ state.error }</Alert> : null }

      <Card
        padding="none"
        style={ { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } }
        data-tour="operations-table"
      >
        { dirs && state.data ? (
          <OperationsTable
            rows={ toOperationRows(state.data.journal.rows, state.data.instruments, dirs) }
            loading={ state.loading }
            rowCount={ state.data.journal.total }
            page={ page }
            pageSize={ PAGE_SIZE }
            onPageChange={ setPage }
            empty={ filtered ? (
              <EmptyState
                title="Операций не найдено"
                action={
                  <Button variant="outlined" onClick={ resetFilters }>Сбросить фильтры</Button>
                }
              >
                За выбранный период и по выбранным условиям операций не было.
              </EmptyState>
            ) : (
              <EmptyState title="Журнал пуст">
                Он заполняется сам: каждая выдача, возврат, перемещение, ремонт и поверка
                попадают сюда с именем того, кто их оформил.
              </EmptyState>
            ) }
          />
        ) : null }
      </Card>

      <Drawer
        open={ filtersOpen }
        title="Фильтры"
        onClose={ () => setFiltersOpen(false) }
        footer={ <>
          <Button variant="outlined" onClick={ resetFilters } disabled={ activeFilters === 0 }>
            Сбросить
          </Button>
          <Stack row grow/>
          <Button variant="contained" onClick={ () => setFiltersOpen(false) }>
            Показать { state.data?.journal.total ?? 0 }
          </Button>
        </> }
      >
        <Stack gap={ 2 }>
          <Select
            label="Операция" value={ params.get("kind") ?? "" } emptyLabel="Любая"
            options={ (Object.keys(EVENT_LABELS) as EventKind[])
              .map((kind) => ({ value: kind, label: EVENT_LABELS[kind] })) }
            onChange={ (value) => setParam("kind", value) }
            fullWidth
          />
          <Select
            label="Сотрудник" value={ params.get("employee") ?? "" } emptyLabel="Любой"
            options={ (dirs?.employees ?? []).map((row) => ({ value: row.id, label: row.fullName })) }
            onChange={ (value) => setParam("employee", value) }
            fullWidth
          />
          <Select
            label="Подразделение" value={ params.get("department") ?? "" } emptyLabel="Любое"
            options={ (dirs?.departments ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("department", value) }
            fullWidth
          />
          <DateInput
            label="С" value={ params.get("from") ?? "" }
            onChange={ (value) => setParam("from", value) } fullWidth
          />
          <DateInput
            label="По" value={ params.get("to") ?? "" }
            onChange={ (value) => setParam("to", value) } fullWidth
          />
        </Stack>
      </Drawer>
    </Page>
  )
}
