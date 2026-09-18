import { isTauri } from "./env"

/**
 * Сохранение выгрузки на диск.
 *
 * В приложении — системный диалог «Сохранить как», в браузере — обычная
 * загрузка файла. Возвращает false, когда человек закрыл диалог: это не
 * ошибка, и ругаться на неё не нужно.
 */
export async function saveTextFile(fileName: string, contents: string): Promise<boolean> {
  if (isTauri()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ])
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    })
    if (!path) return false
    await writeTextFile(path, contents)
    return true
  }

  return download(fileName, new Blob([contents], { type: "text/csv;charset=utf-8" }))
}

/**
 * Сохранение книги Excel.
 *
 * Отличается от текстовой выгрузки не только байтами: системному диалогу нужен
 * свой фильтр расширений, иначе он предложит сохранить книгу как `.csv`.
 */
export async function saveBinaryFile(fileName: string, contents: Uint8Array): Promise<boolean> {
  if (isTauri()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ])
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: "Книга Excel", extensions: ["xlsx"] }],
    })
    if (!path) return false
    await writeFile(path, contents)
    return true
  }

  return download(fileName, new Blob([contents as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }))
}

/** Загрузка файла в браузере: ссылка, нажатие, уборка. */
function download(fileName: string, blob: Blob): boolean {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}
