import { zip, type ZipEntry } from "./zip"

/**
 * Выгрузка книгой Excel.
 *
 * CSV Excel открывает, но каждый раз с оговорками: разделитель зависит от
 * локали, кодировку приходится угадывать, ширина колонок теряется. Книга
 * открывается двойным щелчком и выглядит одинаково у всех.
 *
 * Пишется вручную, без библиотеки: книга — это zip с шестью небольшими файлами
 * XML, и весь формат, который здесь нужен, уместился в один модуль. Готовый
 * пакет притащил бы в сборку разбор формул, картинок и сводных таблиц — всего
 * того, чего в выгрузке отчёта нет.
 */

export interface SheetColumn<T> {
  readonly header: string
  value(row: T): string | number | null | undefined
  /** Ширина колонки в знаках. Без неё берётся по длине заголовка. */
  readonly width?: number
}

const HEADER_STYLE = 1

/* Управляющие знаки Excel не принимает вовсе: книга с ними не открывается, а
   взяться они могут из примечания, скопированного откуда угодно. */
const CONTROL = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g")

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(CONTROL, "")
}

/** A, B, … Z, AA, AB — так Excel называет колонки. */
export function columnName(index: number): string {
  let name = ""
  let rest = index
  while (rest >= 0) {
    name = String.fromCharCode(65 + (rest % 26)) + name
    rest = Math.floor(rest / 26) - 1
  }
  return name
}

function cell(reference: string, value: string | number | null | undefined, style?: number): string {
  const attrs = style === undefined ? "" : ` s="${ style }"`
  if (value === null || value === undefined || value === "") return `<c r="${ reference }"${ attrs }/>`

  /* Число остаётся числом: иначе в Excel по столбцу нельзя посчитать сумму, и
     он выравнивается по левому краю, как текст. */
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ reference }"${ attrs }><v>${ value }</v></c>`
  }

  return `<c r="${ reference }"${ attrs } t="inlineStr"><is><t xml:space="preserve">`
    + `${ escapeXml(String(value)) }</t></is></c>`
}

function sheetXml<T>(rows: readonly T[], columns: readonly SheetColumn<T>[]): string {
  const cols = columns
    .map((column, index) => {
      const width = column.width ?? Math.max(12, Math.min(60, column.header.length + 4))
      return `<col min="${ index + 1 }" max="${ index + 1 }" width="${ width }" customWidth="1"/>`
    })
    .join("")

  const header = columns
    .map((column, index) => cell(`${ columnName(index) }1`, column.header, HEADER_STYLE))
    .join("")

  const body = rows
    .map((row, rowIndex) => {
      const number = rowIndex + 2
      const cells = columns
        .map((column, index) => cell(`${ columnName(index) }${ number }`, column.value(row)))
        .join("")
      return `<row r="${ number }">${ cells }</row>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    /* Закреплённая первая строка: в выгрузке на тысячу строк заголовки колонок
       иначе теряются на первом же прокручивании. */
    + `<sheetViews><sheetView workbookViewId="0">`
    + `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>`
    + `</sheetView></sheetViews>`
    + `<cols>${ cols }</cols>`
    + `<sheetData><row r="1">${ header }</row>${ body }</sheetData>`
    + `</worksheet>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
  + `<Default Extension="xml" ContentType="application/xml"/>`
  + `<Override PartName="/xl/workbook.xml"`
  + ` ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
  + `<Override PartName="/xl/worksheets/sheet1.xml"`
  + ` ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  + `<Override PartName="/xl/styles.xml"`
  + ` ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
  + `</Types>`

const RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  + `<Relationship Id="rId1" Type="${ RELS }/officeDocument" Target="xl/workbook.xml"/>`
  + `</Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  + `<Relationship Id="rId1" Type="${ RELS }/worksheet" Target="worksheets/sheet1.xml"/>`
  + `<Relationship Id="rId2" Type="${ RELS }/styles" Target="styles.xml"/>`
  + `</Relationships>`

/* Две заливки объявлены не по нужде: Excel считает книгу испорченной, если их
   меньше, — первая «никакая», вторая штриховая, обе обязательны по формату. */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
  + `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>`
  + `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>`
  + `<fills count="2"><fill><patternFill patternType="none"/></fill>`
  + `<fill><patternFill patternType="gray125"/></fill></fills>`
  + `<borders count="1"><border/></borders>`
  + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
  + `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`
  + `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>`
  + `</styleSheet>`

/** Имя листа: Excel не принимает пустое, длиннее 31 знака и с этими символами. */
export function sheetName(title: string): string {
  const clean = title.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31)
  return clean === "" ? "Лист1" : clean
}

export function toXlsx<T>(
  title: string,
  rows: readonly T[],
  columns: readonly SheetColumn<T>[],
): Uint8Array {
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`
    + ` xmlns:r="${ RELS }">`
    + `<sheets><sheet name="${ escapeXml(sheetName(title)) }" sheetId="1" r:id="rId1"/></sheets>`
    + `</workbook>`

  const encoder = new TextEncoder()
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(ROOT_RELS) },
    { name: "xl/workbook.xml", data: encoder.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(WORKBOOK_RELS) },
    { name: "xl/styles.xml", data: encoder.encode(STYLES) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml(rows, columns)) },
  ]
  return zip(entries)
}

/** Имя файла с датой: выгрузки копятся в папке, и без даты их не различить. */
export function exportFileName(prefix: string, extension: string, at: number = Date.now()): string {
  const date = new Date(at)
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
  return `${ prefix }-${ stamp }.${ extension }`
}
