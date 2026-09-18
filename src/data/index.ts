import { isDevelopment, isTauri } from "../platform/env"
import type { AppRepo } from "./AppRepo"
import { MemoryRepo } from "./MemoryRepo"

/**
 * Кэшируется промис, а не результат: иначе два параллельных первых вызова
 * запустили бы инициализацию — и миграции — дважды.
 */
let cached: Promise<AppRepo> | null = null

/**
 * Подменное «сейчас» для витрины.
 *
 * Демонстрационные данные должны выглядеть как история за месяц, а не как сто
 * операций, случившихся в одну секунду при первом запуске. Поэтому на время
 * засева часы отматываются назад, а потом возвращаются к настоящим.
 */
let simulatedNow: number | null = null

function clock(): number {
  return simulatedNow ?? Date.now()
}

function travel(timestamp: number | null): void {
  simulatedNow = timestamp
}

async function initRepo(): Promise<AppRepo> {
  if (isTauri()) {
    // Динамический импорт: в браузерной сборке модуль с плагином SQL не должен
    // даже попадать в граф — грузить его там нечем.
    const { SqliteRepo } = await import("./SqliteRepo")
    const repo = await SqliteRepo.load(clock)
    if (isDevelopment()) {
      const { seedShowcaseIfEmpty } = await import("./devSeed")
      await seedShowcaseIfEmpty(repo, travel)
    }
    return repo
  }

  // Браузер: вёрстка на дев-сервере без сборки Rust.
  const repo = new MemoryRepo(clock)
  if (isDevelopment()) {
    const { seedShowcase } = await import("./devSeed")
    /* ?demo=empty оставляет приложение пустым — так проверяются первый запуск,
       модалка «представьтесь» и экраны, на которых ещё ничего нет. */
    if (new URLSearchParams(location.search).get("demo") !== "empty") {
      await seedShowcase(repo, travel)
    }
  }
  return repo
}

export async function getRepo(): Promise<AppRepo> {
  if (!cached) {
    cached = initRepo().catch((error: unknown) => {
      // Провалившуюся инициализацию не запоминаем: иначе один сбой навсегда
      // сломает доступ к данным для всего приложения.
      cached = null
      throw error
    })
  }
  return cached
}

export type { AppRepo, StorageBackend, WriteError } from "./AppRepo"
export { generateId } from "./uuid"
