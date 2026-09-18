import type { ReactNode } from "react"
import styles from "./Page.module.css"

interface PageProps {
  readonly children: ReactNode
  /** Занять всю высоту и отдать прокрутку содержимому — так ведут себя списки. */
  readonly fill?: boolean
  readonly maxWidth?: number
}

/**
 * Оболочка экрана.
 *
 * Определяет, кто прокручивается: страница целиком или её содержимое. У
 * списков прокручивается таблица, поэтому заголовок и кнопки остаются на
 * месте, а не уезжают вверх вместе со строками.
 */
export function Page({ children, fill, maxWidth }: PageProps) {
  return (
    <div
      className={ fill ? styles.fill : styles.scroll }
      /* По этой пометке оболочка узнаёт, что страница прокручена и под шапку
         заехало содержимое: событие прокрутки приходит от самого ящика. */
      data-page-scroll={ fill ? undefined : "" }
      style={ { maxWidth } }
    >
      { children }
    </div>
  )
}
