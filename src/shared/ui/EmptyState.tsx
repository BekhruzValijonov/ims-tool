import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"

interface EmptyStateProps {
  readonly title: string
  readonly children: ReactNode
  readonly action?: ReactNode
}

/**
 * Пустой экран.
 *
 * «Нет строк» — это тупик: человек видит, что ничего нет, и не понимает, его
 * это вина или так и надо. Пустой экран обязан сказать, почему он пуст и что
 * сделать дальше, поэтому у каждого свой текст: первый запуск и пустая выборка
 * по фильтрам — разные беды с разными действиями.
 */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <Stack sx={ { alignItems: "center", textAlign: "center", gap: 1, px: 3, py: 4 } }>
      <Typography variant="subtitle1">{ title }</Typography>
      <Typography variant="body2" sx={ { color: "text.secondary", maxWidth: 440 } }>
        { children }
      </Typography>
      { action ? <Box sx={ { mt: 1 } }>{ action }</Box> : null }
    </Stack>
  )
}

/** Обёртка для слота noRowsOverlay у таблицы: он растягивается на всю высоту. */
export function emptyOverlay(node: ReactNode) {
  return function NoRows() {
    return (
      <Box sx={ { display: "grid", placeItems: "center", height: "100%", pointerEvents: "auto" } }>
        { node }
      </Box>
    )
  }
}
