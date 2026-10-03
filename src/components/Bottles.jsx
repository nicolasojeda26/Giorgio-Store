import { useId } from 'react'

/*
 * Ilustraciones propias de frascos genéricos (no representan ninguna marca).
 * Se usan en el hero, en las tarjetas de promo y en el catálogo hasta que haya fotos reales.
 */

// Color del perfume dentro del frasco: [arriba, abajo]. 'smoke' es vidrio negro, sin líquido a la vista.
const LIQUIDS = {
  amber: ['#edbd62', '#8a5416'],
  champagne: ['#f8ecc8', '#c99a45'],
  rose: ['#f2cbc4', '#b0655f'],
  azul: ['#a9c1dc', '#35527c'],
  esmeralda: ['#b7cfae', '#3f6748'],
  ciruela: ['#cfa3c0', '#5e2f52'],
}

const useSvgId = () => `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`

function Defs({ id, tone }) {
  const [top, bottom] = LIQUIDS[tone] ?? LIQUIDS.amber
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#6f5216" />
        <stop offset="0.28" stopColor="#f3d98a" />
        <stop offset="0.52" stopColor="#b98a2f" />
        <stop offset="0.8" stopColor="#f7e7ad" />
        <stop offset="1" stopColor="#7c5c1a" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#34302a" />
        <stop offset="0.4" stopColor="#191713" />
        <stop offset="1" stopColor="#070706" />
      </linearGradient>
      <linearGradient id={`${id}-liquid`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

// Cada frasco es un <svg> independiente: suelto se dimensiona con clases, y dentro de una
// composición se ubica con x / y / width / height (SVG anidado).
const svgProps = { viewBox: '0 0 200 320', 'aria-hidden': true, focusable: false }

/** Frasco rectangular de vidrio oscuro con tapa dorada. */
export function Flacon({ tone = 'smoke', ...rest }) {
  const id = useSvgId()
  return (
    <svg {...svgProps} {...rest}>
      <Defs id={id} tone={tone} />
      <rect x="70" y="14" width="60" height="70" rx="5" fill={`url(#${id}-gold)`} />
      <rect x="70" y="14" width="60" height="9" rx="4.5" fill="#fff" opacity="0.22" />
      <rect x="82" y="84" width="36" height="14" fill="#8a651f" />
      <rect
        x="34"
        y="98"
        width="132"
        height="208"
        rx="14"
        fill={`url(#${id}-glass)`}
        stroke="#fff"
        strokeOpacity="0.16"
      />
      {tone !== 'smoke' && (
        <rect x="44" y="128" width="112" height="168" rx="8" fill={`url(#${id}-liquid)`} opacity="0.92" />
      )}
      <rect x="62" y="170" width="76" height="76" fill="#0c0b0a" stroke={`url(#${id}-gold)`} strokeWidth="1.2" />
      <text
        x="100"
        y="223"
        textAnchor="middle"
        fontFamily="'Bodoni Moda Variable', Didot, serif"
        fontSize="44"
        fill={`url(#${id}-gold)`}
      >
        G
      </text>
      <rect x="44" y="110" width="9" height="186" rx="4.5" fill={`url(#${id}-shine)`} opacity="0.5" />
      <rect x="151" y="110" width="4" height="186" rx="2" fill="#fff" opacity="0.07" />
    </svg>
  )
}

/** Frasco de hombros redondos, vidrio claro y tapa esférica. */
export function Round({ tone = 'champagne', ...rest }) {
  const id = useSvgId()
  return (
    <svg {...svgProps} {...rest}>
      <Defs id={id} tone={tone} />
      <circle cx="100" cy="62" r="30" fill={`url(#${id}-gold)`} />
      <ellipse cx="90" cy="50" rx="10" ry="6" fill="#fff" opacity="0.35" />
      <rect x="86" y="90" width="28" height="26" fill="#8a651f" />
      <path
        d="M36 306 Q26 306 26 296 L26 202 Q26 116 100 116 Q174 116 174 202 L174 296 Q174 306 164 306 Z"
        fill="#fff"
        fillOpacity="0.07"
        stroke="#fff"
        strokeOpacity="0.32"
      />
      <path
        d="M44 296 Q38 296 38 290 L38 214 Q38 150 100 150 Q162 150 162 214 L162 290 Q162 296 156 296 Z"
        fill={`url(#${id}-liquid)`}
        opacity="0.92"
      />
      <circle cx="100" cy="232" r="27" fill="none" stroke="#0c0b0a" strokeOpacity="0.55" strokeWidth="1.2" />
      <text
        x="100"
        y="245"
        textAnchor="middle"
        fontFamily="'Bodoni Moda Variable', Didot, serif"
        fontSize="34"
        fill="#0c0b0a"
        fillOpacity="0.8"
      >
        G
      </text>
      <path
        d="M42 286 L42 212 Q42 168 64 152"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.45"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Frasco facetado con tapa en cúpula y filigrana dorada. */
export function Arabesque({ tone = 'smoke', ...rest }) {
  const id = useSvgId()
  return (
    <svg {...svgProps} {...rest}>
      <Defs id={id} tone={tone} />
      <circle cx="100" cy="16" r="7" fill={`url(#${id}-gold)`} />
      <path d="M68 84 Q68 34 100 24 Q132 34 132 84 Z" fill={`url(#${id}-gold)`} />
      <path d="M100 24 Q84 44 84 84" fill="none" stroke="#6f5216" strokeOpacity="0.6" />
      <path d="M100 24 Q116 44 116 84" fill="none" stroke="#6f5216" strokeOpacity="0.6" />
      <rect x="62" y="84" width="76" height="14" rx="2" fill="#8a651f" />
      <path
        d="M60 98 L140 98 L174 142 L174 268 L150 306 L50 306 L26 268 L26 142 Z"
        fill={tone === 'smoke' ? `url(#${id}-glass)` : `url(#${id}-liquid)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.6"
      />
      <g fill="none" stroke={tone === 'smoke' ? `url(#${id}-gold)` : '#241707'} strokeWidth="1.1" opacity="0.9">
        <path d="M100 128 L152 204 L100 280 L48 204 Z" />
        <path d="M100 152 L134 204 L100 256 L66 204 Z" />
        <circle cx="100" cy="204" r="15" />
        <path d="M60 98 L48 204 L50 306 M140 98 L152 204 L150 306" opacity="0.45" />
      </g>
      <circle cx="100" cy="204" r="5" fill={tone === 'smoke' ? `url(#${id}-gold)` : '#241707'} />
      <path d="M38 150 L38 262" stroke="#fff" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Decant: vial delgado con atomizador. */
export function Vial({ tone = 'amber', ...rest }) {
  const id = useSvgId()
  return (
    <svg {...svgProps} viewBox="0 0 120 320" {...rest}>
      <Defs id={id} tone={tone} />
      <rect x="50" y="10" width="20" height="12" rx="2" fill="#8a651f" />
      <rect x="44" y="22" width="32" height="30" rx="3" fill={`url(#${id}-gold)`} />
      <rect x="38" y="52" width="44" height="20" rx="2" fill="#8a651f" />
      <rect
        x="32"
        y="72"
        width="56"
        height="236"
        rx="9"
        fill="#fff"
        fillOpacity="0.06"
        stroke="#fff"
        strokeOpacity="0.34"
      />
      <rect x="38" y="120" width="44" height="182" rx="5" fill={`url(#${id}-liquid)`} opacity="0.92" />
      <rect x="40" y="82" width="5" height="216" rx="2.5" fill={`url(#${id}-shine)`} opacity="0.7" />
    </svg>
  )
}

const SHAPES = { flacon: Flacon, round: Round, arabesque: Arabesque, vial: Vial }

/** Frasco de un perfume del catálogo: `shape` y `tone` vienen de los datos del perfume. */
export function Bottle({ shape = 'flacon', tone, ...rest }) {
  const Shape = SHAPES[shape] ?? Flacon
  return <Shape tone={tone} {...rest} />
}

// Ubica un frasco apoyado sobre la base de una composición de 320 de alto.
const place = (x, height, ratio = 200 / 320) => ({ x, y: 320 - height, width: height * ratio, height })
const VIAL = 120 / 320

const COMPOSITIONS = {
  duo: {
    width: 330,
    render: () => (
      <>
        <Flacon {...place(0, 320)} />
        <Round {...place(186, 230)} />
      </>
    ),
  },
  arabes: {
    width: 330,
    render: () => (
      <>
        <Arabesque {...place(0, 256)} tone="amber" />
        <Arabesque {...place(130, 320)} />
      </>
    ),
  },
  cinco: {
    width: 480,
    render: () => (
      <>
        <Arabesque {...place(0, 198)} />
        <Arabesque {...place(356, 198)} />
        <Arabesque {...place(60, 256)} tone="amber" />
        <Arabesque {...place(260, 256)} tone="amber" />
        <Arabesque {...place(140, 320)} />
      </>
    ),
  },
  decants: {
    width: 300,
    render: () => (
      <>
        <Vial {...place(0, 262, VIAL)} tone="champagne" />
        <Vial {...place(202, 262, VIAL)} tone="champagne" />
        <Vial {...place(90, 320, VIAL)} />
      </>
    ),
  },
  // Hero: los cuatro frascos con un aro dorado detrás.
  hero: {
    width: 480,
    render: () => (
      <>
        <circle cx="236" cy="150" r="212" fill="none" stroke="#d8a93f" strokeOpacity="0.32" />
        <Arabesque {...place(0, 218)} tone="amber" />
        <Flacon {...place(112, 320)} />
        <Round {...place(292, 206)} />
        <Vial {...place(420, 152, VIAL)} />
      </>
    ),
  },
}

/** Composición de frascos en un único SVG, que escala con el ancho del contenedor. */
export function PromoArt({ kind, className = '' }) {
  const comp = COMPOSITIONS[kind]
  if (!comp) return null
  return (
    <svg
      viewBox={`0 0 ${comp.width} 320`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none overflow-visible ${className}`}
    >
      {comp.render()}
    </svg>
  )
}
