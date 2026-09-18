import { useEffect, useRef, type FormEvent, type ReactNode } from "react"
import styles from "./Dialog.module.css"
import { lockScroll } from "./scrollLock"
import { Text } from "./Text"

interface DialogProps {
  readonly open: boolean
  readonly title: string
  readonly children: ReactNode
  readonly actions: ReactNode
  /** Не задан — окно нельзя закрыть: так работает окно «Представьтесь». */
  onClose?(): void
  onSubmit?(event: FormEvent): void
  /** Широкое окно — для форм в несколько блоков. */
  readonly wide?: boolean
}

/**
 * Модальное окно.
 *
 * На нативном `<dialog>`: он сам переносит фокус внутрь, запирает его там,
 * закрывается по Esc и рисует затемнение — всё то, ради чего обычно тянут
 * библиотеку.
 */
export function Dialog({ open, title, children, actions, onClose, onSubmit, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  /* Запрет прокрутки ставится раньше показа окна: `showModal()` отматывает
     документ в начало, и снимок положения нужно успеть сделать до него. */
  useEffect(() => (open ? lockScroll() : undefined), [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // Ссылка закреплена локально: обработчики ниже читают её после проверки.
    const element = dialog

    function cancel(event: Event) {
      // Esc закрывает окно только если его вообще разрешено закрывать.
      if (!onClose) event.preventDefault()
      else onClose()
    }

    /* Щелчок мимо окна закрывает его. Нативный <dialog> так не умеет:
       событие приходит на сам элемент, и отличить фон от содержимого можно
       только по координатам — они попадают в прямоугольник окна или нет. */
    function clickOutside(event: MouseEvent) {
      if (!onClose || event.target !== element) return
      const box = element.getBoundingClientRect()
      const inside = event.clientX >= box.left && event.clientX <= box.right
        && event.clientY >= box.top && event.clientY <= box.bottom
      if (!inside) onClose()
    }

    element.addEventListener("cancel", cancel)
    element.addEventListener("click", clickOutside)
    return () => {
      element.removeEventListener("cancel", cancel)
      element.removeEventListener("click", clickOutside)
    }
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
    <dialog ref={ ref } className={ [styles.dialog, wide ? styles.wide : null].filter(Boolean).join(" ") }>
      { onSubmit ? <form onSubmit={ onSubmit }>{ content }</form> : content }
    </dialog>
  )
}
