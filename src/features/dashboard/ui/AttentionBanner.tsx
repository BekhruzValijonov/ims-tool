import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined"
import { useNavigate } from "react-router-dom"
import { MONO, TABULAR } from "../../../app/theme/tokens"
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
    <Stack direction="row" sx={ { alignItems: "center", gap: 2, minWidth: 0 } }>
      <Typography
        component="p"
        sx={ { fontFamily: MONO, fontSize: "2rem", fontWeight: 500, lineHeight: 1, ...TABULAR } }
      >
        { item.value }
      </Typography>
      <Box sx={ { minWidth: 0 } }>
        <Typography variant="subtitle2" sx={ { color: "inherit" } }>{ item.title }</Typography>
        <Button
          size="small"
          onClick={ () => navigate(item.to) }
          sx={ {
            p: 0, minWidth: 0, color: "inherit", textDecoration: "underline",
            textUnderlineOffset: 3, "&:hover": { background: "transparent", opacity: 0.85 },
          } }
        >
          { item.action }
        </Button>
      </Box>
    </Stack>
  )
}

/**
 * Полоса «требует действия».
 *
 * Занимает то же место, где в шаблоне Corona стоит рекламный баннер, но
 * несёт настоящую работу и загорается, только когда есть что предъявить:
 * постоянно красный экран перестаёт быть сигналом. Когда всё в порядке,
 * полоса говорит об этом спокойно — это тоже ответ на вопрос «как дела».
 *
 * Две просрочки не складываются в одно число: невозврат в срок и истёкшая
 * поверка требуют разных действий от разных людей.
 */
export function AttentionBanner({ overdue, verificationDue }: { overdue: number; verificationDue: number }) {
  const calm = overdue === 0 && verificationDue === 0

  if (calm) {
    return (
      <Card sx={ { p: 2.5 } }>
        <Stack direction="row" sx={ { alignItems: "center", gap: 1.5 } }>
          <CheckCircleOutlinedIcon sx={ { color: "primary.main" } }/>
          <Box>
            <Typography variant="subtitle1">Всё в срок</Typography>
            <Typography variant="body2" sx={ { color: "text.secondary" } }>
              Невозвращённых приборов нет, поверки в ближайший месяц не истекают.
            </Typography>
          </Box>
        </Stack>
      </Card>
    )
  }

  return (
    <Card
      sx={ (theme) => ({
        p: 3,
        border: "none",
        color: theme.vars.palette.error.contrastText,
        /* Красный, а не оранжевый: речь о просрочке, а не о предупреждении.
           Градиент — приём самой дизайн-системы, здесь он достаётся
           единственному месту, которое обязано перебивать всё остальное. */
        background: `linear-gradient(135deg, ${ theme.vars.palette.error.main } 0%, ${ theme.vars.palette.error.dark } 100%)`,
      }) }
    >
      <Stack
        direction={ { xs: "column", md: "row" } }
        sx={ { alignItems: { md: "center" }, gap: { xs: 2.5, md: 5 } } }
      >
        <Box sx={ { flexGrow: 1 } }>
          <Typography variant="h5" component="h2" sx={ { color: "inherit" } }>
            Требует действия сегодня
          </Typography>
          <Typography variant="body2" sx={ { color: "inherit", opacity: 0.85, mt: 0.25 } }>
            Приборы, которые не вернули вовремя, и поверки, которые вот-вот кончатся.
          </Typography>
        </Box>

        <Stack direction={ { xs: "column", sm: "row" } } sx={ { gap: { xs: 2, sm: 4 } } }>
          { overdue > 0 ? (
            <Count item={ {
              value: overdue,
              title: "не вернули в срок",
              action: "Кто держит",
              to: `${ ROUTES.instruments }?overdue=1`,
            } }/>
          ) : null }
          { verificationDue > 0 ? (
            <Count item={ {
              value: verificationDue,
              title: "истекает поверка",
              action: "Что поверять",
              to: `${ ROUTES.instruments }?verification=due`,
            } }/>
          ) : null }
        </Stack>
      </Stack>
    </Card>
  )
}
