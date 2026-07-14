import { app, BrowserWindow, Tray, Menu, nativeImage, session, protocol } from 'electron'
import { readFileSync } from 'fs'

// Must be called before app.ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: false } }
])
import { join } from 'path'
import { Clock } from './clock'
import { getQuote } from './quote-store'
import { getSettings } from './settings'
import { registerIpcHandlers } from './ipc'
import { fetchAndSendBackground } from './image/image-service'
import { log } from './logger'
import type { TickPayload, Quote } from '@shared/types'

let win: BrowserWindow | null = null
let tray: Tray | null = null
const clock = new Clock()

// Background change tracking
let lastBgChangeMinute = -1   // minute index (hh*60+mm) of last bg change
let lastQuoteId: string | null = null

function shouldChangeBg(quote: Quote, minuteIndex: number): boolean {
  const settings = getSettings()
  const { changeMode, intervalMin } = settings.background

  switch (changeMode) {
    case 'per-quote':
      return quote.id !== lastQuoteId
    case 'interval':
      return lastBgChangeMinute === -1 || (minuteIndex - lastBgChangeMinute) >= intervalMin
    case 'fixed':
      return lastBgChangeMinute === -1   // only on first load
    default:
      return false
  }
}

function applyCSP(): void {
  const isDev = !!process.env['ELECTRON_RENDERER_URL']
  const connectSrc = isDev
    ? "connect-src 'self' ws://localhost:* wss://localhost:*"
    : "connect-src 'none'"
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self'"
  const csp = [
    "default-src 'self'",
    "img-src 'self' file: asset: data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    connectSrc
  ].join('; ')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('closed', () => { win = null })

  // Send initial tick once renderer is fully loaded
  win.webContents.once('did-finish-load', () => {
    sendTick()
  })
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Kairos')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show', click: () => win?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
  tray.on('double-click', () => win?.show())
}

function sendTick(): void {
  if (!win) return
  const settings = getSettings()
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const time = `${hh}:${mm}`
  const minuteIndex = now.getHours() * 60 + now.getMinutes()

  const quote = getQuote(time, settings.display.sfwOnly, settings.display.quoteFallbackWindowMin)
  const payload: TickPayload = { time, quote }
  win.webContents.send('clock:tick', payload)

  // Background update
  if (quote && settings.background.enabled && !settings.network.offlineMode) {
    if (shouldChangeBg(quote, minuteIndex)) {
      lastBgChangeMinute = minuteIndex
      lastQuoteId = quote.id
      fetchAndSendBackground(win, quote).catch(() => {/* silent */})
    }
  }
}

app.whenReady().then(() => {
  // Serve local cached images via asset:// so file:// cross-origin block doesn't affect dev mode
  protocol.handle('asset', (request) => {
    const { hostname, pathname } = new URL(request.url)
    // Chromium normalizes asset:///C:/path → asset://c/path (drive letter becomes hostname)
    const filePath = decodeURIComponent(hostname.toUpperCase() + ':' + pathname)
    log('asset', `url=${request.url} → path=${filePath}`)
    try {
      const data = readFileSync(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg'
      return new Response(data, { headers: { 'content-type': mime } })
    } catch (err) {
      log('asset', `readFileSync failed: ${err}`)
      return new Response(null, { status: 404 })
    }
  })

  applyCSP()
  registerIpcHandlers()
  createWindow()
  createTray()

  clock.on('tick', () => sendTick())
  clock.start()
})

app.on('window-all-closed', () => {
  const settings = getSettings()
  if (settings.startup.minimizeToTray) return
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  clock.stop()
})
