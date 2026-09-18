import { useState, type ReactNode } from "react"
import styles from "./DataTable.module.css"
import { IconButton } from "./Button"
import { Select } from "./Select"
import { IconChevronLeft, IconChevronRight } from "./icons"

export interface Column<T> {
  readonly key: string
  readonly header: string
  /** Фиксированная ширина в пикселях; без неё колонка тянется по содержимому. */
  readonly width?: number
  readonly minWidth?: number
  readonly align?: "left" | "right"
  /** Коды, даты и числа — моноширинным: столбец сравнивается взглядом. */
  readonly mono?: boolean
  render(row: T): ReactNode
}

interface DataTableProps<T> {
  readonly columns: readonly Column<T>[]
  readonly rows: readonly T[]
  rowKey(row: T): string
  readonly loading?: boolean
  /** Что показать вместо строк, когда их нет. */
  readonly empty?: ReactNode
  readonly pageSize?: number
  /**
   * Всего строк на сервере. Задан — постраничность внешняя: таблица показывает
   * ровно то, что ей дали. Не задан — режет список сама.
   */
  readonly rowCount?: number
  readonly page?: number
  onPageChange?(page: number): void
}

/**
 * Таблица.
 *
 * Заменяет DataGrid: нам от него нужны были шапка, строки, пустое состояние и
 * постраничность, а приезжали сортировка, фильтры, виртуализация и локализация,
 * которыми экраны не пользуются.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading, empty, pageSize = 25, rowCount, page, onPageChange,
}: DataTableProps<T>) {
  const [localPage, setLocalPage] = useState(0)

  const serverSide = rowCount !== undefined
  const currentPage = serverSide ? page ?? 0 : localPage
  const total = serverSide ? rowCount : rows.length
  const visible = serverSide ? rows : rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  const from = total === 0 ? 0 : currentPage * pageSize + 1
  const to = Math.min(total, (currentPage + 1) * pageSize)

  function goTo(next: number) {
    if (serverSide) onPageChange?.(next)
    else setLocalPage(next)
  }

  return (
    <div className={ styles.root }>
      <div style={ { height: 2, flexShrink: 0 } }>
        { loading ? <div className={ styles.loading }/> : null }
      </div>

      <div className={ styles.wrap }>
        <table className={ styles.table }>
          <colgroup>
            { columns.map((column) => (
              <col key={ column.key } style={ { width: column.width, minWidth: column.minWidth } }/>
            )) }
          </colgroup>
          <thead>
            <tr>
              { columns.map((column) => (
                <th
                  key={ column.key }
                  className={ [styles.th, column.align === "right" ? styles.right : null]
                    .filter(Boolean).join(" ") }
                  scope="col"
                >
                  { column.header }
                </th>
              )) }
            </tr>
          </thead>
          <tbody>
            { visible.length === 0 ? (
              <tr>
                <td className={ styles.empty } colSpan={ columns.length }>{ empty }</td>
              </tr>
            ) : visible.map((row) => (
              <tr key={ rowKey(row) } className={ styles.row }>
                { columns.map((column) => (
                  <td
                    key={ column.key }
                    className={ [
                      styles.td,
                      column.align === "right" ? styles.right : null,
                      column.mono ? styles.mono : null,
                    ].filter(Boolean).join(" ") }
                  >
                    { column.render(row) }
                  </td>
                )) }
              </tr>
            )) }
          </tbody>
        </table>
      </div>

      { total > pageSize ? (
        <div className={ styles.foot }>
          <span>{ from }–{ to } из { total }</span>

          {/* Список страниц, а не только стрелки: до сороковой страницы журнала
              иначе добираться сорока нажатиями. */}
          <div className={ styles.jump }>
            <span>Страница</span>
            <Select
              compact
              ariaLabel="Страница"
              value={ String(currentPage) }
              options={ Array.from({ length: lastPage + 1 }, (_, index) => ({
                value: String(index),
                label: String(index + 1),
              })) }
              onChange={ (next) => goTo(Number(next)) }
              style={ { minWidth: 64 } }
            />
            <span>из { lastPage + 1 }</span>
          </div>

          <div className={ styles.pager }>
            <IconButton
              label="Предыдущая страница"
              disabled={ currentPage === 0 }
              onClick={ () => goTo(currentPage - 1) }
            >
              <IconChevronLeft size={ 18 }/>
            </IconButton>
            <IconButton
              label="Следующая страница"
              disabled={ currentPage >= lastPage }
              onClick={ () => goTo(currentPage + 1) }
            >
              <IconChevronRight size={ 18 }/>
            </IconButton>
          </div>
        </div>
      ) : null }
    </div>
  )
}
