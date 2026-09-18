import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { Router } from "@toolpad/core"

/**
 * Переходник между react-router и разметкой Toolpad.
 *
 * Toolpad принимает свой объект роутера; в каркасе на его месте стоял
 * useDemoRouter из @toolpad/core/internal — заглушка витрины документации, без
 * адресной строки, истории переходов и ссылки на карточку прибора.
 */
export function useToolpadRouter(): Router {
  const location = useLocation()
  const navigate = useNavigate()

  return useMemo<Router>(() => ({
    pathname: location.pathname,
    searchParams: new URLSearchParams(location.search),
    navigate: (url) => navigate(String(url)),
  }), [location.pathname, location.search, navigate])
}
