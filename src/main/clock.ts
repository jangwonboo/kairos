import { EventEmitter } from 'events'

export class Clock extends EventEmitter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private _currentTime = ''

  get currentTime(): string {
    return this._currentTime
  }

  start(): void {
    this._tick()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private _tick(): void {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const time = `${hh}:${mm}`

    if (time !== this._currentTime) {
      this._currentTime = time
      this.emit('tick', time)
    }

    // drift-corrected: schedule next tick at the start of next minute
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50 // +50ms guard
    this.timer = setTimeout(() => this._tick(), msUntilNextMinute)
  }
}
