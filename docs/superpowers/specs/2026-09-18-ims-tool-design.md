# IMS Tool — учёт приборов и их движения

Дизайн-документ. Дата: 2026-09-18.

## 1. Что это и зачем

Настольное приложение для завода: реестр измерительных приборов и журнал всего,
что с ними происходит — выдача сотруднику, возврат, перемещение между цехами,
ремонт, поверка, списание.

Приложение отвечает на четыре вопроса, ради которых оно и существует:

1. Где сейчас находится прибор с инвентарным номером N?
2. Что сейчас на руках у сотрудника Иванова?
3. Что происходило с этим прибором за последний год?
4. У каких приборов истекает поверка?

Ни на один из них таблица «текущее состояние» без истории ответить не может,
поэтому журнал операций — центральная сущность, а не побочный лог.

## 2. Принятые решения и рамки

Решения приняты владельцем 2026-09-18 и определяют всё остальное.

- **База локальная.** Один SQLite-файл на устройстве, слой данных устроен как в
  `calora-ai`. Отдельного сервера, API и сети нет ни в каком виде.
- **Пользователь один, ролей нет.** Ни входа, ни пароля, ни разграничения прав.
  Вместо учётной записи — ФИО оператора, введённое один раз и подставляемое в
  журнал как автор записи.
- **Метрология входит в первую версию.** Поверки и калибровки хранятся историей
  с номерами свидетельств, а не двумя датами в карточке.
- **Импорт из Excel — позже.** Схема к нему готова (уникальный инвентарный
  номер, источник записи, внешний код строки), экрана импорта в первой версии
  нет.
- **Интерфейс только русский.** Слоя i18n нет.
- **Учёт поштучный.** У каждого физического прибора свой инвентарный номер;
  строк вида «мультиметр, 5 шт.» не бывает.

### Что это значит для будущего

Слой данных спроектирован как порт с несколькими реализациями. Если заводу
понадобится несколько рабочих мест, рядом с `SqliteRepo` встаёт третья
реализация того же интерфейса (`HttpRepo` или подключение к PostgreSQL), а
экраны и доменная логика не меняются. Раздел 7 задаёт соответствие методов порта
REST-путям именно для этого случая.

## 3. Архитектура

Повторяет `calora-ai`:

- **Порт и адаптеры.** `AppRepo` — композиция узких интерфейсов. Реализаций две:
  `SqliteRepo` поверх `@tauri-apps/plugin-sql` (устройство) и `MemoryRepo`
  (браузерный дев-сервер и тесты). Обе проверяются одним набором требований
  `repoContract.ts` — иначе реализации разъедутся, и ошибка вылезет только на
  устройстве.
- **Миграции.** Нумерованный массив в `src/data/migrations.ts`, применённая
  версия в `PRAGMA user_version`. Миграция, попавшая в сборку, больше никогда не
  редактируется — только добавляется новая в конец.
- **Доменный слой без базы и без React.** Переходы состояний, расчёт просрочки и
  сроков поверки — чистые функции, покрытые тестами.
- **Нарезка по фичам.**

```
src/
  app/             тема, провайдеры, роутер
  data/            AppRepo, SqliteRepo, MemoryRepo, migrations, repoContract
  features/
    instruments/   {domain,data,ui}
    operations/
    directories/
    verification/
    dashboard/
    reports/
    settings/
  design-system/   карточки и чарты, перенесённые из шаблона MUI Dashboard
  pages/           экраны, собранные из фич
  platform/        isTauri, пути к файлам, системные диалоги
  shared/
```

Инициализация — кэшированный промис `getRepo()`: два параллельных первых вызова
не должны запустить миграции дважды.

## 4. Модель данных

### Перечисления

```ts
type InstrumentStatus =
  | 'AVAILABLE'         // на месте, можно выдавать
  | 'CHECKED_OUT'       // на руках у сотрудника
  | 'IN_REPAIR'         // в ремонте
  | 'IN_VERIFICATION'   // уехал на поверку или калибровку
  | 'WRITTEN_OFF'       // списан, терминальное состояние

type EventKind =
  | 'CREATE' | 'CHECK_OUT' | 'RETURN' | 'TRANSFER'
  | 'REPAIR_SEND' | 'REPAIR_DONE' | 'VERIFY_SEND' | 'VERIFY_DONE'
  | 'WRITE_OFF' | 'EDIT'

type ReturnCondition = 'OK' | 'DAMAGED' | 'NEEDS_REPAIR'
type VerificationKind = 'VERIFICATION' | 'CALIBRATION'
```

Статуса `RESERVED` нет: экрана бронирования в первой версии не будет, а статус,
который некому выставить, — это пустой фильтр и поле, которое никто не
заполняет. Добавляется одной миграцией вместе с экраном.

Статус называется `IN_VERIFICATION`, а не `CALIBRATION`: он означает «прибор
физически уехал на поверку», а вид работы (поверка или калибровка) хранится в
`verification.kind`.

### Связи

```
   instrument_type          department ──────┐
        │ 1                    │ 1           │ 1
        │ *                    │ *           │ *
   ┌─────────────────────  instrument  ─── employee
   │                        │  1   │ 1         │ 1
   │                        │ *    │ *         │ *
   │                  instrument_   verification│
   │                     event ─────────────────┘
   │ *                      │ *
 location ─────────────────┘
   │ *
   └── department
```

### instrument — реестр

Одна строка на физический прибор.

```sql
CREATE TABLE instrument (
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

  source                  TEXT NOT NULL,   -- 'manual' | 'import'
  external_ref            TEXT,
  created_at              INTEGER NOT NULL,
  updated_at              INTEGER NOT NULL
);
```

Индексы: `status`, `inventory_number`, `current_employee_id`,
`current_department_id`, `expected_return_at`, `next_verification_at`.

Почему так:

- `inventory_number UNIQUE` — ключ сверки с бухгалтерией и ключ будущего
  импорта: повторная загрузка того же файла должна обновлять строки, а не
  плодить дубликаты.
- `base_location_id` отдельно от `current_location_id` — в форме возврата места
  нет, кладовщик просто жмёт «Вернуть». Значит система обязана сама знать, куда
  прибор возвращается.
- `owner_department_id` отдельно от `current_department_id` — прибор может
  временно работать в другом цехе, оставаясь на балансе своего.
- `next_verification_at` — денормализация из `verification`: иначе плитка
  «истекает поверка» на каждой отрисовке дашборда лезет подзапросом во всю
  историю поверок. Обновляется в той же транзакции, что и запись поверки.
- `price_minor INTEGER` — деньги целым числом в тийинах. `REAL` для денег рано
  или поздно показывает 1 249,9999.
- `source` и `external_ref` — задел под импорт, заполняются уже сейчас
  (`'manual'`).

Приборы не удаляются. Списание — это статус `WRITTEN_OFF`; отдельного флага
«в архиве» нет, потому что два независимых признака одного и того же гарантированно
разъедутся.

### instrument_event — журнал

Главная таблица приложения: источник истории, отчётов и дашборда.

```sql
CREATE TABLE instrument_event (
  id                    TEXT PRIMARY KEY,
  instrument_id         TEXT NOT NULL REFERENCES instrument (id) ON DELETE RESTRICT,
  kind                  TEXT NOT NULL,
  occurred_at           INTEGER NOT NULL,
  status_before         TEXT,
  status_after          TEXT,
  employee_id           TEXT REFERENCES employee (id),
  from_location_id      TEXT REFERENCES location (id),
  to_location_id        TEXT REFERENCES location (id),
  from_department_id    TEXT REFERENCES department (id),
  to_department_id      TEXT REFERENCES department (id),
  expected_return_at    INTEGER,
  condition             TEXT,
  reason                TEXT,
  note                  TEXT,
  operator_name         TEXT NOT NULL,
  payload_json          TEXT
);
```

Индексы: `(instrument_id, occurred_at DESC)`, `(occurred_at DESC)`,
`(kind, occurred_at)`, `(employee_id, occurred_at)`.

`ON DELETE RESTRICT`, а не `CASCADE`: журнал обязан пережить прибор. Удаление
прибора вместе с его историей — это потеря именно того, ради чего система
заводилась.

`operator_name` хранится строкой, а не ссылкой: оператор — не сущность базы, а
подпись. Если ФИО в настройках потом поменяют, уже сделанные записи должны
остаться подписанными тем, кто их сделал.

`payload_json` заполняется только для `EDIT` — что именно поменяли в карточке.

### verification — поверки и калибровки

```sql
CREATE TABLE verification (
  id                 TEXT PRIMARY KEY,
  instrument_id      TEXT NOT NULL REFERENCES instrument (id) ON DELETE RESTRICT,
  kind               TEXT NOT NULL,        -- VERIFICATION | CALIBRATION
  performed_at       INTEGER NOT NULL,
  valid_until        INTEGER,
  certificate_number TEXT,
  organization       TEXT,
  result             TEXT NOT NULL,        -- PASS | FAIL
  note               TEXT,
  created_at         INTEGER NOT NULL
);
```

Индексы: `(instrument_id, performed_at DESC)`, `(valid_until)`.

### Справочники

```sql
CREATE TABLE department (
  id, name TEXT NOT NULL UNIQUE, code TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0, created_at, updated_at
);

CREATE TABLE location (
  id, name TEXT NOT NULL, code TEXT,
  department_id TEXT REFERENCES department (id),   -- NULL: общий склад
  note TEXT, is_archived INTEGER NOT NULL DEFAULT 0, created_at, updated_at
);

CREATE TABLE employee (
  id, full_name TEXT NOT NULL, personnel_number TEXT UNIQUE,
  department_id TEXT REFERENCES department (id), position TEXT, phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, created_at, updated_at
);

CREATE TABLE instrument_type (
  id, name TEXT NOT NULL UNIQUE,
  requires_verification INTEGER NOT NULL DEFAULT 0,
  default_verification_interval_months INTEGER,
  is_archived INTEGER NOT NULL DEFAULT 0, created_at, updated_at
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

Подразделение и место хранения — разные сущности и не смешиваются:
подразделение это «Лаборатория», место это «Шкаф №4».

Записи справочников не удаляются, а архивируются: на них ссылается журнал.

`settings` хранит единственный ключ — `operator_full_name`.

## 5. Машина состояний

Статус меняется только операцией. Ни форма правки, ни репозиторий не позволяют
выставить статус напрямую — это убирает основную массу ошибок оператора.

| Операция | Из статусов | Становится | Что ещё меняется |
|---|---|---|---|
| `CHECK_OUT` | `AVAILABLE` | `CHECKED_OUT` | сотрудник, подразделение, `issued_at`, `expected_return_at` |
| `RETURN` | `CHECKED_OUT` | `AVAILABLE` при `OK`, иначе `IN_REPAIR` | сотрудник и даты выдачи очищаются, место ← `base_location_id` |
| `TRANSFER` | `AVAILABLE`, `CHECKED_OUT` | не меняется | текущее подразделение и место; при взведённом флаге «перевести насовсем» — ещё `owner_department_id` и `base_location_id` |
| `REPAIR_SEND` | `AVAILABLE`, `CHECKED_OUT` | `IN_REPAIR` | сотрудник снимается, место ← ремонтный участок |
| `REPAIR_DONE` | `IN_REPAIR` | `AVAILABLE` | место ← `base_location_id` |
| `VERIFY_SEND` | `AVAILABLE` | `IN_VERIFICATION` | — |
| `VERIFY_DONE` | `IN_VERIFICATION` | `AVAILABLE` | запись в `verification`; срок ложится в `next_verification_at` или `next_calibration_at` — по `kind` записи |
| `WRITE_OFF` | любой, кроме `CHECKED_OUT` | `WRITTEN_OFF` | текущее размещение и держатель обнуляются |

`DAMAGED` и `NEEDS_REPAIR` дают один и тот же статус `IN_REPAIR`. Различие
сохраняется в журнале и нужно отчёту по ремонтам: «повреждён при эксплуатации» и
«вышел из строя» — разные причины, хотя прибор в обоих случаях едет к слесарю.

`WRITE_OFF` запрещён для выданного прибора намеренно: списать то, что сейчас на
руках у человека, — это либо ошибка, либо сначала возврат.

`TRANSFER` бывает двух видов, и различает их флажок «перевести насовсем» в форме
перемещения. Снят — прибор командирован: меняется только текущее размещение, а
«Вернуть» приведёт его на прежнюю полку. Взведён — прибор передан другому цеху:
меняется и балансовая принадлежность, и место возврата.

`WRITTEN_OFF` терминален: выходов из него нет.

Реализация — чистая функция:

```ts
// features/operations/domain/transitions.ts
export function applyOperation(
  instrument: Instrument,
  command: OperationCommand,
  now: number,
): Result<{ next: Instrument; event: NewInstrumentEvent }, OperationError>
```

`OperationError` — размеченное объединение: `WRONG_STATUS` (с текущим статусом и
списком допустимых), `EMPLOYEE_ARCHIVED`, `RETURN_DATE_IN_PAST`, `SAME_LOCATION`,
`WRITTEN_OFF_IS_FINAL`. Кнопки недопустимых операций на экране отсутствуют, так
что ошибки — страховка, а не основной путь.

## 6. Согласованность

Текущее состояние прибора хранится дважды: как строка в `instrument` и как
последовательность событий в `instrument_event`. Это осознанный размен — список
из тысячи приборов с фильтрами по статусу и месту не должен проигрывать журнал на
каждый запрос.

Согласие между ними держится тремя правилами:

1. Единственный путь записи — `OperationRepo.execute`. Прямой записи в `status`
   и `current_*` в коде не существует.
2. Строка журнала и обновление прибора идут одной транзакцией.
3. Решение о новом состоянии принимает чистая функция `applyOperation`,
   покрытая тестами; репозиторий только сохраняет её результат.

## 7. Контракт репозитория

Сервера нет, поэтому роль эндпоинтов играет порт `AppRepo`.

```ts
interface InstrumentRepo {
  list(q: InstrumentQuery): Promise<Page<Instrument>>
  getById(id: string): Promise<Instrument | null>
  getByInventoryNumber(n: string): Promise<Instrument | null>
  create(draft: InstrumentDraft): Promise<Instrument>        // + событие CREATE
  update(id: string, patch: InstrumentPatch): Promise<Instrument>  // + событие EDIT
}

interface OperationRepo {
  execute(cmd: OperationCommand): Promise<Result<OperationOutcome, OperationError>>
  historyOf(instrumentId: string): Promise<InstrumentEvent[]>
  journal(q: JournalQuery): Promise<Page<InstrumentEvent>>
}

interface DirectoryRepo {
  employees(q?: EmployeeQuery): Promise<Employee[]>
  instrumentsOf(employeeId: string): Promise<Instrument[]>
  departmentSummary(): Promise<DepartmentSummary[]>
  // создание, правка и архивирование для employee, department,
  // location, instrument_type
}

interface VerificationRepo {
  listFor(instrumentId: string): Promise<VerificationRecord[]>
  add(record: NewVerificationRecord): Promise<VerificationRecord>
  dueBefore(ts: number): Promise<Instrument[]>
}

interface DashboardRepo {
  counters(): Promise<Counters>
  flow(from: number, to: number): Promise<DailyFlow[]>
  recent(limit: number): Promise<InstrumentEvent[]>
  statusBreakdown(): Promise<StatusSlice[]>
}

interface SettingsRepo {
  operatorName(): Promise<string | null>
  setOperatorName(name: string): Promise<void>
}
```

`execute` один на все операции, а не шесть отдельных методов: команда —
размеченное объединение по `kind`. Тогда новая операция это новый вариант в union
и новая ветка в чистой функции, без изменения интерфейса базы.

`InstrumentQuery` покрывает фильтры экрана приборов: текстовый поиск по названию,
инвентарному и серийному номеру, статус, тип, подразделение, место, сотрудник,
период добавления, страница.

### Соответствие REST-путям

Задано, чтобы при переезде на сервер порт стал HTTP-клиентом, а не переписывался.

| Метод порта | Эндпоинт |
|---|---|
| `instruments.list` | `GET /instruments?status=&department=&q=&page=` |
| `instruments.getById` | `GET /instruments/{id}` |
| `instruments.create` / `update` | `POST /instruments` · `PATCH /instruments/{id}` |
| `operations.execute` | `POST /instruments/{id}/operations` |
| `operations.historyOf` | `GET /instruments/{id}/events` |
| `operations.journal` | `GET /events?kind=&from=&to=&employee=` |
| `verification.listFor` / `add` | `GET` · `POST /instruments/{id}/verifications` |
| `directory.*` | `/employees` · `/departments` · `/locations` · `/instrument-types` |
| `dashboard.*` | `/dashboard/counters` · `/dashboard/flow` · `/dashboard/recent` |

## 8. Интерфейс

### Основа

Разметку даёт Toolpad (`DashboardLayout`, уже в проекте). Карточки и чарты
берутся из шаблона MUI Dashboard вместе с файлами `theme/customizations/*`
(`chartsCustomizations`, `dataGridCustomizations`, `treeViewCustomizations`) —
внешний вид дают именно они, без них выйдут стандартные чарты MUI, похожие, но
не те. `SideMenu` и `Header` шаблона не переносятся: их работу уже делает
Toolpad.

Добавляются зависимости: `@mui/x-charts`, `@mui/x-data-grid`, `@mui/x-tree-view`
(MIT-версии, платной лицензии не требуют) и `react-router-dom`.

`useDemoRouter` и `DemoProvider` из `@toolpad/core/internal` убираются — это
заглушки витрины документации, без адресной строки, истории переходов и ссылок
на карточку прибора. Вместо них `react-router-dom` с адаптером под Toolpad.

### Навигация

```
Dashboard · Приборы · Операции · Сотрудники · Подразделения ·
Места хранения · Типы приборов · Отчёты · Настройки
```

### Dashboard

| Компонент шаблона | Содержание | Источник |
|---|---|---|
| `StatCard` ×4 | Всего · В наличии · Выдано · Просрочено, со спарклайном за 30 дней | `counters` + `flow` |
| `HighlightedCard` | «Истекает поверка: N» с переходом к отфильтрованному списку | `verification.dueBefore` |
| `SessionsChart` | «Движение приборов за месяц»: выдачи и возвраты по дням | `flow` |
| `PageViewsBarChart` | «Операции по подразделениям» за период, сегменты по типу операции | `departmentSummary` |
| `CustomizedDataGrid` | «Последние операции»: время, инв. номер, операция, сотрудник, место | `recent` |
| `ChartUserByCountry` | «Распределение по статусам» | `statusBreakdown` |
| `CustomizedTreeView` | Дерево «Подразделение → Место хранения → приборов» | `departmentSummary` |

Плитка «Просрочено» считается по `status = 'CHECKED_OUT' AND expected_return_at
< now` — это невозврат в срок. Просрочка поверки живёт отдельно в
`HighlightedCard`, чтобы два разных «просрочено» не слились в одно число.

### Экраны

- **Приборы.** `DataGrid` с фильтрами (поиск, статус, тип, подразделение, место,
  сотрудник, период), статус чипом, кнопки «Добавить» и «Экспорт».
- **Карточка прибора.** Паспорт, текущее состояние, лента истории, блок поверок,
  кнопки операций. Кнопка недопустимой из текущего статуса операции не гасится,
  а отсутствует.
- **Добавление и правка.** Четыре блока: Основное · Учёт · Дополнительно ·
  Метрология. Блок «Метрология» показывается, только если у выбранного типа
  стоит `requires_verification`.
- **Операции.** Журнал за период с фильтрами. Сами операции выполняются модалками
  из карточки прибора и кнопкой «Быстрая выдача» (ввод инвентарного номера →
  форма выдачи).
- **Сотрудники.** Список; карточка показывает, что сейчас на руках, и всю
  историю выдач.
- **Подразделения, Места хранения, Типы приборов.** Справочники с
  архивированием.
- **Настройки.** ФИО оператора, путь к файлу базы, экспорт базы.
- **Модалка «Представьтесь».** Один раз при первом запуске; ФИО пишется в
  `settings`, меняется в настройках. Пока ФИО не введено, операции не
  выполняются — иначе в журнале появятся записи без автора.

## 9. Отчёты

Все строятся по журналу и выгружаются в CSV (UTF-8 с BOM, иначе Excel ломает
кириллицу). `.xlsx` не делается: это лишняя зависимость ради того же результата.

1. **Ведомость приборов на дату** — реестр с фильтрами, для инвентаризации.
2. **На руках у сотрудников** — кто, что, с какого числа, дней просрочки.
3. **Журнал операций за период** — фильтры по типу, прибору, сотруднику,
   подразделению.
4. **График поверок** — истекает через 30/60/90 дней и уже просрочено.
5. **Загрузка подразделений** — числится, выдано, в ремонте.
6. **Паспорт движения прибора** — вся история одного прибора одним документом.

## 10. Границы первой версии

Не входит: роли и вход · импорт из Excel (схема готова, экрана нет) · сканер
штрихкодов и QR · фотографии приборов · уведомления о сроках · печать
свидетельств в PDF · бронирование приборов · работа по сети.

## 11. Готово, когда

- Приложение запускается на чистой машине, создаёт базу, спрашивает ФИО
  оператора и открывает пустой дашборд без демо-данных.
- Прибор заводится через форму, появляется в списке со статусом `AVAILABLE`, и в
  его истории есть запись `CREATE` с ФИО оператора.
- Полный цикл выдача → возврат с повреждением → ремонт → возврат в строй
  проходит через интерфейс, меняет статусы по таблице раздела 5 и оставляет
  четыре записи в журнале.
- Перемещение между подразделениями отражается в карточке и в журнале, статус при
  этом не меняется.
- Поверка с номером свидетельства заносится, срок следующей считается, прибор с
  истекающим сроком попадает в плитку дашборда.
- Все семь блоков дашборда показывают данные из базы; демо-массивов в коде нет.
- Каждый из шести отчётов открывается и выгружается в CSV, который Excel
  открывает без порчи кириллицы.
- Контрактные тесты `repoContract.ts` проходят на обеих реализациях порта;
  переходы состояний покрыты тестами, включая запрещённые.
