import { useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { useAppState } from "../app/AppContext"
import { VERIFICATION_HORIZON_DAYS } from "../data/settingsKeys"
import { PageHeader } from "../shared/ui/PageHeader"

const BACKEND_LABELS: Record<string, string> = {
  sqlite: "Файл SQLite в каталоге данных приложения",
  memory: "Оперативная память (режим разработки в браузере) — данные исчезнут при перезагрузке",
}

export function SettingsPage() {
  const { operatorName, setOperatorName, backend } = useAppState()
  const [draft, setDraft] = useState(operatorName ?? "")
  const [saved, setSaved] = useState(false)

  async function save() {
    await setOperatorName(draft.trim())
    setSaved(true)
  }

  return (
    <Box sx={ { maxWidth: 760 } }>
      <PageHeader title="Настройки"/>

      <Card sx={ { p: 2, mb: 2 } }>
          <Typography variant="h6" component="h2" sx={ { mb: 1 } }>Оператор</Typography>
          <Typography variant="body2" sx={ { color: "text.secondary", mb: 2 } }>
            Этим именем подписываются новые записи журнала. Уже сделанные записи останутся
            подписанными тем, кто их внёс: смена имени не переписывает прошлое.
          </Typography>
          <Stack direction="row" sx={ { gap: 2, alignItems: "flex-start", flexWrap: "wrap" } }>
            <TextField
              size="small" label="Фамилия Имя Отчество" sx={ { minWidth: 320 } }
              value={ draft }
              onChange={ (event) => { setDraft(event.target.value); setSaved(false) } }
            />
            <Button
              variant="contained" size="medium"
              onClick={ save }
              disabled={ draft.trim().length < 3 || draft.trim() === operatorName }
            >
              Сохранить
            </Button>
          </Stack>
          { saved ? <Alert severity="success" sx={ { mt: 2 } }>Имя оператора сохранено</Alert> : null }
      </Card>

      <Card sx={ { p: 2 } }>
          <Typography variant="h6" component="h2" sx={ { mb: 1 } }>Хранилище</Typography>
          <Typography variant="body2">{ BACKEND_LABELS[backend] ?? backend }</Typography>
          <Typography variant="body2" sx={ { color: "text.secondary", mt: 2 } }>
            Прибор попадает в список «истекает поверка» за { VERIFICATION_HORIZON_DAYS } дней до конца срока.
          </Typography>
      </Card>
    </Box>
  )
}
