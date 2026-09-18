import { DatabaseSync } from "node:sqlite"
import { describeRepoContract } from "./repoContract"
import { SqliteRepo, type SqlDriver } from "./SqliteRepo"

/**
 * Драйвер поверх встроенного в Node SQLite.
 *
 * Тауристый `Database` из `@tauri-apps/plugin-sql` реализует ровно этот
 * интерфейс, поэтому здесь по настоящему движку SQLite гоняется тот же SQL,
 * который пойдёт на устройстве — а не подставная заглушка, которая согласилась
 * бы с любым запросом.
 */
function nodeSqliteDriver(): SqlDriver {
  const db = new DatabaseSync(":memory:")

  const bind = (params: readonly unknown[]) =>
    params.map((value) => {
      if (value === undefined || value === null) return null
      if (typeof value === "boolean") return value ? 1 : 0
      if (typeof value === "number" || typeof value === "string") return value
      return String(value)
    })

  return {
    async execute(sql, params = []) {
      if (params.length === 0) {
        db.exec(sql)
        return
      }
      db.prepare(sql).run(...bind(params))
    },
    async select<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...bind(params)) as T
    },
  }
}

describeRepoContract("SqliteRepo", (clock) => SqliteRepo.open(nodeSqliteDriver(), clock))
