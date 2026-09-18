import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined"
import { useNavigate } from "react-router-dom"
import { MONO, STATE, TABULAR } from "../../../app/theme/tokens"
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
      <Paper sx={ { p: 2.5 } }>
        <Stack direction="row" sx={ { alignItems: "center", gap: 1.5 } }>
          <CheckCircleOutlineIcon sx={ { color: STATE.ok } }/>
          <Box>
            <Typography variant="subtitle1">Всё в срок</Typography>
            <Typography variant="body2" sx={ { color: "text.secondary" } }>
              Невозвращённых приборов нет, поверки в ближайший месяц не истекают.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper
      sx={ {
        p: 3,
        border: "none",
        color: "#ffffff",
        background: `linear-gradient(105deg, ${ STATE.signal } 0%, ${ STATE.wait } 100%)`,
      } }
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
    </Paper>
  )
}
