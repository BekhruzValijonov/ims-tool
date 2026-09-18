import { describe, expect, it } from "vitest"
import { csvFileName, toCsv } from "./csv"

describe("выгрузка в CSV", () => {
  it("начинается с BOM и разделяет точкой с запятой", () => {
    const csv = toCsv([{ name: "Манометр", count: 3 }], [
      { header: "Прибор", value: (row) => row.name },
      { header: "Штук", value: (row) => row.count },
    ])

    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv).toContain("Прибор;Штук")
    expect(csv).toContain("Манометр;3")
  })

  it("экранирует значения с разделителем, кавычками и переводом строки", () => {
    const csv = toCsv([{ note: 'Сказал "верну"; завтра\nне вернул' }], [
      { header: "Примечание", value: (row) => row.note },
    ])

    expect(csv).toContain('"Сказал ""верну""; завтра\nне вернул"')
  })

  it("пустые значения оставляет пустыми, а не словом null", () => {
    const csv = toCsv([{ serial: null }], [{ header: "Серийный", value: (row) => row.serial }])
    expect(csv).toContain("Серийный\r\n\r\n")
  })

  it("подставляет дату в имя файла", () => {
    expect(csvFileName("pribory", new Date(2026, 8, 18).getTime())).toBe("pribory-2026-09-18.csv")
  })
})
