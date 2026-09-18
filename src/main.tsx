import React from "react"
import ReactDOM from "react-dom/client"
import { StyledEngineProvider } from "@mui/material/styles"
import App from "./App"

/* IBM Plex: инженерный характер, полная кириллица. Sans — для языка,
   Mono — для данных: инвентарных номеров, дат и чисел в колонках. */
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/500.css"
import "@fontsource/ibm-plex-sans/600.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <App/>
    </StyledEngineProvider>
  </React.StrictMode>,
)
