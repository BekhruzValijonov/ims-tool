import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import type { TourId } from "./steps"
import { Button } from "../ui/Button"
import { IconHelp } from "../ui/icons"

/**
 * Кнопка «Как это работает».
 *
 * Обход рассказывает про то, что сейчас на экране, поэтому уход на другую
 * страницу его останавливает: иначе подсветка повисла бы над чужой разметкой,
 * а подсказка говорила бы о кнопке, которой там уже нет.
 *
 * Сам обход — driver.js и тексты всех двенадцати экранов — подгружается по
 * нажатию: открывают его изредка, а весит он больше, чем любой экран.
 */
export function TourButton({ tour }: { tour: TourId }) {
  const stop = useRef<(() => void) | null>(null)
  const shown = useRef(true)
  const { pathname } = useLocation()

  useEffect(() => {
    shown.current = true
    return () => {
      shown.current = false
      stop.current?.()
      stop.current = null
    }
  }, [pathname])

  async function start() {
    stop.current?.()
    const [{ startTour }, { TOURS }] = await Promise.all([import("./startTour"), import("./steps")])
    const running = startTour(TOURS[tour])
    // Пока грузились, со страницы могли уйти — тогда показывать уже нечего.
    if (shown.current) stop.current = running
    else running()
  }

  return (
    /* Подсказка — не действие экрана: она набрана тише кнопок рядом. */
    <Button variant="text" color="inherit" startIcon={ <IconHelp size={ 18 }/> } onClick={ start }>
      Как это работает
    </Button>
  )
}
