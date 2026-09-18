import React from "react"
import ReactDOM from "react-dom/client"
import { StyledEngineProvider } from "@mui/material/styles"
import App from "./App"

/* Шрифты дизайн-системы Minimal: DM Sans для интерфейса, Barlow для крупных
   заголовков. Plex Mono остаётся для данных — инвентарных номеров, серийников
   и дат в колонках. */
import "@fontsource-variable/dm-sans"
import "@fontsource/barlow/600.css"
import "@fontsource/barlow/700.css"
import "@fontsource/barlow/800.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <App/>
    </StyledEngineProvider>
  </React.StrictMode>,
)
