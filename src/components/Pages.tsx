import React, {useMemo} from 'react';
import { DashboardLayout, AppProvider, type Navigation  } from '@toolpad/core';
import {DemoProvider, useDemoRouter,} from "@toolpad/core/internal";
import Dashboard from "../pages/Dashboard.tsx";
import Reports from "../pages/Reports.tsx";
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';


const NAVIGATION: Navigation = [
    {
        kind: 'header',
        title: 'Main items',
    },
    {
        segment: 'dashboard',
        title: 'Dashboard',
        icon: <DashboardIcon />,
    },
    {
        segment: 'reports',
        title: 'Reports',
        icon: <BarChartIcon />,
    },
];

export const routes = {
    DASHBOARD: '/dashboard',
    REPORTS: '/reports',
}

function Pages(props) {
    const { window } = props;
    const router = useDemoRouter(routes.DASHBOARD)

    // Remove this const when copying and pasting into your project.
    const w = window !== undefined ? window() : undefined;

    const page = useMemo(() => {
        const {pathname} = router

        if (pathname === routes.DASHBOARD) {
            return <Dashboard/>
        }

        if (pathname === routes.REPORTS) {
            return <Reports/>
        }

        return <Dashboard/>
    }, [router.pathname])

    return (
        // Remove this provider when copying and pasting into your project.
        <DemoProvider window={w}>
            {/* preview-start */}
            <AppProvider
                router={router}
                navigation={NAVIGATION}
                window={w}
            >
                <DashboardLayout>
                    {page}
                </DashboardLayout>
            </AppProvider>
            {/* preview-end */}
        </DemoProvider>
    );
}

export default Pages;