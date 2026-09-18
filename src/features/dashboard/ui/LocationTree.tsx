import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Typography from "@mui/material/Typography"
import { RichTreeView } from "@mui/x-tree-view/RichTreeView"
import type { TreeViewDefaultItemModelProperties } from "@mui/x-tree-view/models"
import type { DepartmentSummary, LocationSummary } from "../../directories/domain/types"

interface LocationTreeProps {
  readonly departments: readonly DepartmentSummary[]
  readonly locations: readonly LocationSummary[]
}

/**
 * Где что лежит.
 *
 * Подразделение и место хранения — разные вещи и здесь показаны как разные
 * уровни: подразделение это «Лаборатория», место это «Шкаф №4». Места,
 * не принадлежащие никому, — например общий склад — собраны отдельной ветвью.
 */
export function LocationTree({ departments, locations }: LocationTreeProps) {
  /* Число у подразделения — сумма его мест, а не то, что за ним числится.
     В одном дереве должна быть одна величина: здесь это «где приборы лежат
     сейчас». Сколько за подразделением числится, показывает столбчатый график
     рядом, и там это названо своими словами. */
  const items: TreeViewDefaultItemModelProperties[] = departments.map((department) => {
    const own = locations.filter((location) => location.departmentId === department.departmentId)
    const total = own.reduce((sum, location) => sum + location.total, 0)

    return {
      id: department.departmentId,
      label: `${ department.name } — ${ total }`,
      children: own.map((location) => ({
        id: location.locationId,
        label: `${ location.name } — ${ location.total }`,
      })),
    }
  })

  const orphans = locations.filter((location) => location.departmentId === null)
  if (orphans.length > 0) {
    items.push({
      id: "no-department",
      label: `Вне подразделений — ${ orphans.reduce((sum, location) => sum + location.total, 0) }`,
      children: orphans.map((location) => ({
        id: location.locationId,
        label: `${ location.name } — ${ location.total }`,
      })),
    })
  }

  return (
    <Card variant="outlined" sx={ { display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 } }>
      <CardContent>
        <Typography component="h2" variant="subtitle2">Размещение</Typography>
        <RichTreeView
          items={ items }
          sx={ { m: "0 -8px", pb: 1 } }
          defaultExpandedItems={ items.slice(0, 1).map((item) => item.id) }
        />
      </CardContent>
    </Card>
  )
}
