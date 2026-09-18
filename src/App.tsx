import { RouterProvider } from "react-router-dom"
import CssBaseline from "@mui/material/CssBaseline"
import { AppProvider } from "./app/AppContext"
import { router } from "./app/router"

import "./App.css"

export default function App() {
  return (
    <AppProvider>
      <CssBaseline enableColorScheme/>
      <RouterProvider router={ router }/>
    </AppProvider>
  )
}
