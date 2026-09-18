import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { InstrumentsTable } from "../features/instruments/ui/InstrumentsTable"
import { InstrumentForm } from "../features/instruments/ui/InstrumentForm"
import { INSTRUMENT_STATUSES, type InstrumentQuery, type InstrumentStatus } from "../features/instruments/domain/types"
import { STATUS_LABELS, formatPrice } from "../features/instruments/domain/labels"
import { exportFileName, toXlsx } from "../shared/xlsx"
import { saveBinaryFile } from "../platform/saveFile"
import { formatDate, DAY_MS } from "../shared/dates"
import { VERIFICATION_HORIZON_MS } from "../data/settingsKeys"
import { ROUTES } from "../app/routes"
import { PageHeader } from "../shared/ui/PageHeader"
import { EmptyState } from "../shared/ui/EmptyState"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { Chip } from "../ui/Chip"
import { DateInput } from "../ui/DateInput"
import { Dialog } from "../ui/Dialog"
import { Drawer } from "../ui/Drawer"
import { TextField } from "../ui/Field"
import { Select } from "../ui/Select"
import { Stack } from "../ui/layout"
import { IconDownload, IconPlus, IconSettings } from "../ui/icons"

const PAGE_SIZE = 25
const FORM_ID = "instrument-create"

/** Ключи, которые задают фильтр. Признак открытого окна к ним не относится. */
const FILTER_KEYS = ["q", "status", "type", "department", "location", "employee", "from", "to", "overdue", "verification"]

/** Фильтры живут в адресе: ссылка с дашборда должна открывать нужный список. */
function readQuery(params: URLSearchParams): InstrumentQuery {
  const status = params.get("status")
  const now = Date.now()

  return {
    text: params.get("q") ?? undefined,
    statuses: status ? [status as InstrumentStatus] : undefined,
    typeId: params.get("type") ?? undefined,
    departmentId: params.get("department") ?? undefined,
    locationId: params.get("location") ?? undefined,
    employeeId: params.get("employee") ?? undefined,
    createdFrom: params.get("from") ? new Date(params.get("from")!).getTime() : undefined,
    createdTo: params.get("to") ? new Date(params.get("to")!).getTime() + DAY_MS - 1 : undefined,
    overdueOnly: params.get("overdue") === "1" || undefined,
    verificationDueBefore: params.get("verification") === "due" ? now + VERIFICATION_HORIZON_MS : undefined,
  }
}

export function InstrumentsPage() {
  const repo = useRepo()
  const navigate = useNavigate()
  const directories = useDirectories()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const query = readQuery(params)
  const activeFilters = FILTER_KEYS.filter((key) => params.get(key)).length
  /* Пустая таблица бывает двух разных бед: база ещё не заполнена или фильтры
     ничего не нашли. Действия у них тоже разные. */
  const filtered = activeFilters > 0
  const creating = params.get("new") === "1"

  const state = useAsync(
    () => repo.instruments.list({ ...query, page, pageSize: PAGE_SIZE }),
    [repo, params.toString(), page],
  )

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === "") next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
    setPage(0)
  }

  function setSpecial(value: string) {
    const next = new URLSearchParams(params)
    next.delete("overdue")
    next.delete("verification")
    if (value === "overdue") next.set("overdue", "1")
    if (value === "verification") next.set("verification", "due")
    setParams(next, { replace: true })
    setPage(0)
  }

  function resetFilters() {
    const next = new URLSearchParams(params)
    for (const key of FILTER_KEYS) next.delete(key)
    setParams(next, { replace: true })
    setPage(0)
  }

  function openCreate() {
    const next = new URLSearchParams(params)
    next.set("new", "1")
    setParams(next, { replace: true })
  }

  function closeCreate() {
    const next = new URLSearchParams(params)
    next.delete("new")
    setParams(next, { replace: true })
  }

  async function exportCsv() {
    if (!directories.data) return
    setExporting(true)
    try {
      // Выгружается весь отфильтрованный список, а не текущая страница: человек
      // просит «выгрузить приборы», а не «выгрузить то, что видно».
      const all = await repo.instruments.list({ ...query, page: 0, pageSize: 100000 })
      const dirs = directories.data
      const book = toXlsx("Приборы", all.rows, [
        { header: "Инвентарный номер", value: (row) => row.inventoryNumber },
        { header: "Наименование", value: (row) => row.name },
        { header: "Тип", value: (row) => dirs.typeName(row.typeId) },
        { header: "Серийный номер", value: (row) => row.serialNumber },
        { header: "Производитель", value: (row) => row.manufacturer },
        { header: "Модель", value: (row) => row.model },
        { header: "Статус", value: (row) => STATUS_LABELS[row.status] },
        { header: "Подразделение", value: (row) => dirs.departmentName(row.currentDepartmentId) },
        { header: "Место хранения", value: (row) => dirs.locationName(row.currentLocationId) },
        { header: "У кого", value: (row) => (row.currentEmployeeId ? dirs.employeeName(row.currentEmployeeId) : "") },
        { header: "Выдан", value: (row) => (row.issuedAt ? formatDate(row.issuedAt) : "") },
        { header: "Вернуть до", value: (row) => (row.expectedReturnAt ? formatDate(row.expectedReturnAt) : "") },
        { header: "Поверка до", value: (row) => (row.nextVerificationAt ? formatDate(row.nextVerificationAt) : "") },
        { header: "Стоимость", value: (row) => formatPrice(row.priceMinor, row.currency) },
      ])
      await saveBinaryFile(exportFileName("pribory", "xlsx"), book)
    } finally {
      setExporting(false)
    }
  }

  const filters = directories.data
  const special = params.get("overdue") === "1"
    ? "overdue"
    : params.get("verification") === "due" ? "verification" : ""

  return (
    <Page fill>
      <PageHeader
        title="Приборы"
        tour="instruments"
        actions={ <>
          <Button
            variant="outlined" startIcon={ <IconSettings size={ 18 }/> }
            onClick={ () => setFiltersOpen(true) }
            data-tour="instruments-filters"
          >
            Фильтры
            { activeFilters > 0 ? (
              <Chip color="ink">{ activeFilters }</Chip>
            ) : null }
          </Button>
          <Button
            variant="outlined" startIcon={ <IconDownload size={ 18 }/> }
            onClick={ exportCsv }
            disabled={ exporting || !filters || (state.data?.total ?? 0) === 0 }
            data-tour="instruments-export"
          >
            Экспорт
          </Button>
          <Button
            variant="contained" startIcon={ <IconPlus size={ 18 }/> } onClick={ openCreate }
            data-tour="instruments-create"
          >
            Добавить прибор
          </Button>
        </> }
      />

      { state.error ? <Alert severity="error" className="mb-2">{ state.error }</Alert> : null }

      <Card
        padding="none"
        style={ { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } }
        data-tour="instruments-table"
      >
        { filters ? (
          <InstrumentsTable
            rows={ state.data?.rows ?? [] }
            directories={ filters }
            loading={ state.loading }
            rowCount={ state.data?.total ?? 0 }
            page={ page }
            pageSize={ PAGE_SIZE }
            onPageChange={ setPage }
            empty={ filtered ? (
              <EmptyState
                title="Ничего не нашлось"
                action={ <Button variant="outlined" onClick={ resetFilters }>Сбросить фильтры</Button> }
              >
                Под выбранные условия не подходит ни один прибор. Снимите часть фильтров
                или проверьте инвентарный номер.
              </EmptyState>
            ) : (
              <EmptyState
                title="Приборов пока нет"
                action={
                  <Button variant="contained" startIcon={ <IconPlus size={ 18 }/> } onClick={ openCreate }>
                    Добавить прибор
                  </Button>
                }
              >
                Перед первым заведением заполните справочники: подразделения, места хранения
                и типы приборов. Тогда у прибора будет где числиться и куда возвращаться.
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
            Показать { state.data?.total ?? 0 }
          </Button>
        </> }
      >
        <Stack gap={ 2 }>
          <TextField
            label="Поиск" placeholder="Название, инв. или серийный номер"
            value={ params.get("q") ?? "" }
            onChange={ (value) => setParam("q", value) }
            fullWidth
          />
          <Select
            label="Статус" value={ params.get("status") ?? "" } emptyLabel="Любой"
            options={ INSTRUMENT_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })) }
            onChange={ (value) => setParam("status", value) }
            fullWidth
          />
          <Select
            label="Тип" value={ params.get("type") ?? "" } emptyLabel="Любой"
            options={ (filters?.types ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("type", value) }
            fullWidth
          />
          <Select
            label="Подразделение" value={ params.get("department") ?? "" } emptyLabel="Любое"
            options={ (filters?.departments ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("department", value) }
            fullWidth
          />
          <Select
            label="Место" value={ params.get("location") ?? "" } emptyLabel="Любое"
            options={ (filters?.locations ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("location", value) }
            fullWidth
          />
          <Select
            label="Сотрудник" value={ params.get("employee") ?? "" } emptyLabel="Любой"
            options={ (filters?.employees ?? []).map((row) => ({ value: row.id, label: row.fullName })) }
            onChange={ (value) => setParam("employee", value) }
            fullWidth
          />
          <DateInput
            label="Заведён с" value={ params.get("from") ?? "" }
            onChange={ (value) => setParam("from", value) } fullWidth
          />
          <DateInput
            label="Заведён по" value={ params.get("to") ?? "" }
            onChange={ (value) => setParam("to", value) } fullWidth
          />
          <Select
            label="Особые" value={ special } emptyLabel="Без ограничений"
            options={ [
              { value: "overdue", label: "Не вернули в срок" },
              { value: "verification", label: "Истекает поверка" },
            ] }
            onChange={ setSpecial }
            fullWidth
          />
        </Stack>
      </Drawer>

      <Dialog
        open={ creating }
        wide
        title="Новый прибор"
        onClose={ closeCreate }
        actions={ <>
          <Button onClick={ closeCreate }>Отмена</Button>
          <Button type="submit" form={ FORM_ID } variant="contained">Завести прибор</Button>
        </> }
      >
        { creating ? (
          <InstrumentForm
            formId={ FORM_ID }
            onSaved={ (id) => { closeCreate(); navigate(ROUTES.instrument(id)) } }
            /* Кнопки живут в подвале окна и ссылаются на форму по id,
               поэтому внутри формы их рисовать не нужно. */
            renderActions={ () => null }
          />
        ) : null }
      </Dialog>
    </Page>
  )
}
