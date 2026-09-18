import { useState, type FormEvent } from "react"
import { useAppState } from "./AppContext"
import { Button } from "../ui/Button"
import { Dialog } from "../ui/Dialog"
import { TextField } from "../ui/Field"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"

/**
 * «Представьтесь» при первом запуске.
 *
 * Учётных записей в приложении нет — есть подпись. Каждая запись журнала
 * хранит ФИО того, кто её внёс, иначе на вопрос «кто выдал прибор Иванову»
 * система ответить не может. Пока ФИО не введено, окно не закрывается: журнал
 * без автора хуже отсутствующего.
 */
export function OperatorGate() {
  const { operatorName, setOperatorName } = useAppState()
  const [draft, setDraft] = useState("")
  const [touched, setTouched] = useState(false)

  const trimmed = draft.trim()
  const invalid = touched && trimmed.length < 3

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (trimmed.length < 3) return
    await setOperatorName(trimmed)
  }

  return (
    <Dialog
      open={ operatorName === null }
      title="Представьтесь"
      onSubmit={ submit }
      actions={
        <Button type="submit" variant="contained" disabled={ trimmed.length < 3 }>
          Продолжить
        </Button>
      }
    >
      <Stack gap={ 2 }>
        <Text tone="secondary">
          Каждая операция в журнале подписывается тем, кто её внёс. Введите своё полное
          имя — оно будет подставляться в записи. Изменить его можно в настройках.
        </Text>
        <TextField
          label="Фамилия Имя Отчество"
          value={ draft }
          onChange={ (value) => { setDraft(value); setTouched(false) } }
          onBlur={ () => setTouched(true) }
          error={ invalid }
          helper={ invalid ? "Укажите полное имя" : undefined }
          autoFocus
          fullWidth
        />
      </Stack>
    </Dialog>
  )
}
