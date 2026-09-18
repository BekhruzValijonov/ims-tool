import { useId, useState, type ReactNode } from "react"
import styles from "./Accordion.module.css"
import { IconChevronRight } from "./icons"

interface AccordionProps {
  /** Содержимое строки-заголовка: она же кнопка раскрытия. */
  readonly header: ReactNode
  readonly children?: ReactNode
  readonly defaultOpen?: boolean
  /** Раскрывать нечего: строка остаётся, но не нажимается. */
  readonly empty?: boolean
}

/**
 * Раскрывающийся раздел.
 *
 * Сделан на кнопке с `aria-expanded`, а не на `<details>`: тот в Safari до
 * недавнего времени не анимировался и не давал попасть стилями в маркер, а
 * раскладка заголовка здесь своя — слева название, справа число.
 */
export function Accordion({ header, children, defaultOpen, empty }: AccordionProps) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const panelId = useId()

  const chevron = (
    <span
      className={ [styles.chevron, open ? styles.open : null, empty ? styles.hidden : null]
        .filter(Boolean).join(" ") }
    >
      <IconChevronRight size={ 16 }/>
    </span>
  )

  if (empty) {
    return (
      <div className={ styles.item }>
        <div className={ styles.summary }>
          { chevron }
          <span className={ styles.label }>{ header }</span>
        </div>
      </div>
    )
  }

  return (
    <div className={ styles.item }>
      <button
        type="button"
        className={ styles.summary }
        aria-expanded={ open }
        aria-controls={ panelId }
        onClick={ () => setOpen((current) => !current) }
      >
        { chevron }
        <span className={ styles.label }>{ header }</span>
      </button>
      {/* Содержимое остаётся в разметке и в свёрнутом виде — иначе анимировать
          нечего. `inert` убирает его и с пути курсора, и из речи читалки. */}
      <div
        className={ [styles.panel, open ? styles.open : null].filter(Boolean).join(" ") }
        id={ panelId }
        inert={ !open }
      >
        <div className={ styles.panelInner }>{ children }</div>
      </div>
    </div>
  )
}
