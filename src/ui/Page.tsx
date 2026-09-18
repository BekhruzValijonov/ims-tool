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
 *
 * Ширину ограничивает вложенный ящик: содержимое стоит колонкой по центру
 * рабочей области, а поля слева и справа получаются одинаковыми.
 */
export function Page({ children, fill, maxWidth }: PageProps) {
  return (
    <div className={ fill ? styles.fill : styles.scroll }>
      <div className={ styles.inner } style={ { maxWidth } }>
        { children }
      </div>
    </div>
  )
}
