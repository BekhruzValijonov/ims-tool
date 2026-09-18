import { accentReadability } from "../domain/branding"
import { normalizeHex } from "../domain/color"
import { ACCENTS } from "../domain/presets"
import { TextField } from "../../../ui/Field"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"
import { IconCheck } from "../../../ui/icons"

/** Ниже этого подпись на кнопке перестаёт читаться по требованиям WCAG. */
const MIN_LABEL_CONTRAST = 4.5

interface AccentPickerProps {
  readonly value: string
  onChange(value: string): void
}

export function AccentPicker({ value, onChange }: AccentPickerProps) {
  const readability = accentReadability(value)
  const weak = readability < MIN_LABEL_CONTRAST

  return (
    <Stack gap={ 2 }>
      <Stack row gap={ 1 } wrap>
        { ACCENTS.map((accent) => {
          const active = accent.value.toUpperCase() === value.toUpperCase()
          return (
            <button
              key={ accent.value }
              type="button"
              title={ accent.label }
              aria-label={ accent.label }
              aria-pressed={ active }
              onClick={ () => onChange(accent.value) }
              style={ {
                width: 44, height: 44, display: "grid", placeItems: "center", cursor: "pointer",
                borderRadius: "var(--radius)", backgroundColor: accent.value, color: "#fff",
                border: active ? "2px solid var(--text-primary)" : "1px solid var(--divider)",
                outlineOffset: 3,
              } }
            >
              { active ? <IconCheck size={ 18 }/> : null }
            </button>
          )
        }) }
      </Stack>

      <Stack row gap={ 2 } align="end" wrap>
        {/* Родная палитра системы: у выбора цвета, в отличие от даты, нет
            формата, который зависел бы от языка машины. */}
        <label style={ { display: "flex", flexDirection: "column", gap: 6 } }>
          <Text variant="caption" tone="secondary" style={ { fontWeight: 600 } }>Свой цвет</Text>
          <input
            type="color"
            value={ value }
            onChange={ (event) => onChange(event.target.value.toUpperCase()) }
            style={ {
              width: 56, height: 40, padding: 2, cursor: "pointer",
              border: "1px solid var(--divider)", borderRadius: "var(--radius)",
              backgroundColor: "var(--bg-paper)",
            } }
          />
        </label>

        <TextField
          label="Код цвета"
          value={ value }
          onChange={ (text) => {
            const hex = normalizeHex(text)
            if (hex) onChange(hex)
          } }
          style={ { minWidth: 140 } }
        />
      </Stack>

      <Text variant="caption" tone={ weak ? "inherit" : "secondary" } style={ weak ? { color: "var(--state-alarm)" } : undefined }>
        { weak
          ? `Подпись на кнопке будет читаться плохо: контраст ${ readability.toFixed(1) }:1 при норме 4,5:1. Возьмите тон темнее или светлее.`
          : `Контраст подписи на кнопке — ${ readability.toFixed(1) }:1, с запасом к норме 4,5:1.` }
      </Text>
    </Stack>
  )
}
