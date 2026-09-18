import { useRepo } from "../app/AppContext"
import { useAsync } from "../shared/useAsync"
import { DirectoryScreen, type FormValues } from "../features/directories/ui/DirectoryScreen"
import type { InstrumentType } from "../features/directories/domain/types"
import { Chip } from "../ui/Chip"
import { Text } from "../ui/Text"
import type { Column } from "../ui/DataTable"

export function InstrumentTypesPage() {
  const repo = useRepo()
  const state = useAsync(() => repo.directories.instrumentTypes(true), [repo])

  const columns: Column<InstrumentType>[] = [
    { key: "name", header: "Тип прибора", minWidth: 220, render: (row) => row.name },
    {
      key: "verification", header: "Поверка", width: 150,
      render: (row) => (row.requiresVerification
        ? <Chip>Требуется</Chip>
        : <Text tone="secondary" as="span">Не требуется</Text>),
    },
    {
      key: "interval", header: "Межповерочный интервал", width: 210, mono: true,
      render: (row) => (row.defaultVerificationIntervalMonths === null
        ? "—"
        : `${ row.defaultVerificationIntervalMonths } мес.`),
    },
    {
      key: "state", header: "Состояние", width: 150,
      render: (row) => (row.isArchived
        ? <Chip>В архиве</Chip>
        : <Text tone="secondary" as="span">Используется</Text>),
    },
  ]

  return (
    <DirectoryScreen<InstrumentType>
      title="Типы приборов"
      addLabel="Добавить тип"
      tour="instrumentTypes"
      hint="Тип решает, нужна ли прибору поверка и на какой срок она выдаётся"
      emptyText="Тип задаёт, нужна ли прибору поверка и на сколько месяцев она выдаётся. Без типов график поверок построить не из чего."
      rows={ state.data ?? [] }
      columns={ columns }
      loading={ state.loading }
      error={ state.error }
      fields={ [
        { kind: "text", key: "name", label: "Название", required: true },
        { kind: "switch", key: "requiresVerification", label: "Подлежит поверке" },
        {
          kind: "number",
          key: "defaultVerificationIntervalMonths",
          label: "Межповерочный интервал, мес.",
          helper: "Подставляется при приёме с поверки",
        },
      ] }
      toForm={ (row) => ({
        name: row.name,
        requiresVerification: row.requiresVerification,
        defaultVerificationIntervalMonths: row.defaultVerificationIntervalMonths === null
          ? ""
          : String(row.defaultVerificationIntervalMonths),
      }) }
      onSave={ async (values: FormValues, id) => {
        const months = String(values.defaultVerificationIntervalMonths).trim()
        const draft = {
          name: String(values.name).trim(),
          requiresVerification: Boolean(values.requiresVerification),
          defaultVerificationIntervalMonths: months === "" ? null : Number(months),
        }
        if (id) await repo.directories.updateInstrumentType(id, draft)
        else await repo.directories.createInstrumentType(draft)
        state.reload()
      } }
      archiveLabel={ { archive: "В архив", restore: "Вернуть" } }
      isArchived={ (row) => row.isArchived }
      onArchive={ async (row, archived) => {
        await repo.directories.archiveInstrumentType(row.id, archived)
        state.reload()
      } }
    />
  )
}
