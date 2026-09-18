import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { InstrumentsTable } from "../features/instruments/ui/InstrumentsTable"
import { INSTRUMENT_STATUSES, type InstrumentQuery, type InstrumentStatus } from "../features/instruments/domain/types"
import { STATUS_LABELS, formatPrice } from "../features/instruments/domain/labels"
import { csvFileName, toCsv } from "../shared/csv"
import { saveTextFile } from "../platform/saveFile"
import { formatDate, DAY_MS } from "../shared/dates"
import { VERIFICATION_HORIZON_MS } from "../data/settingsKeys"
import { ROUTES } from "../app/routes"
import { PageHeader } from "../shared/ui/PageHeader"
import { EmptyState } from "../shared/ui/EmptyState"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { DateInput } from "../ui/DateInput"
import { Select, TextField } from "../ui/Field"
import { Stack } from "../ui/layout"
import { IconDownload, IconPlus } from "../ui/icons"

const PAGE_SIZE = 25

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

  const query = readQuery(params)
  /* Пустая таблица бывает двух разных бед: база ещё не заполнена или фильтры
     ничего не нашли. Действия у них тоже разные. */
  const filtered = [...params.keys()].length > 0

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

  async function exportCsv() {
    if (!directories.data) return
    setExporting(true)
    try {
      // Выгружается весь отфильтрованный список, а не текущая страница: человек
      // просит «выгрузить приборы», а не «выгрузить то, что видно».
      const all = await repo.instruments.list({ ...query, page: 0, pageSize: 100000 })
      const dirs = directories.data
      const csv = toCsv(all.rows, [
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
      await saveTextFile(csvFileName("pribory"), csv)
    } finally {
      setExporting(false)
    }
  }

  const filters = directories.data
  const special = params.get("overdue") === "1"
    ? "overdue"
    : params.get("verification") === "due" ? "verification" : ""

  return (
    <div>
      <PageHeader
        title="Приборы"
        count={ state.data?.total }
        actions={ <>
          <Button
            variant="outlined" startIcon={ <IconDownload size={ 18 }/> }
            onClick={ exportCsv }
            disabled={ exporting || !filters || (state.data?.total ?? 0) === 0 }
          >
            Экспорт
          </Button>
          <Button
            variant="contained" startIcon={ <IconPlus size={ 18 }/> }
            onClick={ () => navigate(`${ ROUTES.instruments }/new`) }
          >
            Добавить прибор
          </Button>
        </> }
      />

      <Card padding="tight" className="mb-2">
        <Stack row gap={ 2 } wrap>
          <TextField
            label="Поиск" placeholder="Название, инв. или серийный номер"
            value={ params.get("q") ?? "" }
            onChange={ (value) => setParam("q", value) }
            style={ { minWidth: 240, flex: "1 1 240px" } }
          />
          <Select
            label="Статус" value={ params.get("status") ?? "" } emptyLabel="Любой"
            options={ INSTRUMENT_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })) }
            onChange={ (value) => setParam("status", value) }
            style={ { minWidth: 160 } }
          />
          <Select
            label="Тип" value={ params.get("type") ?? "" } emptyLabel="Любой"
            options={ (filters?.types ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("type", value) }
            style={ { minWidth: 160 } }
          />
          <Select
            label="Подразделение" value={ params.get("department") ?? "" } emptyLabel="Любое"
            options={ (filters?.departments ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("department", value) }
            style={ { minWidth: 180 } }
          />
          <Select
            label="Место" value={ params.get("location") ?? "" } emptyLabel="Любое"
            options={ (filters?.locations ?? []).map((row) => ({ value: row.id, label: row.name })) }
            onChange={ (value) => setParam("location", value) }
            style={ { minWidth: 180 } }
          />
          <Select
            label="Сотрудник" value={ params.get("employee") ?? "" } emptyLabel="Любой"
            options={ (filters?.employees ?? []).map((row) => ({ value: row.id, label: row.fullName })) }
            onChange={ (value) => setParam("employee", value) }
            style={ { minWidth: 200 } }
          />
          <DateInput
            label="Заведён с" value={ params.get("from") ?? "" }
            onChange={ (value) => setParam("from", value) }
          />
          <DateInput
            label="Заведён по" value={ params.get("to") ?? "" }
            onChange={ (value) => setParam("to", value) }
          />
          <Select
            label="Особые" value={ special } emptyLabel="Без ограничений"
            options={ [
              { value: "overdue", label: "Не вернули в срок" },
              { value: "verification", label: "Истекает поверка" },
            ] }
            onChange={ setSpecial }
            style={ { minWidth: 200 } }
          />
        </Stack>
      </Card>

      { state.error ? <Alert severity="error" className="mb-2">{ state.error }</Alert> : null }

      <Card padding="none">
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
                action={
                  <Button
                    variant="outlined"
                    onClick={ () => { setParams({}, { replace: true }); setPage(0) } }
                  >
                    Сбросить фильтры
                  </Button>
                }
              >
                Под выбранные условия не подходит ни один прибор. Снимите часть фильтров
                или проверьте инвентарный номер.
              </EmptyState>
            ) : (
              <EmptyState
                title="Приборов пока нет"
                action={
                  <Button
                    variant="contained" startIcon={ <IconPlus size={ 18 }/> }
                    onClick={ () => navigate(`${ ROUTES.instruments }/new`) }
                  >
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
    </div>
  )
}
