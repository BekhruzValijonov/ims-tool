import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import AddIcon from "@mui/icons-material/Add"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { useDirectories } from "../features/directories/ui/useDirectories"
import { InstrumentsGrid } from "../features/instruments/ui/InstrumentsGrid"
import { INSTRUMENT_STATUSES, type InstrumentQuery, type InstrumentStatus } from "../features/instruments/domain/types"
import { STATUS_LABELS, formatPrice } from "../features/instruments/domain/labels"
import { csvFileName, toCsv } from "../shared/csv"
import { saveTextFile } from "../platform/saveFile"
import { formatDate, DAY_MS } from "../shared/dates"
import { DateField } from "../shared/ui/DateField"
import { VERIFICATION_HORIZON_MS } from "../data/settingsKeys"
import { ROUTES } from "../app/routes"
import { PageHeader } from "../shared/ui/PageHeader"
import { EmptyState } from "../shared/ui/EmptyState"

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

  async function exportCsv() {
    if (!directories.data) return
    setExporting(true)
    try {
      // Выгружается весь отфильтрованный список, а не текущая страница: человек
      // просит «выгрузить приборы», а не «выгрузить то, что видно».
      const all = await repo.instruments.list({ ...query, page: 0, pageSize: 100000 })
      const csv = toCsv(all.rows, [
        { header: "Инвентарный номер", value: (row) => row.inventoryNumber },
        { header: "Наименование", value: (row) => row.name },
        { header: "Тип", value: (row) => directories.data!.typeName(row.typeId) },
        { header: "Серийный номер", value: (row) => row.serialNumber },
        { header: "Производитель", value: (row) => row.manufacturer },
        { header: "Модель", value: (row) => row.model },
        { header: "Статус", value: (row) => STATUS_LABELS[row.status] },
        { header: "Подразделение", value: (row) => directories.data!.departmentName(row.currentDepartmentId) },
        { header: "Место хранения", value: (row) => directories.data!.locationName(row.currentLocationId) },
        { header: "У кого", value: (row) => (row.currentEmployeeId ? directories.data!.employeeName(row.currentEmployeeId) : "") },
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

  return (
    <Box>
      <PageHeader
        title="Приборы"
        count={ state.data?.total }
        actions={ <>
          <Button
            variant="outlined"
            size="small"
            startIcon={ <FileDownloadIcon/> }
            onClick={ exportCsv }
            disabled={ exporting || !filters || (state.data?.total ?? 0) === 0 }
          >
            Экспорт
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={ <AddIcon/> }
            onClick={ () => navigate(`${ ROUTES.instruments }/new`) }
          >
            Добавить прибор
          </Button>
        </> }
      />

      <Paper sx={ { p: 2, mb: 2 } }>
        <Stack direction="row" sx={ { gap: 2, flexWrap: "wrap" } }>
            <TextField
              size="small" label="Поиск" placeholder="Название, инв. или серийный номер"
              sx={ { minWidth: 260 } }
              defaultValue={ params.get("q") ?? "" }
              onChange={ (event) => setParam("q", event.target.value) }
            />
            <TextField
              size="small" select label="Статус" sx={ { minWidth: 160 } }
              value={ params.get("status") ?? "" }
              onChange={ (event) => setParam("status", event.target.value) }
            >
              <MenuItem value="">Любой</MenuItem>
              { INSTRUMENT_STATUSES.map((status) => (
                <MenuItem key={ status } value={ status }>{ STATUS_LABELS[status] }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" select label="Тип" sx={ { minWidth: 160 } }
              value={ params.get("type") ?? "" }
              onChange={ (event) => setParam("type", event.target.value) }
            >
              <MenuItem value="">Любой</MenuItem>
              { filters?.types.map((type) => (
                <MenuItem key={ type.id } value={ type.id }>{ type.name }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" select label="Подразделение" sx={ { minWidth: 180 } }
              value={ params.get("department") ?? "" }
              onChange={ (event) => setParam("department", event.target.value) }
            >
              <MenuItem value="">Любое</MenuItem>
              { filters?.departments.map((department) => (
                <MenuItem key={ department.id } value={ department.id }>{ department.name }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" select label="Место" sx={ { minWidth: 180 } }
              value={ params.get("location") ?? "" }
              onChange={ (event) => setParam("location", event.target.value) }
            >
              <MenuItem value="">Любое</MenuItem>
              { filters?.locations.map((location) => (
                <MenuItem key={ location.id } value={ location.id }>{ location.name }</MenuItem>
              )) }
            </TextField>
            <TextField
              size="small" select label="Сотрудник" sx={ { minWidth: 200 } }
              value={ params.get("employee") ?? "" }
              onChange={ (event) => setParam("employee", event.target.value) }
            >
              <MenuItem value="">Любой</MenuItem>
              { filters?.employees.map((employee) => (
                <MenuItem key={ employee.id } value={ employee.id }>{ employee.fullName }</MenuItem>
              )) }
            </TextField>
            <DateField
              label="Заведён с"
              value={ params.get("from") ?? "" }
              onChange={ (value) => setParam("from", value) }
            />
            <DateField
              label="Заведён по"
              value={ params.get("to") ?? "" }
              onChange={ (value) => setParam("to", value) }
            />
            <TextField
              size="small" select label="Особые" sx={ { minWidth: 200 } }
              value={ params.get("overdue") === "1" ? "overdue" : params.get("verification") === "due" ? "verification" : "" }
              onChange={ (event) => {
                const next = new URLSearchParams(params)
                next.delete("overdue")
                next.delete("verification")
                if (event.target.value === "overdue") next.set("overdue", "1")
                if (event.target.value === "verification") next.set("verification", "due")
                setParams(next, { replace: true })
                setPage(0)
              } }
            >
              <MenuItem value="">Без ограничений</MenuItem>
              <MenuItem value="overdue">Не вернули в срок</MenuItem>
              <MenuItem value="verification">Истекает поверка</MenuItem>
            </TextField>
        </Stack>
      </Paper>

      { state.error ? <Alert severity="error" sx={ { mb: 2 } }>{ state.error }</Alert> : null }

      <Paper>
        { filters ? (
          <InstrumentsGrid
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
                    size="small" variant="outlined"
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
                    size="small" variant="contained" startIcon={ <AddIcon/> }
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
      </Paper>
    </Box>
  )
}
