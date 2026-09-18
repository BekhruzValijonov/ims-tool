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

  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" })
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
