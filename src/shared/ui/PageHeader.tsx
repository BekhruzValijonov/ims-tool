import type { ReactNode } from "react"
import { Stack } from "../../ui/layout"
import { Text } from "../../ui/Text"

interface PageHeaderProps {
  readonly title: string
  /** Сколько записей на экране — сразу у заголовка, без отдельной плашки. */
  readonly count?: number
  readonly hint?: string
  readonly actions?: ReactNode
}

export function PageHeader({ title, count, hint, actions }: PageHeaderProps) {
  return (
    <Stack gap={ 0.5 } style={ { marginBottom: 24 } }>
      <Stack row align="baseline" justify="between" gap={ 2 } wrap>
        <Stack row align="baseline" gap={ 1.5 }>
          <Text variant="h4" as="h1">{ title }</Text>
          { count === undefined ? null : (
            <Text variant="body2" tone="secondary" mono>{ count.toLocaleString("ru-RU") }</Text>
          ) }
        </Stack>
        { actions ? <Stack row gap={ 1 } wrap>{ actions }</Stack> : null }
      </Stack>
      { hint ? <Text tone="secondary">{ hint }</Text> : null }
    </Stack>
  )
}
