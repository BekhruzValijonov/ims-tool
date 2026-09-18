import type { ReactNode } from "react"
import { TourButton } from "../../tour/TourButton"
import type { TourId } from "../../tour/steps"
import { Stack } from "../../ui/layout"
import { Text } from "../../ui/Text"

interface PageHeaderProps {
  readonly title: string
  readonly hint?: string
  readonly actions?: ReactNode
  /** Обход экрана. Кнопка «Как это работает» встаёт первой среди действий. */
  readonly tour?: TourId
}

export function PageHeader({ title, hint, actions, tour }: PageHeaderProps) {
  return (
    <Stack gap={ 0.5 } style={ { marginBottom: 24 } }>
      <Stack row align="baseline" justify="between" gap={ 2 } wrap>
        <Text variant="h4" as="h1">{ title }</Text>
        { tour || actions ? (
          <Stack row gap={ 1 } wrap>
            { tour ? <TourButton tour={ tour }/> : null }
            { actions }
          </Stack>
        ) : null }
      </Stack>
      { hint ? <Text tone="secondary">{ hint }</Text> : null }
    </Stack>
  )
}
