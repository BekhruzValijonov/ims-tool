import React from "react"
import ReactDOM from "react-dom/client"
import { StyledEngineProvider } from "@mui/material/styles"
import App from "./App"

/* Rubik — шрифт шаблона Corona, с полной кириллицей. Plex Mono остаётся для
   данных: инвентарных номеров, серийников и дат в колонках. */
import "@fontsource/rubik/300.css"
import "@fontsource/rubik/400.css"
import "@fontsource/rubik/500.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <App/>
    </StyledEngineProvider>
  </React.StrictMode>,
)
