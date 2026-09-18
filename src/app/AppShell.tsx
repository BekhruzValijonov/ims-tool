import { useState, type FormEvent } from "react"
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Toolbar from "@mui/material/Toolbar"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useColorScheme, useTheme } from "@mui/material/styles"
import AddIcon from "@mui/icons-material/Add"
import MenuIcon from "@mui/icons-material/Menu"
import SearchIcon from "@mui/icons-material/Search"
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined"
import LightModeIcon from "@mui/icons-material/LightModeOutlined"
import { NAVIGATION, activeItem, type NavSection } from "./navigation"
import { OperatorGate } from "./OperatorGate"
import { useAppState } from "./AppContext"
import { BADGE_RADIUS, BRAND, NAVBAR_HEIGHT, SIDEBAR_WIDTH, STATE } from "./theme/tokens"
import { ROUTES } from "./routes"

/** Инициалы для значка профиля: аватарок в заводском учёте взять неоткуда. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

function toneColor(tone: NavSection["tone"], active: boolean, muted: string): string {
  if (active) return "#ffffff"
  if (tone === "brand") return BRAND.main
  if (tone === "muted") return STATE.work
  return muted
}

function toneBackground(tone: NavSection["tone"], active: boolean): string {
  if (active) return BRAND.main
  if (tone === "brand") return BRAND.soft
  if (tone === "muted") return STATE.workSoft
  return "transparent"
}

function SideMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { operatorName } = useAppState()
  const theme = useTheme()
  const current = activeItem(pathname)

  return (
    <Stack sx={ { height: "100%" } }>
      <Box sx={ { px: 2.5, height: NAVBAR_HEIGHT, display: "flex", alignItems: "center" } }>
        <Typography
          component="div"
          sx={ { fontSize: "1.0625rem", fontWeight: 500, letterSpacing: "0.18em" } }
        >
          IMS TOOL
        </Typography>
      </Box>
      <Divider/>

      <Stack direction="row" sx={ { alignItems: "center", gap: 1.5, px: 2.5, py: 2 } }>
        <Box
          sx={ {
            width: 38, height: 38, borderRadius: `${ BADGE_RADIUS }px`, flexShrink: 0,
            display: "grid", placeItems: "center",
            backgroundColor: BRAND.soft, color: BRAND.main, fontWeight: 500,
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

      <Box sx={ { overflowY: "auto", flexGrow: 1, px: 1.5, pb: 2 } }>
        { NAVIGATION.map((section, index) => (
          <Box key={ section.title ?? `section-${ index }` } sx={ { mb: 0.5 } }>
            { section.title ? (
              <Typography
                variant="caption"
                component="p"
                sx={ { color: "text.secondary", px: 1.25, pt: 1.5, pb: 0.75 } }
              >
                { section.title }
              </Typography>
            ) : <Divider sx={ { my: 1.5 } }/> }

            <List dense disablePadding>
              { section.items.map((item) => {
                const active = current?.path === item.path
                return (
                  <ListItemButton
                    key={ item.path }
                    component={ RouterLink }
                    to={ item.path }
                    selected={ active }
                    onClick={ onNavigate }
                    sx={ { mb: 0.25 } }
                  >
                    <Box
                      sx={ {
                        width: 30, height: 30, flexShrink: 0,
                        borderRadius: `${ BADGE_RADIUS }px`,
                        display: "grid", placeItems: "center",
                        backgroundColor: toneBackground(section.tone, active),
                        color: toneColor(section.tone, active, theme.palette.text.secondary),
                        "& svg": { fontSize: 17 },
                      } }
                    >
                      { item.icon }
                    </Box>
                    <ListItemText
                      primary={ item.title }
                      slotProps={ { primary: { variant: "body2", sx: { fontWeight: active ? 500 : 400 } } } }
                    />
                  </ListItemButton>
                )
              }) }
            </List>
          </Box>
        )) }
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
    <Box component="form" onSubmit={ submit } sx={ { flexGrow: 1, maxWidth: 420 } }>
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
                <SearchIcon fontSize="small" sx={ { color: "text.secondary" } }/>
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
  const dark = mode !== "light"

  return (
    <Tooltip title={ dark ? "Светлая тема" : "Тёмная тема" }>
      <IconButton size="small" onClick={ () => setMode(dark ? "light" : "dark") }>
        { dark ? <LightModeIcon fontSize="small"/> : <DarkModeIcon fontSize="small"/> }
      </IconButton>
    </Tooltip>
  )
}

/**
 * Оболочка приложения.
 *
 * Разметка Corona: тёмная боковая панель с профилем оператора и верхняя
 * строка. Строка не декоративная — в ней живёт то, что кладовщик делает чаще
 * всего: поиск прибора по инвентарному номеру и заведение нового.
 */
export function AppShell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const wide = useMediaQuery(useTheme().breakpoints.up("md"))

  return (
    <Box sx={ { display: "flex", minHeight: "100vh" } }>
      <Drawer
        variant={ wide ? "permanent" : "temporary" }
        open={ wide || open }
        onClose={ () => setOpen(false) }
        sx={ {
          width: wide ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
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
        <AppBar
          position="sticky"
          color="inherit"
          elevation={ 0 }
          sx={ {
            border: "none",
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
          } }
        >
          <Toolbar sx={ { gap: 2, minHeight: `${ NAVBAR_HEIGHT }px !important`, px: { xs: 2, md: 3 } } }>
            { wide ? null : (
              <IconButton edge="start" onClick={ () => setOpen(true) }>
                <MenuIcon/>
              </IconButton>
            ) }
            <QuickSearch/>
            <Box sx={ { flexGrow: 1 } }/>
            <Button
              variant="contained"
              size="small"
              startIcon={ <AddIcon/> }
              onClick={ () => navigate(`${ ROUTES.instruments }/new`) }
              sx={ { display: { xs: "none", sm: "inline-flex" } } }
            >
              Добавить прибор
            </Button>
            <ColorModeButton/>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={ { p: { xs: 2, md: 3 }, flexGrow: 1, maxWidth: 1600 } }>
          <OperatorGate/>
          <Outlet/>
        </Box>
      </Box>
    </Box>
  )
}
