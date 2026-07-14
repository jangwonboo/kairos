import { app, net } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, statSync, unlinkSync, readdirSync, writeFileSync } from 'fs'

const MAX_ITEMS = 60
const MAX_MB = 250
const RECENT_EXCLUDE = 20

export class ImageCache {
  private dir: string
  private recentPaths: string[] = []

  constructor() {
    this.dir = join(app.getPath('userData'), 'bg-cache')
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
  }

  async download(url: string, filename: string): Promise<string> {
    const dest = join(this.dir, filename)
    if (existsSync(dest)) return dest

    // Use Electron net.fetch so proxy/CA settings are respected
    const res = await net.fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    writeFileSync(dest, buffer)

    this._evict()
    return dest
  }

  markUsed(path: string): void {
    this.recentPaths = [path, ...this.recentPaths.filter((p) => p !== path)].slice(
      0,
      RECENT_EXCLUDE
    )
  }

  isRecentlyUsed(path: string): boolean {
    return this.recentPaths.includes(path)
  }

  private _evict(): void {
    try {
      const files = readdirSync(this.dir).map((f) => {
        const full = join(this.dir, f)
        const st = statSync(full)
        return { path: full, mtime: st.mtimeMs, size: st.size }
      })
      files.sort((a, b) => a.mtime - b.mtime)

      let totalMB = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024)
      while (files.length > MAX_ITEMS || totalMB > MAX_MB) {
        const oldest = files.shift()
        if (!oldest) break
        unlinkSync(oldest.path)
        totalMB -= oldest.size / (1024 * 1024)
      }
    } catch {
      // eviction failure is non-fatal
    }
  }
}
