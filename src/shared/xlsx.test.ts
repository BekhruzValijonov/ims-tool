import { describe, expect, it } from "vitest"
import { columnName, exportFileName, sheetName, toXlsx } from "./xlsx"
import { crc32, zip } from "./zip"

/**
 * Книга пишется байт в байт вручную, поэтому проверяется не «что-то вернулось»,
 * а устройство файла: контрольные суммы, каталог архива и содержимое листа.
 * Ошибка здесь выглядит на стороне человека одинаково — Excel говорит, что файл
 * повреждён, и не открывает его.
 */

const decoder = new TextDecoder()

/** Читает архив так же, как его прочтёт Excel: по центральному каталогу. */
function entries(archive: Uint8Array): Map<string, string> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)
  const count = view.getUint16(archive.length - 22 + 10, true)
  let cursor = view.getUint32(archive.length - 22 + 16, true)

  const found = new Map<string, string>()
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014B50)
    const nameLength = view.getUint16(cursor + 28, true)
    const offset = view.getUint32(cursor + 42, true)
    const name = decoder.decode(archive.subarray(cursor + 46, cursor + 46 + nameLength))

    expect(view.getUint32(offset, true)).toBe(0x04034B50)
    const size = view.getUint32(offset + 18, true)
    const localName = view.getUint16(offset + 26, true)
    const extra = view.getUint16(offset + 28, true)
    const start = offset + 30 + localName + extra
    const data = archive.subarray(start, start + size)

    expect(view.getUint32(cursor + 16, true), `сумма ${ name }`).toBe(crc32(data))
    found.set(name, decoder.decode(data))
    cursor += 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true)
  }
  return found
}

interface Row { readonly name: string; readonly count: number }

const COLUMNS = [
  { header: "Прибор", value: (row: Row) => row.name, width: 30 },
  { header: "Штук", value: (row: Row) => row.count },
]

describe("контрольная сумма", () => {
  it("совпадает с известной", () => {
    // CRC32 строки «123456789» — контрольное значение из описания алгоритма.
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xCBF43926)
  })

  it("у пустых данных равна нулю", () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe("архив", () => {
  it("складывает файлы и отдаёт их обратно целыми", () => {
    const encoder = new TextEncoder()
    const archive = zip([
      { name: "один.txt", data: encoder.encode("первый") },
      { name: "два/три.txt", data: encoder.encode("второй, с кириллицей") },
    ])

    const found = entries(archive)
    expect([...found.keys()]).toEqual(["один.txt", "два/три.txt"])
    expect(found.get("два/три.txt")).toBe("второй, с кириллицей")
  })
})

describe("книга", () => {
  it("состоит из частей, которых Excel ждёт", () => {
    const found = entries(toXlsx("Отчёт", [], COLUMNS))

    expect([...found.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ])
  })

  it("пишет заголовки строкой, а числа числами", () => {
    const sheet = entries(toXlsx("Отчёт", [{ name: "Манометр", count: 7 }], COLUMNS))
      .get("xl/worksheets/sheet1.xml")!

    expect(sheet).toContain(`<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Прибор</t></is></c>`)
    expect(sheet).toContain(`<c r="A2" t="inlineStr"><is><t xml:space="preserve">Манометр</t></is></c>`)
    expect(sheet).toContain(`<c r="B2"><v>7</v></c>`)
  })

  it("закрепляет строку заголовков и задаёт ширину колонок", () => {
    const sheet = entries(toXlsx("Отчёт", [], COLUMNS)).get("xl/worksheets/sheet1.xml")!

    expect(sheet).toContain(`state="frozen"`)
    expect(sheet).toContain(`<col min="1" max="1" width="30" customWidth="1"/>`)
  })

  it("обезвреживает разметку и управляющие знаки в данных", () => {
    const sheet = entries(toXlsx("Отчёт", [{ name: "<b>Ключ</b>", count: 1 }], COLUMNS))
      .get("xl/worksheets/sheet1.xml")!

    expect(sheet).toContain("&lt;b&gt;Ключ&lt;/b&gt;")
    expect(sheet).not.toContain("")
  })

  it("пустую ячейку оставляет пустой, а не пишет в неё «null»", () => {
    const sheet = entries(toXlsx("Отчёт", [{ name: "", count: 0 }], [
      { header: "Прибор", value: (row: Row) => row.name },
      { header: "Заметка", value: () => null },
    ])).get("xl/worksheets/sheet1.xml")!

    expect(sheet).toContain(`<c r="A2"/>`)
    expect(sheet).toContain(`<c r="B2"/>`)
  })
})

describe("имена", () => {
  it("колонки нумеруются по-эксельному", () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(columnName)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA"])
  })

  it("лист не принимает запрещённые знаки и длину больше тридцати одного", () => {
    expect(sheetName("Журнал: 2026/05")).toBe("Журнал  2026 05")
    expect(sheetName("   ")).toBe("Лист1")
    expect(sheetName("я".repeat(40))).toHaveLength(31)
  })

  it("файл подписан датой", () => {
    expect(exportFileName("pribory", "xlsx", new Date(2026, 8, 18).getTime()))
      .toBe("pribory-2026-09-18.xlsx")
  })
})
