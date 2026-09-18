import { useEffect, useRef, type ReactNode } from "react"
import { useBranding } from "../features/branding/ui/BrandingProvider"
import { BrandingPreview } from "../features/branding/ui/BrandingPreview"
import { AccentPicker } from "../features/branding/ui/AccentPicker"
import { DEFAULT_BRANDING, FONTS, NEUTRALS, RADII } from "../features/branding/domain/presets"
import type { Branding } from "../features/branding/domain/types"
import { PageHeader } from "../shared/ui/PageHeader"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { TextField } from "../ui/Field"
import { Radio } from "../ui/Choice"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"

function Section({ title, hint, "data-tour": tour, children }: {
  title: string
  hint: string
  "data-tour"?: string
  children: ReactNode
}) {
  return (
    <Card data-tour={ tour }>
      <Text variant="h6" as="h2">{ title }</Text>
      <Text variant="caption" tone="secondary">{ hint }</Text>
      <div style={ { marginTop: 16 } }>{ children }</div>
    </Card>
  )
}

/** Три ступени шкалы — по ним видно, какой она даёт фон, линии и текст. */
function Ramp({ scale }: { scale: Readonly<Record<number, string>> }) {
  return (
    <Stack row gap={ 0.5 }>
      { [200, 400, 700].map((step) => (
        <span
          key={ step }
          style={ {
            width: 18, height: 18, borderRadius: 4,
            backgroundColor: scale[step], border: "1px solid var(--divider)",
          } }
        />
      )) }
    </Stack>
  )
}

/**
 * Брендирование.
 *
 * Правка применяется к приложению сразу, а записывается только по «Сохранить»:
 * оформление выбирают глазами, и увидеть его на настоящих экранах надёжнее,
 * чем на картинке. Уход со страницы без сохранения возвращает прежний вид.
 */
export function BrandingPage() {
  const { branding, saved, preview, revert, save } = useBranding()

  const dirty = JSON.stringify(branding) !== JSON.stringify(saved)
  const standard = JSON.stringify(saved) === JSON.stringify(DEFAULT_BRANDING) && !dirty

  /* Черновик не должен пережить страницу: иначе оператор ушёл, а вид остался
     чужим. Возврат вызывается через ссылку, а не зависимостью эффекта: после
     сохранения `revert` меняет тождество, эффект перезапустился бы, и уборка
     откатила бы только что сохранённое. */
  const revertRef = useRef(revert)
  revertRef.current = revert
  useEffect(() => () => revertRef.current(), [])

  function set<K extends keyof Branding>(key: K, value: Branding[K]) {
    preview({ ...branding, [key]: value })
  }

  return (
    <Page maxWidth={ 1180 }>
      <PageHeader
        title="Брендирование"
        hint="Как приложение выглядит на этом предприятии. Правки видно сразу, в базу они попадают по «Сохранить»"
        tour="branding"
        actions={ <>
          <Button onClick={ revert } disabled={ !dirty }>Отменить</Button>
          <Button
            variant="contained" onClick={ () => save(branding) } disabled={ !dirty }
            data-tour="branding-save"
          >
            Сохранить
          </Button>
        </> }
      />

      <Stack row gap={ 2 } wrap align="stretch">
        <Stack gap={ 2 } style={ { flex: "3 1 460px", minWidth: 0 } }>
          <Section
            title="Название"
            hint="Стоит в меню и в заголовке окна. Обычно это название завода или службы"
            data-tour="branding-title"
          >
            <TextField
              label="Подпись приложения"
              value={ branding.title }
              onChange={ (value) => set("title", value.slice(0, 40)) }
              helper="До сорока знаков — длиннее не поместится в меню"
              fullWidth
            />
          </Section>

          <Section
            title="Акцент"
            hint="Цвет кнопок, активного пункта меню, флажков и рамки фокуса"
            data-tour="branding-accent"
          >
            <AccentPicker value={ branding.accent } onChange={ (value) => set("accent", value) }/>
          </Section>

          <Section
            title="Шрифт"
            hint="Все они знают кириллицу и лежат в сборке — сети для них не нужно"
            data-tour="branding-font"
          >
            <Stack gap={ 1.5 }>
              { FONTS.map((font) => (
                <Stack key={ font.id } gap={ 0.25 }>
                  <Radio
                    name="branding-font"
                    checked={ branding.font === font.id }
                    onChange={ () => set("font", font.id) }
                  >
                    <span style={ { fontFamily: font.stack, fontSize: "1rem", fontWeight: 600 } }>
                      { font.label }
                    </span>
                  </Radio>
                  <Text variant="caption" tone="secondary" style={ { paddingLeft: 32 } }>
                    { font.hint }
                  </Text>
                </Stack>
              )) }
            </Stack>
          </Section>

          <Section
            title="Базовые цвета"
            hint="Серая шкала: фон страниц, линии, текст. Светлота ступеней у всех одинаковая"
            data-tour="branding-neutral"
          >
            <Stack gap={ 1.5 }>
              { NEUTRALS.map((neutral) => (
                <Stack key={ neutral.id } gap={ 0.25 }>
                  <Stack row align="center" gap={ 1.5 }>
                    <Radio
                      name="branding-neutral"
                      checked={ branding.neutral === neutral.id }
                      onChange={ () => set("neutral", neutral.id) }
                    >
                      { neutral.label }
                    </Radio>
                    <Ramp scale={ neutral.scale }/>
                  </Stack>
                  <Text variant="caption" tone="secondary" style={ { paddingLeft: 32 } }>
                    { neutral.hint }
                  </Text>
                </Stack>
              )) }
            </Stack>
          </Section>

          <Section
            title="Скругление"
            hint="Углы кнопок, полей и карточек"
            data-tour="branding-radius"
          >
            <Stack gap={ 1.5 }>
              { RADII.map((item) => (
                <Stack key={ item.id } gap={ 0.25 }>
                  <Radio
                    name="branding-radius"
                    checked={ branding.radius === item.id }
                    onChange={ () => set("radius", item.id) }
                  >
                    { item.label }
                  </Radio>
                  <Text variant="caption" tone="secondary" style={ { paddingLeft: 32 } }>
                    { item.hint }
                  </Text>
                </Stack>
              )) }
            </Stack>
          </Section>

          <Stack row gap={ 1 } wrap align="center">
            <Button variant="outlined" onClick={ () => preview(DEFAULT_BRANDING) } disabled={ standard }>
              Вернуть исходное оформление
            </Button>
            <Text variant="caption" tone="secondary">
              { standard ? "Сейчас стоит исходное оформление" : "Сбросит все пять настроек разом" }
            </Text>
          </Stack>
        </Stack>

        <div style={ { flex: "2 1 340px", minWidth: 0 } }>
          <BrandingPreview/>
        </div>
      </Stack>
    </Page>
  )
}
