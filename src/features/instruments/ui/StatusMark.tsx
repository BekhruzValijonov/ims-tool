import type { InstrumentStatus } from "../domain/types"
import { STATUS_LABELS } from "../domain/labels"
import { Chip, type ChipColor } from "../../../ui/Chip"

const TONE: Record<InstrumentStatus, ChipColor> = {
  AVAILABLE: "primary",
  CHECKED_OUT: "info",
  IN_REPAIR: "warning",
  IN_VERIFICATION: "warning",
  WRITTEN_OFF: "default",
}

/**
 * Состояние прибора.
 *
 * Метка с мягкой заливкой — приём дизайн-системы. Цвет несёт тяжесть
 * состояния, слово — причину: ремонт и поверка выглядят одинаково жёлтыми, и
 * различает их подпись.
 */
export function StatusMark({ status }: { status: InstrumentStatus }) {
  return <Chip color={ TONE[status] }>{ STATUS_LABELS[status] }</Chip>
}
