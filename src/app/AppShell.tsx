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

const DRAWER_WIDTH = 228

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
      <Box sx={ { px: 2, py: 2.25 } }>
        <Typography variant="h6" component="div" sx={ { letterSpacing: "-0.015em" } }>
          IMS&nbsp;Tool
        </Typography>
        <Typography variant="caption" sx={ { color: "text.secondary" } }>
          Учёт приборов
        </Typography>
      </Box>

      <Box sx={ { overflowY: "auto", flexGrow: 1, px: 1 } }>
        { NAVIGATION.map((section, index) => (
          <Box key={ section.title ?? `section-${ index }` } sx={ { mb: 1 } }>
            { section.title ? (
              <Typography
                variant="caption"
                component="p"
                sx={ { color: "text.secondary", px: 1.5, pt: 1, pb: 0.5 } }
              >
                { section.title }
              </Typography>
            ) : <Divider sx={ { mx: 1.5, mb: 1 } }/> }

            <List dense disablePadding>
              { section.items.map((item) => (
                <ListItemButton
                  key={ item.path }
                  component={ RouterLink }
                  to={ item.path }
                  selected={ current?.path === item.path }
                  onClick={ onNavigate }
                  sx={ { mb: 0.25 } }
                >
                  <ListItemIcon sx={ { minWidth: 32, color: "inherit" } }>{ item.icon }</ListItemIcon>
                  <ListItemText
                    primary={ item.title }
                    slotProps={ { primary: { variant: "body2" } } }
                  />
                </ListItemButton>
              )) }
            </List>
          </Box>
        )) }
      </Box>

      <Divider/>
      <Stack direction="row" sx={ { alignItems: "center", gap: 1, p: 1.5 } }>
        <Box sx={ { minWidth: 0, flexGrow: 1 } }>
          <Typography variant="caption" sx={ { color: "text.secondary", display: "block" } }>
            Оператор
          </Typography>
          <Typography variant="body2" noWrap title={ operatorName ?? "" }>
            { operatorName ?? "не указан" }
          </Typography>
        </Box>
        <ColorModeButton/>
      </Stack>
    </Stack>
  )
}

/**
 * Оболочка приложения.
 *
 * Верхней панели на широком экране нет намеренно: она повторяла бы название
 * раздела, которое и так подсвечено в меню, и съедала бы полосу высоты у
 * таблиц. Заголовок несёт сам экран. На узком экране панель возвращается —
 * там нужна кнопка меню.
 */
export function AppShell() {
  const [open, setOpen] = useState(false)
  const wide = useMediaQuery(useTheme().breakpoints.up("md"))

  return (
    <Box sx={ { display: "flex", minHeight: "100vh" } }>
      <Drawer
        variant={ wide ? "permanent" : "temporary" }
        open={ wide || open }
        onClose={ () => setOpen(false) }
        sx={ {
          width: wide ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            border: "none",
            borderRight: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
          },
        } }
      >
        <SideMenu onNavigate={ wide ? undefined : () => setOpen(false) }/>
      </Drawer>

      <Box sx={ { flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" } }>
        { wide ? null : (
          <AppBar
            position="sticky"
            color="inherit"
            elevation={ 0 }
            sx={ { border: "none", borderBottom: 1, borderColor: "divider" } }
          >
            <Toolbar variant="dense">
              <IconButton edge="start" onClick={ () => setOpen(true) }>
                <MenuIcon/>
              </IconButton>
              <Typography variant="subtitle1" sx={ { ml: 1 } }>IMS Tool</Typography>
            </Toolbar>
          </AppBar>
        ) }

        <Box component="main" sx={ { p: { xs: 2, md: 3 }, flexGrow: 1, maxWidth: 1600 } }>
          <OperatorGate/>
          <Outlet/>
        </Box>
      </Box>
    </Box>
  )
}
