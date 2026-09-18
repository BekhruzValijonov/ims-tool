/**
 * Выгрузка в CSV.
 *
 * Разделитель — точка с запятой, а не запятая: Excel с русской локалью иначе
 * складывает всю строку в одну ячейку. Файл начинается с BOM — без него тот же
 * Excel читает UTF-8 как cp1251 и показывает кракозябры вместо кириллицы.
 */
export interface CsvColumn<T> {
  readonly header: string
  value(row: T): string | number | null | undefined
}

const BOM = "﻿"
const SEPARATOR = ";"

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[";\n\r]/.test(text)) return `"${ text.replace(/"/g, '""') }"`
  return text
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((column) => escape(column.header)).join(SEPARATOR)]
  for (const row of rows) {
    lines.push(columns.map((column) => escape(column.value(row))).join(SEPARATOR))
  }
  // CRLF: так файл открывается одинаково и в Excel, и в LibreOffice.
  return BOM + lines.join("\r\n") + "\r\n"
}

/** Имя файла с датой: отчёты копятся в папке, и без даты их не различить. */
export function csvFileName(prefix: string, at: number = Date.now()): string {
  const date = new Date(at)
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
  return `${ prefix }-${ stamp }.csv`
}
