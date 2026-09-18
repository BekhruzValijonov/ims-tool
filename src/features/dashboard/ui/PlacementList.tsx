import type { DepartmentSummary, LocationSummary } from "../../directories/domain/types"
import { Card } from "../../../ui/Card"
import { Stack } from "../../../ui/layout"
import { Text } from "../../../ui/Text"

interface PlacementListProps {
  readonly departments: readonly DepartmentSummary[]
  readonly locations: readonly LocationSummary[]
}

function Row({ name, count, lead }: { name: string; count: number; lead?: boolean }) {
  return (
    <Stack
      row
      align="baseline"
      gap={ 1 }
      style={ {
        padding: "8px 0",
        paddingLeft: lead ? 0 : 16,
        borderTop: lead ? "1px dashed var(--divider)" : undefined,
      } }
    >
      <Text
        noWrap
        tone={ lead ? "primary" : "secondary" }
        style={ { flexGrow: 1, fontWeight: lead ? 600 : 400 } }
      >
        { name }
      </Text>
      <Text mono tone={ count === 0 ? "disabled" : "primary" }>{ count }</Text>
    </Stack>
  )
}

/**
 * Где приборы лежат сейчас.
 *
 * Счёт у подразделения — сумма его мест, то есть фактическое размещение. В
 * одном списке должна быть одна величина; сколько за подразделением числится,
 * показывает соседний график, и там это названо своими словами.
 */
export function PlacementList({ departments, locations }: PlacementListProps) {
  const groups = departments.map((department) => {
    const own = locations.filter((location) => location.departmentId === department.departmentId)
    return {
      id: department.departmentId,
      name: department.name,
      total: own.reduce((sum, location) => sum + location.total, 0),
      places: own,
    }
  })

  const orphans = locations.filter((location) => location.departmentId === null)
  if (orphans.length > 0) {
    groups.push({
      id: "no-department",
      name: "Вне подразделений",
      total: orphans.reduce((sum, location) => sum + location.total, 0),
      places: orphans,
    })
  }

  return (
    <Card>
      <Text variant="h6" as="h2">Где приборы сейчас</Text>
      <Text variant="caption" tone="secondary">Подразделение и места хранения в нём</Text>

      {/* Место под полосу прокрутки резервируется всегда: иначе она наезжает
          на числа, выровненные по правому краю, и список дёргается при
          появлении полосы. */}
      <div
        style={ {
          marginTop: 12,
          maxHeight: 268,
          overflowY: "auto",
          scrollbarGutter: "stable",
          paddingRight: 8,
        } }
      >
        { groups.map((group) => (
          <div key={ group.id }>
            <Row name={ group.name } count={ group.total } lead/>
            { group.places.map((place) => (
              <Row key={ place.locationId } name={ place.name } count={ place.total }/>
            )) }
          </div>
        )) }
      </div>
    </Card>
  )
}
