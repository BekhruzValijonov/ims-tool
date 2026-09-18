import type { DepartmentSummary, LocationSummary } from "../../directories/domain/types"
import { Accordion } from "../../../ui/Accordion"
import { Card } from "../../../ui/Card"
import { Text } from "../../../ui/Text"

interface PlacementListProps {
  readonly departments: readonly DepartmentSummary[]
  readonly locations: readonly LocationSummary[]
}

/** Название слева, число справа — одна разметка у подразделения и у места. */
function Line({ name, count, lead }: { name: string; count: number; lead?: boolean }) {
  return (
    <>
      <Text
        noWrap
        tone={ lead ? "primary" : "secondary" }
        style={ { flexGrow: 1, fontWeight: lead ? 600 : 400 } }
      >
        { name }
      </Text>
      <Text mono tone={ count === 0 ? "disabled" : "primary" }>{ count }</Text>
    </>
  )
}

/**
 * Где приборы лежат сейчас.
 *
 * Счёт у подразделения — сумма его мест, то есть фактическое размещение. В
 * одном списке должна быть одна величина; сколько за подразделением числится,
 * показывает соседний график, и там это названо своими словами.
 *
 * Подразделения свёрнуты: на заводе их с десяток, а мест втрое больше, и
 * развёрнутый список не помещался в карточку — приходилось листать его
 * внутренней полосой прокрутки, которая лезла на числа у правого края.
 * Свёрнутый список отвечает на вопрос «в каком цехе искать», раскрытый — «в
 * каком шкафу».
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
      <Text variant="caption" tone="secondary">Подразделение, внутри — его места хранения</Text>

      <div style={ { marginTop: 12 } }>
        { groups.map((group) => (
          <Accordion
            key={ group.id }
            empty={ group.places.length === 0 }
            header={ <Line name={ group.name } count={ group.total } lead/> }
          >
            { group.places.map((place) => (
              <div
                key={ place.locationId }
                /* Отступ вложенной строки равен значку и его зазору: названия встают в колонку. */
                style={ { display: "flex", alignItems: "baseline", gap: 8, padding: "6px 8px 6px 32px" } }
              >
                <Line name={ place.name } count={ place.total }/>
              </div>
            )) }
          </Accordion>
        )) }
      </div>
    </Card>
  )
}
