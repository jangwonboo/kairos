/// <reference types="vite/client" />

import type {
  Settings,
  DeepPartial,
  TickPayload,
  BgNextPayload,
  BgErrorPayload,
  ProviderTestResult
} from '@shared/types'

declare global {
  interface Window {
    api: {
      onTick: (cb: (payload: TickPayload) => void) => () => void
      onBgNext: (cb: (payload: BgNextPayload) => void) => () => void
      onBgError: (cb: (payload: BgErrorPayload) => void) => () => void
      getSettings: () => Promise<Settings>
      setSettings: (patch: DeepPartial<Settings>) => Promise<Settings>
      testProviders: () => Promise<ProviderTestResult[]>
      toggleFullscreen: () => Promise<void>
      openExternal: (url: string) => Promise<void>
      closeApp: () => Promise<void>
    }
  }
}
