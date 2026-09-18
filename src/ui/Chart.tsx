import { lazy, Suspense, useMemo } from "react"
import type { ApexOptions } from "apexcharts"
import { useThemeMode } from "../app/ThemeMode"
import { PALETTE } from "../app/theme/tokens"
import { Skeleton } from "./Skeleton"

const ApexChart = lazy(() => import("react-apexcharts"))

/**
 * Общие настройки графиков.
 *
 * Собраны один раз: тонкие оси без засечек, пунктирная сетка, подпись под
 * курсором и градиентная заливка под линией — тот же облик, что был утверждён
 * раньше, только теперь на ApexCharts, как в самой дизайн-системе.
 */
function baseOptions(dark: boolean): ApexOptions {
  const grid = dark ? "rgba(145, 158, 171, 0.24)" : "rgba(145, 158, 171, 0.2)"
  const label = dark ? PALETTE.grey[500] : PALETTE.grey[600]

  return {
    chart: {
      fontFamily: "'DM Sans Variable', sans-serif",
      foreColor: label,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: "straight", lineCap: "round" },
    grid: {
      borderColor: grid,
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      padding: { top: 0, right: 0, bottom: 0, left: 4 },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px" } },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    legend: { show: false },
    tooltip: { theme: dark ? "dark" : "light", x: { show: true } },
    states: { hover: { filter: { type: "lighten" } } },
  }
}

interface ChartProps {
  readonly type: "area" | "bar" | "donut" | "line"
  readonly series: ApexOptions["series"]
  readonly options: ApexOptions
  readonly height: number
}

function merge(base: ApexOptions, extra: ApexOptions): ApexOptions {
  return {
    ...base,
    ...extra,
    chart: { ...base.chart, ...extra.chart },
    grid: { ...base.grid, ...extra.grid },
    xaxis: { ...base.xaxis, ...extra.xaxis },
    yaxis: { ...base.yaxis, ...extra.yaxis },
    tooltip: { ...base.tooltip, ...extra.tooltip },
    stroke: { ...base.stroke, ...extra.stroke },
    legend: { ...base.legend, ...extra.legend },
  }
}

export function Chart({ type, series, options, height }: ChartProps) {
  const { mode } = useThemeMode()
  const merged = useMemo(() => merge(baseOptions(mode === "dark"), options), [mode, options])

  return (
    <div style={ { height } }>
      <Suspense fallback={ <Skeleton height={ height }/> }>
        <ApexChart type={ type } series={ series } options={ merged } height={ height } width="100%"/>
      </Suspense>
    </div>
  )
}

/**
 * Спарклайн для карточки показаний.
 *
 * Без осей и сетки: он показывает форму, а не значения, — числа стоят рядом
 * крупно.
 */
export function Sparkline({ data, color, height = 44 }: { data: readonly number[]; color: string; height?: number }) {
  const options = useMemo<ApexOptions>(() => ({
    chart: { sparkline: { enabled: true }, animations: { enabled: false }, toolbar: { show: false } },
    colors: [color],
    stroke: { width: 2, curve: "smooth" },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] },
    },
    tooltip: { enabled: false },
  }), [color])

  return (
    <div style={ { height } }>
      <Suspense fallback={ null }>
        <ApexChart
          type="area"
          series={ [{ name: "", data: [...data] }] }
          options={ options }
          height={ height }
          width="100%"
        />
      </Suspense>
    </div>
  )
}
