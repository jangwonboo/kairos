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
    const handler = (_e: Electron.IpcRendererEvent, payload: TickPayload) => cb(payload)
    ipcRenderer.on('clock:tick', handler)
    return () => ipcRenderer.removeListener('clock:tick', handler)
  },
  onBgNext: (cb: (payload: BgNextPayload) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: BgNextPayload) => cb(payload)
    ipcRenderer.on('bg:next', handler)
    return () => ipcRenderer.removeListener('bg:next', handler)
  },
  onBgError: (cb: (payload: BgErrorPayload) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: BgErrorPayload) => cb(payload)
    ipcRenderer.on('bg:error', handler)
    return () => ipcRenderer.removeListener('bg:error', handler)
  },
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: DeepPartial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:set', patch),
  testProviders: (): Promise<ProviderTestResult[]> => ipcRenderer.invoke('net:test'),
  toggleFullscreen: (): Promise<void> => ipcRenderer.invoke('app:toggleFullscreen'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  closeApp: (): Promise<void> => ipcRenderer.invoke('app:close')
})
