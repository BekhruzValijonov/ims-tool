import { useState } from "react"
import { useAppState } from "../app/AppContext"
import { VERIFICATION_HORIZON_DAYS } from "../data/settingsKeys"
import { PageHeader } from "../shared/ui/PageHeader"
import { Alert } from "../ui/Alert"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { TextField } from "../ui/Field"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"

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
    <div style={ { maxWidth: 760 } }>
      <PageHeader title="Настройки"/>

      <Stack gap={ 2 }>
        <Card>
          <Text variant="h6" as="h2" style={ { marginBottom: 8 } }>Оператор</Text>
          <Text tone="secondary" style={ { marginBottom: 16 } }>
            Этим именем подписываются новые записи журнала. Уже сделанные записи останутся
            подписанными тем, кто их внёс: смена имени не переписывает прошлое.
          </Text>
          <Stack row gap={ 2 } align="end" wrap>
            <TextField
              label="Фамилия Имя Отчество"
              value={ draft }
              onChange={ (value) => { setDraft(value); setSaved(false) } }
              style={ { minWidth: 320 } }
            />
            <Button
              variant="contained"
              onClick={ save }
              disabled={ draft.trim().length < 3 || draft.trim() === operatorName }
            >
              Сохранить
            </Button>
          </Stack>
          { saved ? <Alert severity="success" className="mb-2">Имя оператора сохранено</Alert> : null }
        </Card>

        <Card>
          <Text variant="h6" as="h2" style={ { marginBottom: 8 } }>Хранилище</Text>
          <Text>{ BACKEND_LABELS[backend] ?? backend }</Text>
          <Text tone="secondary" style={ { marginTop: 16 } }>
            Прибор попадает в список «истекает поверка» за { VERIFICATION_HORIZON_DAYS } дней до конца срока.
          </Text>
        </Card>
      </Stack>
    </div>
  )
}
