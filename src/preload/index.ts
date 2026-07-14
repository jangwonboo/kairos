import { contextBridge, ipcRenderer } from 'electron'
import type {
  Settings,
  DeepPartial,
  TickPayload,
  BgNextPayload,
  BgErrorPayload,
  ProviderTestResult
} from '@shared/types'

contextBridge.exposeInMainWorld('api', {
  onTick: (cb: (payload: TickPayload) => void) => {
    ipcRenderer.on('clock:tick', (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners('clock:tick')
  },
  onBgNext: (cb: (payload: BgNextPayload) => void) => {
    ipcRenderer.on('bg:next', (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners('bg:next')
  },
  onBgError: (cb: (payload: BgErrorPayload) => void) => {
    ipcRenderer.on('bg:error', (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners('bg:error')
  },
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: DeepPartial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:set', patch),
  testProviders: (): Promise<ProviderTestResult[]> => ipcRenderer.invoke('net:test'),
  toggleFullscreen: (): Promise<void> => ipcRenderer.invoke('app:toggleFullscreen'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  closeApp: (): Promise<void> => ipcRenderer.invoke('app:close')
})
