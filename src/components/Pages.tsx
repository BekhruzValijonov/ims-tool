import { useMemo } from 'react'
import { DashboardLayout, AppProvider, type Navigation } from '@toolpad/core'
import { DemoProvider, useDemoRouter } from "@toolpad/core/internal"
import Dashboard from "../pages/Dashboard.tsx"
import Reports from "../pages/Reports.tsx"
import DashboardIcon from '@mui/icons-material/Dashboard'
import BarChartIcon from '@mui/icons-material/BarChart'

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon/>,
  },
  {
    segment: 'reports',
    title: 'Reports',
    icon: <BarChartIcon/>,
  },
]

export const routes = {
  DASHBOARD: '/dashboard',
  REPORTS: '/reports',
}

function Pages() {
  const router = useDemoRouter(routes.DASHBOARD)

  const page = useMemo(() => {
    const { pathname } = router

    if (pathname === routes.DASHBOARD) {
      return <Dashboard/>
    }

    if (pathname === routes.REPORTS) {
      return <Reports/>
    }

    return <Dashboard/>
  }, [router.pathname])

  return <DemoProvider>
    <AppProvider
      router={ router }
      navigation={ NAVIGATION }
    >
      <DashboardLayout>
        { page }
      </DashboardLayout>
    </AppProvider>
  </DemoProvider>
}

export default Pages
