import { useId } from "react"
import { CAP, M_PATH, RECTS, S_PATH, S_STROKE, WIDTH, bars } from "./logoShapes"

interface LogoProps {
  /** Высота знака в пикселях; ширина считается сама. */
  readonly height?: number
  /** Без полос — для мелких мест, где они сливаются в кашу. */
  readonly solid?: boolean
  readonly className?: string
}

/**
 * Знак приложения.
 *
 * Рисуется цветом текста, поэтому одинаково живёт на светлой и тёмной схеме и
 * подхватывает выбранный акцент там, где стоит на цветной подложке.
 *
 * Полосы сделаны маской, а не белыми линиями поверх: поверх они закрашивали бы
 * подложку, и знак нельзя было бы положить ни на цветную плашку, ни на снимок.
 */
export function Logo({ height = 24, solid, className }: LogoProps) {
  const maskId = useId()
  const width = Math.round((WIDTH / CAP) * height)

  return (
    <svg
      width={ width }
      height={ height }
      viewBox={ `0 0 ${ WIDTH } ${ CAP }` }
      className={ className }
      role="img"
      aria-label="IMS"
      style={ { display: "block", flexShrink: 0 } }
    >
      { solid ? null : (
        <mask id={ maskId }>
          { bars().map((bar) => (
            <rect key={ bar.y } x="0" y={ bar.y } width={ WIDTH } height={ bar.h } fill="#fff"/>
          )) }
        </mask>
      ) }

      <g fill="currentColor" mask={ solid ? undefined : `url(#${ maskId })` }>
        { RECTS.map((rect) => (
          <rect key={ `${ rect.x }-${ rect.y }` } x={ rect.x } y={ rect.y } width={ rect.w } height={ rect.h }/>
        )) }
        <path d={ M_PATH }/>
        <path d={ S_PATH } fill="none" stroke="currentColor" strokeWidth={ S_STROKE }/>
      </g>
    </svg>
  )
}
