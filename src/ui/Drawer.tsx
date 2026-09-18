import { useEffect, useRef, type ReactNode } from "react"
import styles from "./Drawer.module.css"
import { IconButton } from "./Button"
import { Text } from "./Text"
import { IconClose } from "./icons"

interface DrawerProps {
  readonly open: boolean
  readonly title: string
  readonly children: ReactNode
  readonly footer?: ReactNode
  onClose(): void
}

/**
 * Боковая панель у правого края.
 *
 * На нативном `<dialog>`, как и модальное окно: он сам уводит фокус внутрь,
 * запирает его там и закрывается по Esc. Для панели фильтров это важнее
 * анимации — человек открывает её с клавиатуры и ею же закрывает.
 */
export function Drawer({ open, title, children, footer, onClose }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    function cancel(event: Event) {
      event.preventDefault()
      onClose()
    }

    dialog.addEventListener("cancel", cancel)
    return () => dialog.removeEventListener("cancel", cancel)
  }, [onClose])

  return (
    <dialog ref={ ref } className={ styles.drawer }>
      <div className={ styles.inner }>
        <div className={ styles.head }>
          <Text variant="h6" as="h2">{ title }</Text>
          <IconButton label="Закрыть" onClick={ onClose }><IconClose size={ 18 }/></IconButton>
        </div>
        <div className={ styles.body }>{ children }</div>
        { footer ? <div className={ styles.foot }>{ footer }</div> : null }
      </div>
    </dialog>
  )
}
