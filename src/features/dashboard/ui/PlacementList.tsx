import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import type { DepartmentSummary, LocationSummary } from "../../directories/domain/types"
import { MONO, TABULAR } from "../../../app/theme/tokens"

interface PlacementListProps {
  readonly departments: readonly DepartmentSummary[]
  readonly locations: readonly LocationSummary[]
}

function Row({ name, count, lead }: { name: string; count: number; lead?: boolean }) {
  return (
    <Stack
      direction="row"
      sx={ {
        alignItems: "baseline",
        gap: 1,
        py: 0.5,
        pl: lead ? 0 : 2,
        borderTop: lead ? 1 : 0,
        borderColor: "divider",
      } }
    >
      <Typography
        variant="body2"
        noWrap
        sx={ { flexGrow: 1, fontWeight: lead ? 500 : 400, color: lead ? "text.primary" : "text.secondary" } }
      >
        { name }
      </Typography>
      <Typography
        variant="body2"
        sx={ { fontFamily: MONO, ...TABULAR, color: count === 0 ? "text.disabled" : "text.primary" } }
      >
        { count }
      </Typography>
    </Stack>
  )
}

/**
 * Где приборы лежат сейчас.
 *
 * Счёт у подразделения — сумма его мест, то есть фактическое размещение. В
 * одном списке должна быть одна величина; сколько за подразделением числится,
 * показывает соседний график, и там это названо своими словами.
 *
 * Список, а не сворачиваемое дерево: мест на заводе десятки, и все числа
 * должны быть видны сразу, без раскрытия веток.
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
    <Card sx={ { p: 2 } }>
      <Typography variant="h6" component="h2">Где приборы сейчас</Typography>
      <Typography variant="caption" sx={ { color: "text.secondary" } }>
        Подразделение и места хранения в нём
      </Typography>

      <Box sx={ { mt: 1.5, maxHeight: 258, overflowY: "auto" } }>
        { groups.map((group) => (
          <Box key={ group.id }>
            <Row name={ group.name } count={ group.total } lead/>
            { group.places.map((place) => (
              <Row key={ place.locationId } name={ place.name } count={ place.total }/>
            )) }
          </Box>
        )) }
      </Box>
    </Card>
  )
}
