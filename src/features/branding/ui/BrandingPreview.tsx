import { Button } from "../../../ui/Button"
import { Card } from "../../../ui/Card"
import { Chip } from "../../../ui/Chip"
import { TextField } from "../../../ui/Field"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { StatusMark } from "../../instruments/ui/StatusMark"

/**
 * Живой пример.
 *
 * Собран из настоящих компонентов, а не из нарисованной копии: копия рано или
 * поздно отстаёт от интерфейса и начинает обещать не то, что получится.
 */
export function BrandingPreview() {
  return (
    <Card data-tour="branding-preview">
      <Text variant="h6" as="h2" style={ { marginBottom: 4 } }>Как это будет выглядеть</Text>
      <Text variant="caption" tone="secondary">
        Те же кнопки, поля и метки, что и на остальных экранах
      </Text>

      <Stack gap={ 2 } style={ { marginTop: 16 } }>
        <Stack row gap={ 1 } wrap>
          <Button variant="contained">Выдать прибор</Button>
          <Button variant="outlined">Фильтры</Button>
          <Button>Отмена</Button>
        </Stack>

        <TextField label="Инвентарный номер" value="PR-001042" onChange={ () => {} } fullWidth/>

        <Stack gap={ 1 }>
          <Stack row justify="between" align="center" gap={ 2 }
            style={ { padding: "8px 0", borderTop: "1px solid var(--divider)" } }>
            <Text mono>PR-001042</Text>
            <StatusMark status="AVAILABLE"/>
          </Stack>
          <Stack row justify="between" align="center" gap={ 2 }
            style={ { padding: "8px 0", borderTop: "1px solid var(--divider)" } }>
            <Text mono>PR-001043</Text>
            <StatusMark status="CHECKED_OUT"/>
          </Stack>
        </Stack>

        <Stack row gap={ 1 } wrap align="center">
          <Chip color="ink">7</Chip>
          <Chip color="ok">В наличии</Chip>
          <Chip color="wait">На поверке</Chip>
          <Chip color="alarm">Просрочен</Chip>
        </Stack>

        <Text tone="secondary">
          Цвета состояний прибора не меняются: зелёный «на месте», синий «у человека»,
          латунь «вне строя», красный «требует действия» — это язык учёта, одинаковый
          на всех рабочих местах.
        </Text>
      </Stack>
    </Card>
  )
}
