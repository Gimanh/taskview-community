import type { CustomTheme, CustomThemePalette } from 'taskview-api'

const NEUTRAL_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const INK_SHARE: Record<(typeof NEUTRAL_SHADES)[number], number> = {
  50: 3, 100: 7, 200: 15, 300: 28, 400: 45, 500: 58, 600: 70, 700: 80, 800: 88, 900: 95, 950: 100,
}

const PRIMARY_MIX: Record<(typeof NEUTRAL_SHADES)[number], string> = {
  50: 'white 90%', 100: 'white 80%', 200: 'white 60%', 300: 'white 40%', 400: 'white 20%', 500: 'white 0%',
  600: 'black 15%', 700: 'black 30%', 800: 'black 45%', 900: 'black 60%', 950: 'black 75%',
}

function mix(a: string, b: string, aShare: number): string {
  return `color-mix(in oklab, ${a} ${aShare}%, ${b})`
}

function paletteDeclarations(palette: CustomThemePalette, dark: boolean): string[] {
  const { background, surface, border, text, accent } = palette
  const paper = dark ? text : background
  const ink = dark ? background : text
  const strong = dark ? 'white' : 'black'
  const highlighted = mix(text, strong, 50)

  return [
    ...NEUTRAL_SHADES.map((shade) => `--ui-color-neutral-${shade}: ${mix(ink, paper, INK_SHARE[shade])};`),
    ...NEUTRAL_SHADES.map((shade) => `--ui-color-primary-${shade}: color-mix(in oklab, ${accent}, ${PRIMARY_MIX[shade]});`),
    `--ui-primary: ${accent};`,
    `--ui-bg: ${background};`,
    `--ui-bg-muted: ${surface};`,
    `--ui-bg-elevated: ${surface};`,
    `--tv-ui-bg-elevated: ${surface};`,
    `--ui-bg-accented: ${mix(surface, text, 88)};`,
    `--ui-bg-inverted: ${highlighted};`,
    `--ui-border: ${border};`,
    `--ui-border-muted: ${border};`,
    `--ui-border-accented: ${mix(border, text, 85)};`,
    `--ui-border-inverted: ${highlighted};`,
    `--ui-text: ${text};`,
    `--ui-text-highlighted: ${highlighted};`,
    `--ui-text-toned: ${mix(text, background, 85)};`,
    `--ui-text-muted: ${mix(text, background, 62)};`,
    `--ui-text-dimmed: ${mix(text, background, 45)};`,
    `--ui-text-inverted: ${background};`,
  ]
}

/** Unlayered rules, so they win over Nuxt UI's layered tokens in both color modes. */
export function buildCustomThemeCss(theme: CustomTheme): string {
  return [
    `:root:not(.dark) {\n  ${paletteDeclarations(theme.light, false).join('\n  ')}\n}`,
    `:root.dark {\n  ${paletteDeclarations(theme.dark, true).join('\n  ')}\n}`,
  ].join('\n')
}

export function cssColorToHex(color: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#000000'
  ctx.fillStyle = '#000000'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two #rrggbb colors, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
