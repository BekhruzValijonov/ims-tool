import { driver, type Config, type DriveStep, type Side } from "driver.js"
import "driver.js/dist/driver.css"
import "./tour.css"

/**
 * Обход экрана «Как это работает».
 *
 * Единственный модуль, который знает про driver.js. Экраны описывают обход
 * простыми шагами, а к какому элементу привязан шаг — говорит атрибут
 * `data-tour`, а не селектор по классу: класс меняется при любой правке
 * вёрстки и молча уносит с собой подсказку.
 */

export interface TourStep {
  /** Значение `data-tour` подсвечиваемого элемента; `null` — вступление по центру экрана. */
  readonly target: string | null
  readonly title: string
  readonly text: string
  readonly side?: Side
}

/** Подписи кнопок обхода: интерфейс русский, значит и обход тоже. */
export const TOUR_TEXTS = Object.freeze({
  next: "Далее",
  prev: "Назад",
  done: "Готово",
  progress: "{{current}} из {{total}}",
})

/**
 * Элемент шага, если его есть что показывать.
 *
 * Элемент годится, только когда он в разметке, занимает место и не убран за
 * край экрана. Так обход сам пропускает пустые таблицы, скрытые блоки и
 * боковое меню, уехавшее за экран на узком окне: подсветка пустоты хуже
 * пропущенного шага.
 */
export function findTarget(target: string): Element | null {
  const element = document.querySelector(`[data-tour="${ target }"]`)
  if (!element) return null
  const { width, height, left, right } = element.getBoundingClientRect()
  const hasSize = width > 0 || height > 0
  const onScreen = right > 0 && left < window.innerWidth
  return hasSize && onScreen ? element : null
}

export function toDriverSteps(
  steps: readonly TourStep[],
  locate: (target: string) => Element | null = findTarget,
): DriveStep[] {
  return steps.flatMap(({ target, title, text, side }) => {
    const popover = { title, description: text, ...(side ? { side } : null) }
    if (target === null) return [{ popover }]
    const element = locate(target)
    return element ? [{ element, popover }] : []
  })
}

/** То, что нужно от driver.js. Узкий тип позволяет проверить настройку без настоящей разметки. */
interface TourHandle {
  drive(): void
  refresh(): void
  isActive(): boolean
  destroy(): void
}

interface StartOptions {
  readonly createDriver?: (config: Config) => TourHandle
  readonly locate?: (target: string) => Element | null
}

/** Запускает обход и возвращает функцию остановки. */
export function startTour(
  steps: readonly TourStep[],
  { createDriver = driver, locate = findTarget }: StartOptions = {},
): () => void {
  const driverSteps = toDriverSteps(steps, locate)
  if (driverSteps.length === 0) return () => {}

  /* Приложение прокручивается внутри своих контейнеров, а не окном, и
     driver.js такую прокрутку не видит. Перехват на фазе погружения ловит
     события, которые не всплывают, и подсказка остаётся у своего элемента. */
  let tour: TourHandle | null = null
  const follow = () => tour?.refresh()
  const unfollow = () => document.removeEventListener("scroll", follow, true)

  tour = createDriver({
    steps: driverSteps,
    showProgress: true,
    progressText: TOUR_TEXTS.progress,
    nextBtnText: TOUR_TEXTS.next,
    prevBtnText: TOUR_TEXTS.prev,
    doneBtnText: TOUR_TEXTS.done,
    allowClose: true,
    allowKeyboardControl: true,
    /* Подсвеченный элемент не нажимается: обход рассказывает, а не выдаёт
       прибор и не списывает его по дороге. */
    disableActiveInteraction: true,
    /* Плавная прокрутка ещё идёт, когда driver.js ставит подсказку, и та
       оказывается поверх элемента. */
    smoothScroll: false,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: "app-tour",
    onDestroyed: unfollow,
  })

  document.addEventListener("scroll", follow, true)
  tour.drive()

  return () => {
    unfollow()
    if (tour && tour.isActive()) tour.destroy()
  }
}
