import { useState, type FormEvent } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import TextField from "@mui/material/TextField"
import { useAppState } from "./AppContext"

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
    <Dialog open={ operatorName === null } maxWidth="xs" fullWidth>
      <form onSubmit={ submit }>
        <DialogTitle>Представьтесь</DialogTitle>
        <DialogContent>
          <DialogContentText sx={ { mb: 2 } }>
            Каждая операция в журнале подписывается тем, кто её внёс. Введите своё
            полное имя — оно будет подставляться в записи. Изменить его можно в настройках.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Фамилия Имя Отчество"
            value={ draft }
            onChange={ (event) => setDraft(event.target.value) }
            onBlur={ () => setTouched(true) }
            error={ invalid }
            helperText={ invalid ? "Укажите полное имя" : " " }
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" disabled={ trimmed.length < 3 }>
            Продолжить
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
