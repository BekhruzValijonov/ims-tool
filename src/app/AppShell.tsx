import { useState, type FormEvent } from "react"
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Toolbar from "@mui/material/Toolbar"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useColorScheme, useTheme } from "@mui/material/styles"
import { varAlpha } from "minimal-shared/utils"
import MenuIcon from "@mui/icons-material/Menu"
import SearchIcon from "@mui/icons-material/Search"
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined"
import LightModeIcon from "@mui/icons-material/LightModeOutlined"
import { NAVIGATION, activeItem } from "./navigation"
import { OperatorGate } from "./OperatorGate"
import { useAppState } from "./AppContext"
import { NAVBAR_HEIGHT, SIDEBAR_WIDTH } from "./theme/tokens"
import { ROUTES } from "./routes"

/** Инициалы для значка профиля: аватарок в заводском учёте взять неоткуда. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

function SideMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { operatorName } = useAppState()
  const current = activeItem(pathname)

  return (
    <Stack sx={ { height: "100%" } }>
      <Box sx={ { px: 3, height: NAVBAR_HEIGHT, display: "flex", alignItems: "center" } }>
        <Typography
          component="div"
          sx={ (theme) => ({
            fontFamily: theme.typography.fontSecondaryFamily,
            fontSize: "1.25rem",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: "primary.main",
          }) }
        >
          IMS&nbsp;Tool
        </Typography>
      </Box>

      <Box sx={ { overflowY: "auto", flexGrow: 1, px: 2 } }>
        { NAVIGATION.map((section, index) => (
          <Box key={ section.title ?? `section-${ index }` } sx={ { mb: 1 } }>
            <Typography
              variant="caption"
              component="p"
              sx={ {
                color: "text.disabled",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                px: 2,
                pt: 2,
                pb: 1,
              } }
            >
              { section.title ?? "Прочее" }
            </Typography>

            <List dense disablePadding>
              { section.items.map((item) => (
                <ListItemButton
                  key={ item.path }
                  component={ RouterLink }
                  to={ item.path }
                  selected={ current?.path === item.path }
                  onClick={ onNavigate }
                  sx={ { mb: 0.5 } }
                >
                  <ListItemIcon sx={ { minWidth: 24, color: "inherit", "& svg": { fontSize: 22 } } }>
                    { item.icon }
                  </ListItemIcon>
                  <ListItemText
                    primary={ item.title }
                    slotProps={ {
                      primary: {
                        variant: "body2",
                        sx: { fontWeight: current?.path === item.path ? 600 : 500 },
                      },
                    } }
                  />
                </ListItemButton>
              )) }
            </List>
          </Box>
        )) }
      </Box>

      <Box sx={ { p: 2 } }>
        <Stack
          direction="row"
          sx={ (theme) => ({
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: varAlpha(theme.vars.palette.grey["500Channel"], 0.08),
          }) }
        >
          <Box
            sx={ {
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              display: "grid", placeItems: "center",
              backgroundColor: "primary.main", color: "primary.contrastText",
              fontSize: 13, fontWeight: 700,
            } }
          >
            { initials(operatorName ?? "") }
          </Box>
          <Box sx={ { minWidth: 0 } }>
            <Typography variant="subtitle2" noWrap title={ operatorName ?? "" }>
              { operatorName ?? "не указан" }
            </Typography>
            <Typography variant="caption" sx={ { color: "text.secondary" } }>Оператор</Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  )
}

function QuickSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    const query = text.trim()
    if (!query) return
    navigate(`${ ROUTES.instruments }?q=${ encodeURIComponent(query) }`)
  }

  return (
    <Box component="form" onSubmit={ submit } sx={ { flexGrow: 1, maxWidth: 380 } }>
      <TextField
        fullWidth
        size="small"
        value={ text }
        onChange={ (event) => setText(event.target.value) }
        placeholder="Найти прибор по номеру или названию"
        slotProps={ {
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={ { color: "text.disabled" } }/>
              </InputAdornment>
            ),
          },
        } }
      />
    </Box>
  )
}

function ColorModeButton() {
  const { mode, setMode } = useColorScheme()
  const dark = mode === "dark"

  return (
    <Tooltip title={ dark ? "Светлая тема" : "Тёмная тема" }>
      <IconButton onClick={ () => setMode(dark ? "light" : "dark") }>
        { dark ? <LightModeIcon/> : <DarkModeIcon/> }
      </IconButton>
    </Tooltip>
  )
}

/**
 * Оболочка приложения.
 *
 * Разметка дизайн-системы Minimal: светлая боковая панель без границы,
 * прозрачная шапка с размытием, мягкая подложка у блока оператора. Шапка не
 * декоративная — в ней то, что кладовщик делает чаще всего: поиск прибора по
 * инвентарному номеру и заведение нового.
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
        sx={ (theme) => ({
          width: wide ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            border: "none",
            borderRight: `1px dashed ${ varAlpha(theme.vars.palette.grey["500Channel"], 0.2) }`,
            backgroundColor: theme.vars.palette.background.default,
          },
        }) }
      >
        <SideMenu onNavigate={ wide ? undefined : () => setOpen(false) }/>
      </Drawer>

      <Box sx={ { flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" } }>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={ 0 }
          sx={ (theme) => ({
            border: "none",
            backdropFilter: "blur(6px)",
            backgroundColor: varAlpha(theme.vars.palette.background.defaultChannel, 0.8),
          }) }
        >
          <Toolbar sx={ { gap: 2, minHeight: `${ NAVBAR_HEIGHT }px !important`, px: { xs: 2, md: 4 } } }>
            { wide ? null : (
              <IconButton edge="start" onClick={ () => setOpen(true) }>
                <MenuIcon/>
              </IconButton>
            ) }
            <QuickSearch/>
            <Box sx={ { flexGrow: 1 } }/>
            <ColorModeButton/>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={ { px: { xs: 2, md: 4 }, pb: 5, pt: 1, flexGrow: 1, maxWidth: 1600 } }>
          <OperatorGate/>
          <Outlet/>
        </Box>
      </Box>
    </Box>
  )
}
