import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useNavigate } from "react-router-dom"
import { MONO, TABULAR } from "../../../app/theme/tokens"
import { useStateColors } from "../../../app/theme/useStateColors"
import { ROUTES } from "../../../app/routes"

interface Item {
  readonly value: number
  readonly title: string
  readonly explain: string
  readonly action: string
  readonly to: string
}

function Entry({ item }: { item: Item }) {
  const navigate = useNavigate()
  const { state } = useStateColors()
  const alarming = item.value > 0

  return (
    <Stack
      direction="row"
      sx={ {
        alignItems: "center", gap: 2, p: 2, flex: 1, minWidth: 0,
        borderLeft: 3,
        borderLeftColor: alarming ? state.signal : "transparent",
      } }
    >
      <Typography
        component="p"
        sx={ {
          fontFamily: MONO,
          fontSize: "1.75rem",
          fontWeight: 500,
          lineHeight: 1,
          ...TABULAR,
          color: alarming ? state.signal : "text.secondary",
        } }
      >
        { item.value }
      </Typography>
      <Box sx={ { minWidth: 0, flexGrow: 1 } }>
        <Typography variant="subtitle2">{ item.title }</Typography>
        <Typography variant="caption" sx={ { color: "text.secondary" } }>{ item.explain }</Typography>
      </Box>
      <Button size="small" variant="outlined" disabled={ !alarming } onClick={ () => navigate(item.to) }>
        { item.action }
      </Button>
    </Stack>
  )
}

/**
 * Полоса «требует действия».
 *
 * Держится отдельно от счётчиков намеренно: это не показание, а работа,
 * которую нужно сделать. Красным горит только то, где число больше нуля, —
 * постоянно красный экран перестаёт быть сигналом.
 *
 * Две просрочки не складываются в одно число: невозврат в срок и истекшая
 * поверка требуют разных действий от разных людей.
 */
export function AttentionStrip({ overdue, verificationDue }: { overdue: number; verificationDue: number }) {
  const items: Item[] = [
    {
      value: overdue,
      title: "Не вернули в срок",
      explain: "Прибор на руках дольше обещанного",
      action: "Кто держит",
      to: `${ ROUTES.instruments }?overdue=1`,
    },
    {
      value: verificationDue,
      title: "Истекает поверка",
      explain: "Срок кончается в ближайший месяц",
      action: "Что поверять",
      to: `${ ROUTES.instruments }?verification=due`,
    },
  ]

  return (
    <Paper sx={ { overflow: "hidden" } }>
      <Stack
        direction={ { xs: "column", sm: "row" } }
        divider={ <Divider orientation="vertical" flexItem sx={ { borderStyle: "solid" } }/> }
      >
        { items.map((item) => <Entry key={ item.title } item={ item }/>) }
      </Stack>
    </Paper>
  )
}
