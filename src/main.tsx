import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

/*
 * Шрифты интерфейса — те, из которых можно выбрать в «Брендировании». Все три
 * знают кириллицу: DM Sans и Barlow из дизайн-системы её не знают вовсе, и
 * русский текст у них доставался подставному системному шрифту, то есть
 * типографика приложения на его же языке не работала.
 *
 * Объявляются все, а качается только выбранный: браузер берёт файл шрифта,
 * лишь когда им что-то набрано.
 */
import "@fontsource-variable/ibm-plex-sans"
import "@fontsource-variable/inter"
import "@fontsource-variable/golos-text"

/* Моноширинный — для данных: инвентарных номеров, серийников и дат в колонках. */
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"

import "./ui/tokens.css"
import "./ui/base.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
)
