import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

/* Без globals: true testing-library не вешает уборку сам, и разметка
   предыдущего теста остаётся в документе — следующий тест находит по два
   одинаковых заголовка. */
afterEach(cleanup)

/**
 * Чего не хватает jsdom, чтобы отрисовать чарты и разметку MUI.
 *
 * Без ResizeObserver чарты падают на монтировании, без matchMedia — разметка
 * Toolpad. Оба нужны только среде, поведение приложения от них не зависит.
 */
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub, writable: true })
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
