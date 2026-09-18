import { describe, expect, it, vi } from "vitest"
import { findTarget, startTour, toDriverSteps, TOUR_TEXTS, type TourStep } from "./startTour"

/**
 * Обход рассказывает про то, что на экране. Проверяется главное: шаг без
 * своего элемента пропускается, а не подсвечивает пустоту, и подсказка следует
 * за элементом при прокрутке внутри контейнера — окном приложение не
 * прокручивается вовсе.
 */

const STEPS: readonly TourStep[] = [
  { target: null, title: "Вступление", text: "О чём этот экран" },
  { target: "present", title: "Есть", text: "Этот элемент на месте", side: "bottom" },
  { target: "missing", title: "Нет", text: "Этого элемента на экране нет" },
]

function fakeTour() {
  return {
    drive: vi.fn(),
    refresh: vi.fn(),
    isActive: vi.fn(() => true),
    destroy: vi.fn(),
  }
}

describe("toDriverSteps", () => {
  it("оставляет вступление без элемента", () => {
    const steps = toDriverSteps([STEPS[0]], () => null)

    expect(steps).toHaveLength(1)
    expect(steps[0].element).toBeUndefined()
    expect(steps[0].popover).toMatchObject({ title: "Вступление", description: "О чём этот экран" })
  })

  it("пропускает шаги, которым нечего показать", () => {
    const element = document.createElement("div")
    const steps = toDriverSteps(STEPS, (target) => (target === "present" ? element : null))

    expect(steps.map((step) => step.popover?.title)).toEqual(["Вступление", "Есть"])
    expect(steps[1].element).toBe(element)
    expect(steps[1].popover).toMatchObject({ side: "bottom" })
  })
})

describe("findTarget", () => {
  it("не берёт элемент, которого нет в разметке", () => {
    expect(findTarget("nowhere")).toBeNull()
  })

  it("не берёт элемент без размеров: скрытый блок подсвечивать нечем", () => {
    document.body.innerHTML = `<div data-tour="hidden"></div>`

    // jsdom не считает раскладку, поэтому размеры задаются напрямую.
    const element = document.querySelector('[data-tour="hidden"]')!
    element.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)

    expect(findTarget("hidden")).toBeNull()
  })
})

describe("startTour", () => {
  it("не поднимает обход, когда ни одного элемента не нашлось", () => {
    const createDriver = vi.fn(fakeTour)

    const stop = startTour([STEPS[2]], { createDriver, locate: () => null })

    expect(createDriver).not.toHaveBeenCalled()
    expect(() => stop()).not.toThrow()
  })

  it("запускает обход, когда есть что показать", () => {
    const tour = fakeTour()

    startTour([STEPS[0]], { createDriver: () => tour, locate: () => null })

    expect(tour.drive).toHaveBeenCalled()
  })

  it("передаёт driver.js настройки обхода", () => {
    const createDriver = vi.fn(fakeTour)

    startTour([STEPS[0]], { createDriver, locate: () => null })

    expect(createDriver).toHaveBeenCalledWith(expect.objectContaining({
      nextBtnText: TOUR_TEXTS.next,
      prevBtnText: TOUR_TEXTS.prev,
      doneBtnText: TOUR_TEXTS.done,
      progressText: TOUR_TEXTS.progress,
      disableActiveInteraction: true,
      smoothScroll: false,
      popoverClass: "app-tour",
    }))
  })

  it("следит за прокруткой внутри контейнера и отпускает её при остановке", () => {
    document.body.innerHTML = `<div id="scroller"></div>`
    const scroller = document.getElementById("scroller")!
    const tour = fakeTour()

    const stop = startTour([STEPS[0]], { createDriver: () => tour, locate: () => null })

    /* Событие прокрутки не всплывает: без перехвата на фазе погружения
       подсказка осталась бы висеть там, где элемент только что был. */
    scroller.dispatchEvent(new Event("scroll"))
    expect(tour.refresh).toHaveBeenCalledTimes(1)

    stop()
    scroller.dispatchEvent(new Event("scroll"))
    expect(tour.refresh).toHaveBeenCalledTimes(1)
    expect(tour.destroy).toHaveBeenCalled()
  })
})
