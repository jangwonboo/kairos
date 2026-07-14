import type { Settings } from '@shared/types'

export type TextEffect = Settings['transition']['text']['effect']

export const TEXT_EFFECT_LABELS: Record<TextEffect, string> = {
  'blur-lift': 'Blur Lift (기본)',
  'fade': 'Simple Fade',
  'typewriter': 'Typewriter',
  'mask': 'Mask Reveal',
  'slide-up': 'Slide Up',
  'none': 'Instant'
}

// CSS animation durations in ms (× durationMult)
export const TEXT_EFFECT_DURATION: Record<TextEffect, number> = {
  'blur-lift': 600,
  'fade': 300,
  'typewriter': 2500,  // max — clamped per char count
  'mask': 400,
  'slide-up': 500,
  'none': 0
}
