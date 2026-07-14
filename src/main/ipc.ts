import { ipcMain, shell, BrowserWindow } from 'electron'
import { getSettings, patchSettings } from './settings'
import type { DeepPartial, Settings } from '@shared/types'

const OPEN_EXTERNAL_ALLOWLIST = [
  /^https:\/\/unsplash\.com\//,
  /^https:\/\/www\.pexels\.com\//,
  /^https:\/\/pixabay\.com\//,
  /^https:\/\/commons\.wikimedia\.org\//
]

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_e, patch: DeepPartial<Settings>) =>
    patchSettings(patch as Partial<Settings>)
  )

  ipcMain.handle('net:test', async () => {
    const { runProviderTests } = await import('./net/diagnostics')
    return runProviderTests()
  })

  ipcMain.handle('app:toggleFullscreen', (_e) => {
    const win = BrowserWindow.fromWebContents(_e.sender)
    win?.setFullScreen(!win.isFullScreen())
  })

  ipcMain.handle('app:openExternal', (_e, url: string) => {
    const allowed = OPEN_EXTERNAL_ALLOWLIST.some((re) => re.test(url))
    if (allowed) shell.openExternal(url)
  })

  ipcMain.handle('app:close', (_e) => {
    BrowserWindow.fromWebContents(_e.sender)?.close()
  })
}
