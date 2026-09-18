import { useNavigate } from "react-router-dom"
import { Card } from "../../../ui/Card"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { IconCheck } from "../../../ui/icons"
import { ROUTES } from "../../../app/routes"

interface Item {
  readonly value: number
  readonly title: string
  readonly action: string
  readonly to: string
}

function Count({ item }: { item: Item }) {
  const navigate = useNavigate()

  return (
    <Stack row align="center" gap={ 2 }>
      <Text as="p" mono style={ { fontSize: "2rem", fontWeight: 700, lineHeight: 1 } }>
        { item.value }
      </Text>
      <div>
        <Text variant="subtitle2">{ item.title }</Text>
        <button
          type="button"
          onClick={ () => navigate(item.to) }
          style={ {
            padding: 0, border: "none", background: "none", cursor: "pointer",
            color: "inherit", font: "inherit", textDecoration: "underline", textUnderlineOffset: 3,
          } }
        >
          { item.action }
        </button>
      </div>
    </Stack>
  )
}

/**
 * Полоса «требует действия».
 *
 * Загорается, только когда есть что предъявить: постоянно красный экран
 * перестаёт быть сигналом. Когда всё в порядке, полоса говорит об этом
 * спокойно — это тоже ответ на вопрос «как дела».
 *
 * Две просрочки не складываются в одно число: невозврат в срок и истёкшая
 * поверка требуют разных действий от разных людей.
 */
export function AttentionBanner({ overdue, verificationDue }: { overdue: number; verificationDue: number }) {
  if (overdue === 0 && verificationDue === 0) {
    return (
      <Card padding="tight">
        <Stack row align="center" gap={ 1.5 }>
          <span style={ { color: "var(--state-ok)", display: "flex" } }><IconCheck size={ 24 }/></span>
          <div>
            <Text variant="subtitle1">Всё в срок</Text>
            <Text tone="secondary">
              Невозвращённых приборов нет, поверки в ближайший месяц не истекают.
            </Text>
          </div>
        </Stack>
      </Card>
    )
  }

  return (
    <Card
      padding="none"
      style={ {
        padding: 24,
        /* Мягкая заливка, а не сплошная: красный в полную силу на всю ширину
           экрана давит на всё вокруг и спорит с графиками, которые рядом
           показывают те же приборы. Тревогу держат слово и крупные числа, а
           цвет только помечает её, как в остальных сообщениях приложения. */
        color: "var(--state-alarm-ink)",
        backgroundColor: "var(--state-alarm-soft)",
      } }
    >
      <Stack row gap={ 5 } align="center" wrap>
        <Stack grow gap={ 0.5 } style={ { minWidth: 260 } }>
          <Text variant="h5" as="h2">Требует действия сегодня</Text>
          <Text>
            Приборы, которые не вернули вовремя, и поверки, которые вот-вот кончатся.
          </Text>
        </Stack>

        <Stack row gap={ 4 } wrap>
          { overdue > 0 ? (
            <Count item={ {
              value: overdue, title: "не вернули в срок",
              action: "Кто держит", to: `${ ROUTES.instruments }?overdue=1`,
            } }/>
          ) : null }
          { verificationDue > 0 ? (
            <Count item={ {
              value: verificationDue, title: "истекает поверка",
              action: "Что поверять", to: `${ ROUTES.instruments }?verification=due`,
            } }/>
          ) : null }
        </Stack>
      </Stack>
    </Card>
  )
}
