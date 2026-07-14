import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let logPath: string | null = null

function getLogPath(): string {
  if (logPath) return logPath
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  logPath = join(dir, 'debug.log')
  return logPath
}

export function log(tag: string, msg: string, data?: unknown): void {
  const ts = new Date().toISOString()
  const extra = data !== undefined ? ' ' + JSON.stringify(data) : ''
  const line = `${ts} [${tag}] ${msg}${extra}\n`
  try {
    appendFileSync(getLogPath(), line, 'utf-8')
  } catch { /* non-fatal */ }
  console.log(line.trimEnd())
}
