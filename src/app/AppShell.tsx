import { useState } from "react"
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import Stack from "@mui/material/Stack"
import Toolbar from "@mui/material/Toolbar"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useColorScheme, useTheme } from "@mui/material/styles"
import MenuIcon from "@mui/icons-material/Menu"
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined"
import LightModeIcon from "@mui/icons-material/LightModeOutlined"
import { NAVIGATION, activeItem } from "./navigation"
import { OperatorGate } from "./OperatorGate"
import { useAppState } from "./AppContext"

const DRAWER_WIDTH = 240

function ColorModeButton() {
  const { mode, setMode } = useColorScheme()
  const dark = mode === "dark"

  return (
    <Tooltip title={ dark ? "Светлая тема" : "Тёмная тема" }>
      <IconButton size="small" onClick={ () => setMode(dark ? "light" : "dark") }>
        { dark ? <LightModeIcon fontSize="small"/> : <DarkModeIcon fontSize="small"/> }
      </IconButton>
    </Tooltip>
  )
}

function SideMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { operatorName } = useAppState()
  const current = activeItem(pathname)

  return (
    <Stack sx={ { height: "100%" } }>
      <Toolbar sx={ { px: 2 } }>
        <Typography variant="h6" component="div" sx={ { fontWeight: 700, letterSpacing: "-0.02em" } }>
          MAXAM IMS
        </Typography>
      </Toolbar>
      <Divider/>

      <Box sx={ { overflowY: "auto", flexGrow: 1, py: 1 } }>
        { NAVIGATION.map((section, index) => (
          <List
            key={ section.title ?? `section-${ index }` }
            dense
            disablePadding
            sx={ { px: 1, pb: 1 } }
            subheader={ section.title ? (
              <ListSubheader
                disableSticky
                sx={ { bgcolor: "transparent", lineHeight: "32px", fontSize: 12 } }
              >
                { section.title }
              </ListSubheader>
            ) : undefined }
          >
            { section.title === null ? <Divider sx={ { mb: 1, mx: 1 } }/> : null }
            { section.items.map((item) => (
              <ListItemButton
                key={ item.path }
                component={ RouterLink }
                to={ item.path }
                selected={ current?.path === item.path }
                onClick={ onNavigate }
                sx={ { borderRadius: 1, mb: 0.25 } }
              >
                <ListItemIcon sx={ { minWidth: 36 } }>{ item.icon }</ListItemIcon>
                <ListItemText primary={ item.title }/>
              </ListItemButton>
            )) }
          </List>
        )) }
      </Box>

      <Divider/>
      <Box sx={ { p: 2 } }>
        <Typography variant="caption" sx={ { color: "text.secondary", display: "block" } }>
          Оператор
        </Typography>
        <Typography variant="body2" noWrap title={ operatorName ?? "" }>
          { operatorName ?? "не указан" }
        </Typography>
      </Box>
    </Stack>
  )
}

/**
 * Оболочка приложения.
 *
 * Своя, а не из @toolpad/core: Toolpad собран под MUI 7 и в паре с MUI 9
 * протекал системными пропами в DOM. Здесь ровно то, что нужно, — боковая
 * панель, шапка и место под экран, — и никакой чужой версии в середине.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const wide = useMediaQuery(useTheme().breakpoints.up("md"))
  const current = activeItem(pathname)

  return (
    <Box sx={ { display: "flex", minHeight: "100vh" } }>
      <Drawer
        variant={ wide ? "permanent" : "temporary" }
        open={ wide || open }
        onClose={ () => setOpen(false) }
        sx={ {
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            backgroundColor: "background.paper",
          },
        } }
      >
        <SideMenu onNavigate={ wide ? undefined : () => setOpen(false) }/>
      </Drawer>

      <Box sx={ { flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" } }>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={ 0 }
          sx={ { borderBottom: 1, borderColor: "divider", backgroundColor: "background.default" } }
        >
          <Toolbar sx={ { gap: 1 } }>
            { wide ? null : (
              <IconButton edge="start" onClick={ () => setOpen(true) }>
                <MenuIcon/>
              </IconButton>
            ) }
            <Typography variant="subtitle1" sx={ { fontWeight: 600, flexGrow: 1 } }>
              { current?.title ?? "MAXAM IMS" }
            </Typography>
            <ColorModeButton/>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={ { p: { xs: 2, md: 3 }, flexGrow: 1 } }>
          <OperatorGate/>
          <Outlet/>
        </Box>
      </Box>
    </Box>
  )
}
