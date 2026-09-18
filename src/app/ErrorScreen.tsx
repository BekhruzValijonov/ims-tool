import { isRouteErrorResponse, useRouteError } from "react-router-dom"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"

interface Told {
  readonly title: string
  readonly hint: string
  readonly detail: string | null
}

/* Битый адрес и упавший экран — разные беды: в первом случае чинить нечего,
   надо просто вернуться в приложение. */
function describe(error: unknown): Told {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return {
      title: "Такого раздела нет",
      hint: "Адрес набран с ошибкой или ведёт на страницу, которой больше нет.",
      detail: null,
    }
  }

  const detail = isRouteErrorResponse(error)
    ? `${ error.status } ${ error.statusText }`
    : error instanceof Error ? error.message
      : typeof error === "string" ? error : "Неизвестная ошибка"

  return {
    title: "Экран не открылся",
    hint: "Данные на месте — не открылась сама страница. Перезагрузите приложение; если"
      + " повторится, покажите эту надпись тому, кто занимается программой.",
    detail,
  }
}

/**
 * Что показать, когда экран упал.
 *
 * Без этого роутер выводит свою страницу со стеком вызовов: кладовщику она
 * ничего не говорит, а приложение выглядит сломанным насовсем. Здесь сказано,
 * что делать, и дана кнопка — перезагрузка возвращает приложение в рабочее
 * состояние, потому что данные лежат не в памяти страницы.
 *
 * Текст ошибки оставлен на виду нарочно: без него человек не сможет ничего
 * передать тому, кто будет разбираться.
 */
export function ErrorScreen() {
  const told = describe(useRouteError())

  function toDashboard() {
    window.location.hash = "#/"
    window.location.reload()
  }

  return (
    <Stack align="center" justify="center" style={ { minHeight: "100vh", padding: 24 } }>
      <Card style={ { maxWidth: 560 } }>
        <Text variant="h5" as="h1" style={ { marginBottom: 8 } }>{ told.title }</Text>
        <Text tone="secondary" style={ { marginBottom: told.detail ? 16 : 24 } }>{ told.hint }</Text>

        { told.detail ? (
          <Text
            mono
            style={ {
              display: "block", padding: 12, marginBottom: 24,
              borderRadius: "var(--radius)", backgroundColor: "var(--bg-neutral)",
              color: "var(--state-alarm-ink)", wordBreak: "break-word",
            } }
          >
            { told.detail }
          </Text>
        ) : null }

        <Stack row gap={ 1 } wrap>
          <Button variant="contained" onClick={ toDashboard }>На дашборд</Button>
          { told.detail ? (
            <Button variant="outlined" onClick={ () => window.location.reload() }>
              Перезагрузить
            </Button>
          ) : null }
        </Stack>
      </Card>
    </Stack>
  )
}
