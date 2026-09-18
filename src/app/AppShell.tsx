import { useEffect, useState, type FormEvent } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import styles from "./AppShell.module.css"
import { NAVIGATION, activeItem } from "./navigation"
import { OperatorGate } from "./OperatorGate"
import { useAppState } from "./AppContext"
import { useThemeMode } from "./ThemeMode"
import { ROUTES } from "./routes"
import { IconButton } from "../ui/Button"
import { TextField } from "../ui/Field"
import { Stack } from "../ui/layout"
import { Text } from "../ui/Text"
import { IconMenu, IconMoon, IconSearch, IconSun } from "../ui/icons"

/** Инициалы для значка профиля: аватарок в заводском учёте взять неоткуда. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

function SideMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { operatorName } = useAppState()
  const current = activeItem(pathname)

  return (
    <>
      <div className={ styles.brandRow }>
        <span className={ styles.brand }>IMS&nbsp;Tool</span>
      </div>

      <nav className={ styles.nav } data-tour="app-nav">
        { NAVIGATION.map((section) => (
          <div key={ section.title }>
            <p className={ styles.groupLabel }>{ section.title }</p>
            { section.items.map((item) => (
              <Link
                key={ item.path }
                to={ item.path }
                onClick={ onNavigate }
                className={ [styles.item, current?.path === item.path ? styles.active : null]
                  .filter(Boolean).join(" ") }
                aria-current={ current?.path === item.path ? "page" : undefined }
              >
                { item.icon }
                { item.title }
              </Link>
            )) }
          </div>
        )) }
      </nav>

      <div className={ styles.operator }>
        <span className={ styles.avatar }>{ initials(operatorName ?? "") }</span>
        <div style={ { minWidth: 0 } }>
          <Text variant="subtitle2" noWrap title={ operatorName ?? "" }>
            { operatorName ?? "не указан" }
          </Text>
          <Text variant="caption" tone="secondary">Оператор</Text>
        </div>
      </div>
    </>
  )
}

function QuickSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    const query = text.trim()
    if (!query) return
    navigate(`${ ROUTES.instruments }?q=${ encodeURIComponent(query) }`)
  }

  return (
    <form onSubmit={ submit } className={ styles.search } data-tour="app-search">
      <TextField
        value={ text }
        onChange={ setText }
        placeholder="Найти прибор по номеру или названию"
        startIcon={ <IconSearch size={ 18 }/> }
        fullWidth
      />
    </form>
  )
}

/**
 * Уехало ли содержимое под шапку.
 *
 * Прокручивается не окно, а ящик страницы, и событие прокрутки не всплывает —
 * его ловят на фазе погружения. Смотрят только на страницу: таблица со своей
 * прокруткой живёт ниже шапки, и заезжать под неё ей нечем.
 */
function useScrolledUnderHeader(): boolean {
  const [offset, setOffset] = useState(false)
  const { pathname } = useLocation()

  // Новый экран открывается с начала, а своего события прокрутки не подаёт.
  useEffect(() => setOffset(false), [pathname])

  useEffect(() => {
    function onScroll(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLElement) || target.dataset.pageScroll === undefined) return
      setOffset(target.scrollTop > 0)
    }

    document.addEventListener("scroll", onScroll, true)
    return () => document.removeEventListener("scroll", onScroll, true)
  }, [])

  return offset
}

/**
 * Оболочка приложения.
 *
 * Разметка дизайн-системы Minimal: светлая боковая панель с тонкой границей,
 * прозрачная шапка с размытием, блок оператора на мягкой подложке. Цвета в
 * обвязке нет: цвет на экранах означает состояние прибора, а пункт меню
 * состоянием не является. Шапка не декоративная — в ней то, что кладовщик
 * делает чаще всего: поиск прибора по инвентарному номеру.
 */
export function AppShell() {
  const [open, setOpen] = useState(false)
  const { mode, toggle } = useThemeMode()
  const dark = mode === "dark"
  const scrolled = useScrolledUnderHeader()

  return (
    <div className={ styles.shell }>
      <aside className={ [styles.sidebar, open ? styles.open : null].filter(Boolean).join(" ") }>
        <SideMenu onNavigate={ () => setOpen(false) }/>
      </aside>

      { open ? (
        <button
          type="button"
          className={ styles.backdrop }
          aria-label="Закрыть меню"
          onClick={ () => setOpen(false) }
        />
      ) : null }

      <div className={ styles.body }>
        <header className={ [styles.header, scrolled ? styles.offset : null].filter(Boolean).join(" ") }>
          <div style={ { display: "contents" } }>
            <span className="only-narrow">
              <IconButton label="Меню" onClick={ () => setOpen(true) }>
                <IconMenu/>
              </IconButton>
            </span>
          </div>
          <QuickSearch/>
          <Stack row grow/>
          <IconButton label={ dark ? "Светлая тема" : "Тёмная тема" } onClick={ toggle }>
            { dark ? <IconSun/> : <IconMoon/> }
          </IconButton>
        </header>

        <main className={ styles.main }>
          <OperatorGate/>
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
