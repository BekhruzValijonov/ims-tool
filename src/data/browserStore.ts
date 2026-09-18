import type { AppRepo } from "./AppRepo"
import { SNAPSHOT_VERSION, type MemoryRepo, type MemorySnapshot } from "./MemoryRepo"

/**
 * Витрина в браузере, которая переживает перезагрузку.
 *
 * На устройстве данные держит SQLite, а в браузере — `MemoryRepo`, и без этого
 * слоя всё, что оператор завёл или настроил, пропадало на первом же обновлении
 * страницы. Сам репозиторий остаётся тем же: хранение добавлено снаружи, при
 * сборке приложения.
 */

const KEY = "ims-store-v1"

/* Снимок пишется не сразу: подряд идущие вызовы дают один снимок вместо
   десятка. Полсекунды — меньше, чем перерыв между действиями человека, и
   больше, чем пауза внутри одной операции. */
const SAVE_DELAY = 500

export function readSnapshot(): MemorySnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as MemorySnapshot
    return data.version === SNAPSHOT_VERSION ? data : null
  } catch {
    // Испорченная запись или запрет хранилища — витрина просто засеется заново.
    return null
  }
}

export function forgetSnapshot(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Хранилище недоступно — забывать нечего.
  }
}

function write(repo: MemoryRepo): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(repo.snapshot()))
  } catch {
    // Переполнение или приватный режим: витрина продолжит работать без хранения.
  }
}

/**
 * Обёртка, которая сохраняет снимок после обращений к репозиторию.
 *
 * Сохраняет и после чтения тоже — отличать чтения от записей по именам методов
 * значило бы дублировать здесь знание о порте и забыть обновить его при
 * следующем методе. Отложенная запись делает лишние снимки бесплатными.
 */
export function withBrowserStorage(repo: MemoryRepo): AppRepo {
  let pending: ReturnType<typeof setTimeout> | null = null

  /* Засеянная витрина сохраняется сразу, не дожидаясь первого действия: иначе
     после перезагрузки она засевается заново, и ссылка на прибор, открытая в
     соседней вкладке, ведёт в никуда — идентификаторы уже другие. */
  write(repo)

  function schedule() {
    if (pending !== null) return
    pending = setTimeout(() => {
      pending = null
      write(repo)
    }, SAVE_DELAY)
  }

  /* Вкладку могут закрыть раньше, чем сработает отложенная запись. */
  window.addEventListener("pagehide", () => {
    if (pending === null) return
    clearTimeout(pending)
    pending = null
    write(repo)
  })

  function port<T extends object>(source: T): T {
    const wrapped: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(source)) {
      wrapped[name] = typeof value === "function"
        ? async (...args: unknown[]) => {
          const result: unknown = await (value as (...a: unknown[]) => unknown)(...args)
          schedule()
          return result
        }
        : value
    }
    return wrapped as T
  }

  return {
    backend: repo.backend,
    instruments: port(repo.instruments),
    operations: port(repo.operations),
    directories: port(repo.directories),
    verification: port(repo.verification),
    dashboard: port(repo.dashboard),
    settings: port(repo.settings),
  }
}
