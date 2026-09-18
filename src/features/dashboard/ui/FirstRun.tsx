import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useNavigate } from "react-router-dom"
import { MONO } from "../../../app/theme/tokens"
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
    <Card sx={ { p: 3 } }>
      <Typography variant="h5" component="h2">В базе пока нет ни одного прибора</Typography>
      <Typography variant="body2" sx={ { color: "text.secondary", mt: 0.5, maxWidth: 620 } }>
        Дашборд заполнится сам, как только появятся приборы и первые операции.
        Чтобы прибору было где числиться и куда возвращаться, начните со справочников.
      </Typography>

      <Stack sx={ { gap: 0, mt: 2.5 } }>
        { STEPS.map((step, index) => (
          <Stack
            key={ step.title }
            direction={ { xs: "column", sm: "row" } }
            sx={ {
              gap: 2,
              alignItems: { sm: "center" },
              py: 1.75,
              borderTop: 1,
              borderColor: "divider",
            } }
          >
            <Typography
              sx={ { fontFamily: MONO, color: "text.secondary", width: 24, flexShrink: 0 } }
            >
              { index + 1 }
            </Typography>
            <Stack sx={ { flexGrow: 1, minWidth: 0 } }>
              <Typography variant="subtitle2">{ step.title }</Typography>
              <Typography variant="body2" sx={ { color: "text.secondary" } }>{ step.text }</Typography>
            </Stack>
            <Button
              size="small"
              variant={ index === STEPS.length - 1 ? "contained" : "outlined" }
              onClick={ () => navigate(step.to) }
              sx={ { flexShrink: 0 } }
            >
              { step.label }
            </Button>
          </Stack>
        )) }
      </Stack>
    </Card>
  )
}
