import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react"
import { useRepo } from "../../../app/AppContext"
import { BRANDING_KEY } from "../../../data/settingsKeys"
import { brandingCss, parseBranding, serializeBranding } from "../domain/branding"
import { DEFAULT_BRANDING } from "../domain/presets"
import type { Branding } from "../domain/types"

interface BrandingState {
  /** Что сейчас на экране: либо сохранённое, либо черновик со страницы. */
  readonly branding: Branding
  /** Что записано в базе. Отличие от `branding` и означает несохранённую правку. */
  readonly saved: Branding
  preview(value: Branding): void
  revert(): void
  save(value: Branding): Promise<void>
}

const Context = createContext<BrandingState | null>(null)

const STYLE_ID = "branding-tokens"

/** Одна таблица стилей на всё приложение: правила переписываются, а не копятся. */
function applyCss(css: string) {
  if (typeof document === "undefined") return
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ID
    document.head.append(style)
  }
  style.textContent = css
}

/**
 * Оформление, выбранное в «Брендировании».
 *
 * Значения уходят переменными CSS в отдельный тег `<style>`, а не свойствами на
 * элементе: у тёмной схемы свои значения акцента, и записать их разом в
 * `style="..."` нельзя — там нет места для второго селектора.
 *
 * Настройка живёт в базе приложения, а не в localStorage: это оформление
 * учётной системы предприятия, оно должно пережить чистку браузера и переезд
 * профиля.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const repo = useRepo()
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  const [saved, setSaved] = useState<Branding>(DEFAULT_BRANDING)

  useEffect(() => {
    let cancelled = false
    repo.settings.get(BRANDING_KEY).then((raw) => {
      if (cancelled) return
      const stored = parseBranding(raw)
      setBranding(stored)
      setSaved(stored)
    })
    return () => { cancelled = true }
  }, [repo])

  useEffect(() => applyCss(brandingCss(branding)), [branding])

  const save = useCallback(async (value: Branding) => {
    setBranding(value)
    await repo.settings.set(BRANDING_KEY, serializeBranding(value))
    setSaved(value)
  }, [repo])

  const revert = useCallback(() => setBranding(saved), [saved])

  const value = useMemo<BrandingState>(
    () => ({ branding, saved, preview: setBranding, revert, save }),
    [branding, saved, revert, save],
  )

  return <Context.Provider value={ value }>{ children }</Context.Provider>
}

export function useBranding(): BrandingState {
  const state = useContext(Context)
  if (!state) throw new Error("useBranding вызван вне BrandingProvider")
  return state
}
