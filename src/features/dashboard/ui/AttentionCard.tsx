import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Divider from "@mui/material/Divider"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "../../../app/routes"

interface AttentionCardProps {
  readonly overdue: number
  readonly verificationDue: number
}

/**
 * Два числа, ради которых на дашборд смотрят.
 *
 * Держатся отдельно от плиток намеренно: «просрочено» здесь — это невозврат в
 * срок, а «истекает поверка» — совсем другая просрочка. Одной плиткой их
 * показывать нельзя, сложить их в одно число — тем более.
 */
export function AttentionCard({ overdue, verificationDue }: AttentionCardProps) {
  const navigate = useNavigate()

  return (
    <Card variant="outlined" sx={ { height: "100%", display: "flex", flexDirection: "column" } }>
      <CardContent sx={ { flexGrow: 1 } }>
        <Typography component="h2" variant="subtitle2" gutterBottom>Требует внимания</Typography>

        <Stack sx={ { gap: 0.5, mb: 1.5 } }>
          <Typography variant="h4" component="p" color={ overdue > 0 ? "error.main" : "text.primary" }>
            { overdue }
          </Typography>
          <Typography variant="caption" sx={ { color: "text.secondary" } }>
            не вернули в срок
          </Typography>
        </Stack>

        <Divider sx={ { mb: 1.5 } }/>

        <Stack sx={ { gap: 0.5 } }>
          <Typography variant="h4" component="p" color={ verificationDue > 0 ? "warning.main" : "text.primary" }>
            { verificationDue }
          </Typography>
          <Typography variant="caption" sx={ { color: "text.secondary" } }>
            истекает поверка в ближайший месяц
          </Typography>
        </Stack>
      </CardContent>

      <Stack direction="row" sx={ { gap: 1, p: 2, pt: 0, flexWrap: "wrap" } }>
        <Button
          size="small"
          variant="contained"
          endIcon={ <ChevronRightRoundedIcon/> }
          onClick={ () => navigate(`${ ROUTES.instruments }?overdue=1`) }
        >
          Должники
        </Button>
        <Button
          size="small"
          variant="outlined"
          endIcon={ <ChevronRightRoundedIcon/> }
          onClick={ () => navigate(`${ ROUTES.instruments }?verification=due`) }
        >
          Поверки
        </Button>
      </Stack>
    </Card>
  )
}
