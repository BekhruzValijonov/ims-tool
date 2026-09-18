import { useEffect, useRef, type FormEvent, type ReactNode } from "react"
import styles from "./Dialog.module.css"
import { Text } from "./Text"

interface DialogProps {
  readonly open: boolean
  readonly title: string
  readonly children: ReactNode
  readonly actions: ReactNode
  /** Не задан — окно нельзя закрыть: так работает окно «Представьтесь». */
  onClose?(): void
  onSubmit?(event: FormEvent): void
}

/**
 * Модальное окно.
 *
 * На нативном `<dialog>`: он сам переносит фокус внутрь, запирает его там,
 * закрывается по Esc и рисует затемнение — всё то, ради чего обычно тянут
 * библиотеку.
 */
export function Dialog({ open, title, children, actions, onClose, onSubmit }: DialogProps) {
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
      // Esc закрывает окно только если его вообще разрешено закрывать.
      if (!onClose) event.preventDefault()
      else onClose()
    }

    dialog.addEventListener("cancel", cancel)
    return () => dialog.removeEventListener("cancel", cancel)
  }, [onClose])

  const content = (
    <div className={ styles.inner }>
      <div className={ styles.head }>
        <Text variant="h6" as="h2">{ title }</Text>
      </div>
      <div className={ styles.body }>{ children }</div>
      <div className={ styles.foot }>{ actions }</div>
    </div>
  )

  return (
    <dialog ref={ ref } className={ styles.dialog }>
      { onSubmit ? <form onSubmit={ onSubmit }>{ content }</form> : content }
    </dialog>
  )
}
