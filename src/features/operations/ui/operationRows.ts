import type { Instrument } from "../../instruments/domain/types"
import type { InstrumentEvent } from "../domain/types"
import type { Directories } from "../../directories/ui/useDirectories"
import { EVENT_LABELS } from "../domain/labels"

/** Строка журнала, готовая к показу: идентификаторы уже превращены в имена. */
export interface OperationRow {
  readonly id: string
  readonly instrumentId: string
  readonly occurredAt: number
  readonly inventoryNumber: string
  readonly instrumentName: string
  readonly kind: string
  readonly employee: string
  readonly place: string
  readonly operator: string
  readonly note: string
}

export function toOperationRows(
  events: readonly InstrumentEvent[],
  instruments: ReadonlyMap<string, Instrument>,
  directories: Directories,
): OperationRow[] {
  return events.map((event) => {
    const instrument = instruments.get(event.instrumentId)
    const from = directories.locationName(event.fromLocationId)
    const to = directories.locationName(event.toLocationId)

    return {
      id: event.id,
      instrumentId: event.instrumentId,
      occurredAt: event.occurredAt,
      inventoryNumber: instrument?.inventoryNumber ?? "—",
      instrumentName: instrument?.name ?? "Прибор удалён",
      kind: EVENT_LABELS[event.kind],
      employee: directories.employeeName(event.employeeId),
      // Перемещение показывается стрелкой, всё остальное — конечным местом.
      place: event.kind === "TRANSFER" && from !== to ? `${ from } → ${ to }` : to,
      operator: event.operatorName,
      note: event.reason ?? event.note ?? "",
    }
  })
}
