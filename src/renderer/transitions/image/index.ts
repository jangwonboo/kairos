import type { Settings } from '@shared/types'

export type ImageEffect = Settings['transition']['image']['effect']

export const IMAGE_EFFECT_LABELS: Record<ImageEffect, string> = {
  'dim-crossfade': 'Dimming Cross-fade (기본)',
  'pure-fade': 'Simple Fade',
  'blur-morph': 'Blur Morph',
  'slide': 'Slide',
  'none': 'Instant'
}

export const IMAGE_EFFECT_DURATION: Record<ImageEffect, number> = {
  'dim-crossfade': 2600,
  'pure-fade': 800,
  'blur-morph': 1400,
  'slide': 1200,
  'none': 0
}
