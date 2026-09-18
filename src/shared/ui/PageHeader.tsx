import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { monoSx } from "./dataText"

interface PageHeaderProps {
  readonly title: string
  /** Сколько записей на экране — сразу у заголовка, без отдельной плашки. */
  readonly count?: number
  readonly hint?: string
  readonly actions?: ReactNode
}

/**
 * Заголовок экрана.
 *
 * Линия под ним отделяет постановку задачи от содержимого — это дешевле и
 * тише, чем заворачивать каждый экран в ещё одну карточку.
 */
export function PageHeader({ title, count, hint, actions }: PageHeaderProps) {
  return (
    <Box sx={ { mb: 2.5 } }>
      <Stack
        direction="row"
        sx={ { justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap", mb: 1 } }
      >
        <Stack direction="row" sx={ { alignItems: "baseline", gap: 1.5 } }>
          <Typography variant="h4" component="h1">{ title }</Typography>
          { count === undefined ? null : (
            <Typography variant="body2" sx={ { ...monoSx, color: "text.secondary" } }>
              { count.toLocaleString("ru-RU") }
            </Typography>
          ) }
        </Stack>
        { actions ? <Stack direction="row" sx={ { gap: 1 } }>{ actions }</Stack> : null }
      </Stack>
      { hint ? (
        <Typography variant="body2" sx={ { color: "text.secondary", mb: 1 } }>{ hint }</Typography>
      ) : null }
      <Box sx={ { borderBottom: 1, borderColor: "text.primary" } }/>
    </Box>
  )
}
