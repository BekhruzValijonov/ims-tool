import { Outlet } from "react-router-dom"
import { AppProvider as ToolpadProvider, type Navigation } from "@toolpad/core/AppProvider"
import { DashboardLayout } from "@toolpad/core/DashboardLayout"
import DashboardIcon from "@mui/icons-material/Dashboard"
import StraightenIcon from "@mui/icons-material/Straighten"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import BadgeIcon from "@mui/icons-material/Badge"
import ApartmentIcon from "@mui/icons-material/Apartment"
import Inventory2Icon from "@mui/icons-material/Inventory2"
import CategoryIcon from "@mui/icons-material/Category"
import BarChartIcon from "@mui/icons-material/BarChart"
import SettingsIcon from "@mui/icons-material/Settings"
import { createAppTheme } from "./theme"
import { useToolpadRouter } from "./useToolpadRouter"
import { OperatorGate } from "./OperatorGate"

const NAVIGATION: Navigation = [
  { kind: "header", title: "Учёт" },
  { segment: "", title: "Дашборд", icon: <DashboardIcon/> },
  { segment: "instruments", title: "Приборы", icon: <StraightenIcon/> },
  { segment: "operations", title: "Операции", icon: <SwapHorizIcon/> },
  { kind: "divider" },
  { kind: "header", title: "Справочники" },
  { segment: "employees", title: "Сотрудники", icon: <BadgeIcon/> },
  { segment: "departments", title: "Подразделения", icon: <ApartmentIcon/> },
  { segment: "locations", title: "Места хранения", icon: <Inventory2Icon/> },
  { segment: "instrument-types", title: "Типы приборов", icon: <CategoryIcon/> },
  { kind: "divider" },
  { segment: "reports", title: "Отчёты", icon: <BarChartIcon/> },
  { segment: "settings", title: "Настройки", icon: <SettingsIcon/> },
]

const theme = createAppTheme()

export function AppShell() {
  const router = useToolpadRouter()

  return (
    <ToolpadProvider
      navigation={ NAVIGATION }
      router={ router }
      theme={ theme }
      branding={ { title: "MAXAM IMS", logo: <span/> } }
    >
      <DashboardLayout>
        <OperatorGate/>
        <Outlet/>
      </DashboardLayout>
    </ToolpadProvider>
  )
}
