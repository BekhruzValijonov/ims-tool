import type { ReactNode } from "react"
import { Stack } from "../../ui/layout"
import { Text } from "../../ui/Text"

interface EmptyStateProps {
  readonly title: string
  readonly children: ReactNode
  readonly action?: ReactNode
}

/**
 * Пустой экран.
 *
 * «Нет строк» — это тупик: человек видит, что ничего нет, и не понимает, его
 * это вина или так и надо. Пустой экран обязан сказать, почему он пуст и что
 * сделать дальше, поэтому у каждого свой текст: первый запуск и пустая выборка
 * по фильтрам — разные беды с разными действиями.
 */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <Stack align="center" gap={ 1 } style={ { textAlign: "center", padding: "48px 24px" } }>
      <Text variant="subtitle1">{ title }</Text>
      <Text tone="secondary" style={ { maxWidth: 440 } }>{ children }</Text>
      { action ? <div style={ { marginTop: 8 } }>{ action }</div> : null }
    </Stack>
  )
}
