import type { Branding, FontId, NeutralId, Option, RadiusId } from "./types"

/**
 * Готовые наборы.
 *
 * Цвета состояний прибора среди них нет намеренно: зелёный «на месте», синий
 * «у человека», латунь «вне строя» и красный «требует действия» — это язык
 * учёта, а не оформление. Если его перекрасить под вкус, экраны перестанут
 * читаться одинаково у всех, а цвет перестанет что-либо означать.
 */

export const FONTS: readonly (Option<FontId> & { stack: string })[] = [
  {
    id: "plex",
    label: "IBM Plex Sans",
    hint: "Пара к моноширинному Plex, которым набраны номера и даты",
    stack: "'IBM Plex Sans Variable', system-ui, sans-serif",
  },
  {
    id: "inter",
    label: "Inter",
    hint: "Нейтральный шрифт интерфейсов, хорошо читается мелким кеглем",
    stack: "'Inter Variable', system-ui, sans-serif",
  },
  {
    id: "golos",
    label: "Golos Text",
    hint: "Нарисован под русский текст: широкие овалы, спокойные прописные",
    stack: "'Golos Text Variable', system-ui, sans-serif",
  },
  {
    id: "system",
    label: "Системный",
    hint: "Шрифт операционной системы — ничего не загружается",
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
]

/** Серая шкала: поверхности, текст, линии. Светлота ступеней у всех одна. */
export const NEUTRALS: readonly (Option<NeutralId> & {
  readonly scale: Readonly<Record<number, string>>
  readonly rgb500: string
  readonly darkNeutral: string
})[] = [
  {
    id: "steel",
    label: "Сталь",
    hint: "Холодный синеватый серый дизайн-системы",
    scale: {
      50: "#FCFDFD", 100: "#F9FAFB", 200: "#F4F6F8", 300: "#DFE3E8", 400: "#C4CDD5",
      500: "#919EAB", 600: "#637381", 700: "#454F5B", 800: "#1C252E", 900: "#141A21",
    },
    rgb500: "145, 158, 171",
    darkNeutral: "#28323D",
  },
  {
    id: "graphite",
    label: "Графит",
    hint: "Без оттенка: чистый серый, ничего не подкрашивает",
    scale: {
      50: "#FCFCFD", 100: "#FAFAFA", 200: "#F6F6F6", 300: "#E2E3E5", 400: "#CACCCF",
      500: "#999CA3", 600: "#6C7078", 700: "#4C4F54", 800: "#232427", 900: "#191A1C",
    },
    rgb500: "153, 156, 163",
    darkNeutral: "#323337",
  },
  {
    id: "sand",
    label: "Песок",
    hint: "Тёплый серый: бумага, а не металл",
    scale: {
      50: "#FDFDFC", 100: "#FBFAF9", 200: "#F7F6F5", 300: "#E8E4DF", 400: "#D5CEC4",
      500: "#AEA08E", 600: "#847460", 700: "#5D5243", 800: "#2B261F", 900: "#1F1B16",
    },
    rgb500: "174, 160, 142",
    darkNeutral: "#3D352C",
  },
]

export const RADII: readonly (Option<RadiusId> & { control: number; card: number })[] = [
  { id: "compact", label: "Строгое", hint: "4 и 10 пикселей — почти прямые углы", control: 4, card: 10 },
  { id: "normal", label: "Обычное", hint: "8 и 16 пикселей — как в дизайн-системе", control: 8, card: 16 },
  { id: "soft", label: "Мягкое", hint: "12 и 24 пикселя — округлые карточки", control: 12, card: 24 },
]

/** Оттенки, которые не спорят с цветами состояний прибора. */
export const ACCENTS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "#1B222B", label: "Графит" },
  { value: "#1F4E79", label: "Чертёжный" },
  { value: "#3D3B8E", label: "Индиго" },
  { value: "#6D3D8E", label: "Слива" },
  { value: "#0E6F7A", label: "Бирюза" },
  { value: "#4A4A2E", label: "Хаки" },
]

export const DEFAULT_BRANDING: Branding = {
  title: "IMS Tool",
  accent: "#1B222B",
  font: "plex",
  neutral: "steel",
  radius: "normal",
}

export function fontOf(id: FontId) {
  return FONTS.find((item) => item.id === id) ?? FONTS[0]
}

export function neutralOf(id: NeutralId) {
  return NEUTRALS.find((item) => item.id === id) ?? NEUTRALS[0]
}

export function radiusOf(id: RadiusId) {
  return RADII.find((item) => item.id === id) ?? RADII[1]
}
