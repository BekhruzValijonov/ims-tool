import type { InstrumentStatus } from "../domain/types"
import { STATUS_LABELS } from "../domain/labels"

const TONE: Record<InstrumentStatus, string> = {
  AVAILABLE: "var(--state-ok)",
  CHECKED_OUT: "var(--state-work)",
  IN_REPAIR: "var(--state-wait)",
  IN_VERIFICATION: "var(--state-wait)",
  WRITTEN_OFF: "var(--state-gone)",
}

/**
 * Состояние прибора.
 *
 * Точка и слово, а не залитая метка. В списке из двадцати пяти строк заливка
 * складывается в цветной столбец — он заметнее самих данных, хотя говорит
 * ровно то же. Точка несёт тот же цвет минимумом краски.
 *
 * Цвет несёт тяжесть состояния, слово — причину: ремонт и поверка помечены
 * одинаковой латунью, и различает их подпись.
 */
export function StatusMark({ status }: { status: InstrumentStatus }) {
  return (
    <span style={ { display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" } }>
      <span
        style={ {
          width: 8, height: 8, flexShrink: 0, borderRadius: "50%",
          backgroundColor: TONE[status],
        } }
      />
      <span style={ status === "WRITTEN_OFF" ? { color: "var(--text-secondary)" } : undefined }>
        { STATUS_LABELS[status] }
      </span>
    </span>
  )
}
