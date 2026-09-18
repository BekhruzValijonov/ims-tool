/**
 * Схема локальной базы.
 *
 * Правила работы с этим файлом:
 *   1. Миграции нумеруются подряд и НИКОГДА не редактируются после того, как
 *      попали в сборку — только добавляются новые в конец.
 *   2. Применённая версия хранится в `PRAGMA user_version`, поэтому повторный
 *      запуск ничего не переделывает.
 *
 * Чего здесь принципиально нет:
 *   — удаления справочников. На подразделение, место и сотрудника ссылается
 *     журнал; удалить их значит стереть смысл прошлых операций. Есть
 *     архивирование.
 *   — каскадного удаления приборов. Прибор списывается, а не исчезает: журнал
 *     обязан пережить прибор, иначе система теряет то, ради чего заведена.
 */

export interface Migration {
  readonly id: number
  readonly statements: readonly string[]
}

export const MIGRATIONS: readonly Migration[] = [
  {
    id: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       );`,

      `CREATE TABLE IF NOT EXISTS department (
         id          TEXT PRIMARY KEY,
         name        TEXT NOT NULL UNIQUE,
         code        TEXT,
         is_archived INTEGER NOT NULL DEFAULT 0,
         created_at  INTEGER NOT NULL,
         updated_at  INTEGER NOT NULL
       );`,

      /* department_id допускает NULL: общий склад не принадлежит ни одному цеху. */
      `CREATE TABLE IF NOT EXISTS location (
         id            TEXT PRIMARY KEY,
         name          TEXT NOT NULL,
         code          TEXT,
         department_id TEXT REFERENCES department (id),
         note          TEXT,
         is_archived   INTEGER NOT NULL DEFAULT 0,
         created_at    INTEGER NOT NULL,
         updated_at    INTEGER NOT NULL
       );`,
      `CREATE INDEX IF NOT EXISTS idx_location_department ON location (department_id);`,

      `CREATE TABLE IF NOT EXISTS employee (
         id               TEXT PRIMARY KEY,
         full_name        TEXT NOT NULL,
         personnel_number TEXT UNIQUE,
         department_id    TEXT REFERENCES department (id),
         position         TEXT,
         phone            TEXT,
         search_text      TEXT NOT NULL DEFAULT '',
         is_active        INTEGER NOT NULL DEFAULT 1,
         created_at       INTEGER NOT NULL,
         updated_at       INTEGER NOT NULL
       );`,
      `CREATE INDEX IF NOT EXISTS idx_employee_department ON employee (department_id);`,

      `CREATE TABLE IF NOT EXISTS instrument_type (
         id                                   TEXT PRIMARY KEY,
         name                                 TEXT NOT NULL UNIQUE,
         requires_verification                INTEGER NOT NULL DEFAULT 0,
         default_verification_interval_months INTEGER,
         is_archived                          INTEGER NOT NULL DEFAULT 0,
         created_at                           INTEGER NOT NULL,
         updated_at                           INTEGER NOT NULL
       );`,

      /* inventory_number UNIQUE — ключ сверки с бухгалтерией и ключ будущего
         импорта: повторная загрузка того же файла обязана обновлять строки, а
         не плодить дубликаты.

         base_location_id отдельно от current_location_id, потому что в форме
         возврата места нет: кладовщик жмёт «Вернуть», и система сама обязана
         знать, куда прибор возвращается.

         next_verification_at денормализован из verification: иначе плитка
         «истекает поверка» на каждой отрисовке дашборда лезет подзапросом во
         всю историю поверок. */
      `CREATE TABLE IF NOT EXISTS instrument (
         id                      TEXT PRIMARY KEY,
         inventory_number        TEXT NOT NULL UNIQUE,
         name                    TEXT NOT NULL,
         type_id                 TEXT REFERENCES instrument_type (id),
         serial_number           TEXT,
         manufacturer            TEXT,
         model                   TEXT,
         status                  TEXT NOT NULL,

         owner_department_id     TEXT REFERENCES department (id),
         base_location_id        TEXT REFERENCES location (id),
         current_department_id   TEXT REFERENCES department (id),
         current_location_id     TEXT REFERENCES location (id),
         current_employee_id     TEXT REFERENCES employee (id),
         responsible_employee_id TEXT REFERENCES employee (id),

         issued_at               INTEGER,
         expected_return_at      INTEGER,
         next_verification_at    INTEGER,
         next_calibration_at     INTEGER,

         purchased_at            INTEGER,
         price_minor             INTEGER,
         currency                TEXT,
         description             TEXT,
         note                    TEXT,

         /* Поиск: lower() в SQLite не знает кириллицы, поэтому текст
            приводится к нижнему регистру в приложении и хранится готовым. */
         search_text             TEXT NOT NULL DEFAULT '',

         source                  TEXT NOT NULL DEFAULT 'manual',
         external_ref            TEXT,
         created_at              INTEGER NOT NULL,
         updated_at              INTEGER NOT NULL
       );`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_search ON instrument (search_text);`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_status ON instrument (status);`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_employee ON instrument (current_employee_id);`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_department ON instrument (current_department_id);`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_location ON instrument (current_location_id);`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_expected_return ON instrument (expected_return_at);`,
      `CREATE INDEX IF NOT EXISTS idx_instrument_next_verification ON instrument (next_verification_at);`,

      /* ON DELETE RESTRICT, а не CASCADE: журнал обязан пережить прибор.
         operator_name — строка, а не ссылка: оператор это подпись, и смена ФИО
         в настройках не должна переподписывать уже сделанные записи. */
      `CREATE TABLE IF NOT EXISTS instrument_event (
         id                 TEXT PRIMARY KEY,
         instrument_id      TEXT NOT NULL REFERENCES instrument (id) ON DELETE RESTRICT,
         kind               TEXT NOT NULL,
         occurred_at        INTEGER NOT NULL,
         status_before      TEXT,
         status_after       TEXT,
         employee_id        TEXT REFERENCES employee (id),
         from_location_id   TEXT REFERENCES location (id),
         to_location_id     TEXT REFERENCES location (id),
         from_department_id TEXT REFERENCES department (id),
         to_department_id   TEXT REFERENCES department (id),
         expected_return_at INTEGER,
         condition          TEXT,
         reason             TEXT,
         note               TEXT,
         operator_name      TEXT NOT NULL,
         payload_json       TEXT
       );`,
      `CREATE INDEX IF NOT EXISTS idx_event_instrument ON instrument_event (instrument_id, occurred_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_event_occurred ON instrument_event (occurred_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_event_kind ON instrument_event (kind, occurred_at);`,
      `CREATE INDEX IF NOT EXISTS idx_event_employee ON instrument_event (employee_id, occurred_at);`,

      `CREATE TABLE IF NOT EXISTS verification (
         id                 TEXT PRIMARY KEY,
         instrument_id      TEXT NOT NULL REFERENCES instrument (id) ON DELETE RESTRICT,
         kind               TEXT NOT NULL,
         performed_at       INTEGER NOT NULL,
         valid_until        INTEGER,
         certificate_number TEXT,
         organization       TEXT,
         result             TEXT NOT NULL,
         note               TEXT,
         created_at         INTEGER NOT NULL
       );`,
      `CREATE INDEX IF NOT EXISTS idx_verification_instrument ON verification (instrument_id, performed_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_verification_valid_until ON verification (valid_until);`,
    ],
  },
]

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].id
