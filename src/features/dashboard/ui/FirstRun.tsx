import { useNavigate } from "react-router-dom"
import { Button } from "../../../ui/Button"
import { Card } from "../../../ui/Card"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { ROUTES } from "../../../app/routes"

const STEPS: readonly { title: string; text: string; label: string; to: string }[] = [
  {
    title: "Подразделения и места хранения",
    text: "Цеха и лаборатории, за которыми числятся приборы, и шкафы, куда они возвращаются.",
    label: "К подразделениям",
    to: ROUTES.departments,
  },
  {
    title: "Типы приборов",
    text: "Тип задаёт, нужна ли поверка и на сколько месяцев она выдаётся.",
    label: "К типам",
    to: ROUTES.instrumentTypes,
  },
  {
    title: "Сотрудники",
    text: "Те, кому предстоит выдавать приборы. Человеку не из списка выдать нельзя.",
    label: "К сотрудникам",
    to: ROUTES.employees,
  },
  {
    title: "Приборы",
    text: "Дальше заводите приборы — журнал и отчёты начнут заполняться сами.",
    label: "Добавить прибор",
    to: `${ ROUTES.instruments }/new`,
  },
]

/**
 * Первый запуск.
 *
 * Показывать нули и пустые графики бессмысленно: человек и так видит, что
 * данных нет, но не знает, с чего начать. Порядок здесь настоящий — каждый
 * следующий шаг опирается на предыдущий, — поэтому шаги и пронумерованы.
 */
export function FirstRun() {
  const navigate = useNavigate()

  return (
    <Card>
      <Text variant="h5" as="h2">В базе пока нет ни одного прибора</Text>
      <Text tone="secondary" style={ { marginTop: 4, maxWidth: 620 } }>
        Дашборд заполнится сам, как только появятся приборы и первые операции.
        Чтобы прибору было где числиться и куда возвращаться, начните со справочников.
      </Text>

      <div style={ { marginTop: 20 } }>
        { STEPS.map((step, index) => (
          <Stack
            key={ step.title }
            row
            align="center"
            gap={ 2 }
            wrap
            style={ { padding: "14px 0", borderTop: "1px dashed var(--divider)" } }
          >
            <Text mono tone="secondary" style={ { width: 24 } }>{ index + 1 }</Text>
            <Stack grow gap={ 0.25 } style={ { minWidth: 220 } }>
              <Text variant="subtitle2">{ step.title }</Text>
              <Text tone="secondary">{ step.text }</Text>
            </Stack>
            <Button
              variant={ index === STEPS.length - 1 ? "contained" : "outlined" }
              onClick={ () => navigate(step.to) }
            >
              { step.label }
            </Button>
          </Stack>
        )) }
      </div>
    </Card>
  )
}
