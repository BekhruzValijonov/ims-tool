import type { CSSProperties } from "react"

/**
 * Иконки.
 *
 * Свои, а не Iconify: тот подгружает наборы по сети, а приложение работает на
 * заводском ПК, у которого интернета может не быть вовсе. Здесь два десятка
 * штрихованных знаков в одном стиле — этого хватает на все экраны.
 */
interface IconProps {
  readonly size?: number
  readonly className?: string
  readonly style?: CSSProperties
}

function svg(path: React.ReactNode, viewBox = "0 0 24 24") {
  return function Icon({ size = 20, className, style }: IconProps) {
    return (
      <svg
        width={ size }
        height={ size }
        viewBox={ viewBox }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={ className }
        style={ { flexShrink: 0, display: "block", ...style } }
        aria-hidden="true"
      >
        { path }
      </svg>
    )
  }
}

export const IconDashboard = svg(
  <>
    <rect x="3" y="3" width="7" height="8" rx="1.5"/>
    <rect x="14" y="3" width="7" height="5" rx="1.5"/>
    <rect x="14" y="11" width="7" height="10" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
  </>,
)

export const IconInstrument = svg(
  <>
    <rect x="2" y="7" width="20" height="10" rx="2"/>
    <path d="M7 7v3M11 7v4M15 7v3M19 7v4"/>
  </>,
)

export const IconOperations = svg(
  <>
    <path d="M4 8h13l-3-3"/>
    <path d="M20 16H7l3 3"/>
  </>,
)

export const IconEmployees = svg(
  <>
    <circle cx="12" cy="8" r="3.5"/>
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>
  </>,
)

export const IconDepartments = svg(
  <>
    <path d="M3 21h18"/>
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/>
    <path d="M15 21V10h3a2 2 0 0 1 2 2v9"/>
    <path d="M8 7h3M8 11h3M8 15h3"/>
  </>,
)

export const IconLocations = svg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M3 10h18M9 4v16"/>
  </>,
)

export const IconTypes = svg(
  <>
    <path d="M12 3 4.5 9v12h15V9z"/>
    <path d="M9.5 21v-6h5v6"/>
  </>,
)

export const IconReports = svg(
  <>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
  </>,
)

export const IconSettings = svg(
  <>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>
  </>,
)

export const IconSearch = svg(
  <>
    <circle cx="11" cy="11" r="7"/>
    <path d="m20 20-3.5-3.5"/>
  </>,
)

export const IconMenu = svg(<path d="M4 7h16M4 12h16M4 17h16"/>)
export const IconPlus = svg(<path d="M12 5v14M5 12h14"/>)
export const IconClose = svg(<path d="m6 6 12 12M18 6 6 18"/>)
export const IconArrowLeft = svg(<path d="M19 12H5m6-7-7 7 7 7"/>)
export const IconChevronLeft = svg(<path d="m15 5-7 7 7 7"/>)
export const IconChevronRight = svg(<path d="m9 5 7 7-7 7"/>)
export const IconChevronDown = svg(<path d="m6 9 6 6 6-6"/>)
export const IconDownload = svg(
  <>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4"/>
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
  </>,
)
export const IconEdit = svg(
  <>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>
    <path d="m14.5 5.5 4 4"/>
  </>,
)
export const IconCheck = svg(
  <>
    <circle cx="12" cy="12" r="9"/>
    <path d="m8 12 3 3 5-6"/>
  </>,
)
export const IconWrench = svg(
  <path d="M21 4a6 6 0 0 1-8 7.7L5.5 19.2a2.1 2.1 0 0 1-3-3L10 8.8A6 6 0 0 1 17.7 3l-3 3 2.3 2.3 3-3c.3.6.5 1.3.5 1.7z"/>,
)
export const IconPerson = svg(
  <>
    <circle cx="12" cy="8" r="3.5"/>
    <path d="M5 20a7 7 0 0 1 14 0"/>
  </>,
)
export const IconSun = svg(
  <>
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
  </>,
)
export const IconMoon = svg(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>)
export const IconCalendar = svg(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 10h18M8 3v4M16 3v4"/>
  </>,
)
export const IconHelp = svg(
  <>
    <circle cx="12" cy="12" r="9"/>
    <path d="M9.5 9.2a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1v.6"/>
    <path d="M12 16.6h.01"/>
  </>,
)
