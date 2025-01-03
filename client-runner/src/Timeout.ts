/**
 * Pausable execution timeout
 */
export class Timeout {
  private remaining: number = 0
  private lastStart: number = 0
  private timer: Timer | null = null
  private resolve: (() => void) | null = null

  private setTimer(ms: number, resolve: () => void) {
    this.timer = setTimeout(() => {
      resolve()
      this.timer = null
      this.remaining = 0
      this.lastStart = 0
      this.resolve = () => {}
    }, ms)
    this.lastStart = Date.now()
  }
  
  /**
   * Start the timeout with a total running duration. Duration excludes pause time.
   * @param ms The total duration of the timeout in milliseconds.
   * @returns A promise that resolves when the timeout is reached.
   */
  public start(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.resolve = resolve
      this.remaining = ms
      this.setTimer(ms, resolve)
    })
  }

  /**
   * Pause the timeout. Remaining time is saved.
   * @returns The remaining time of the timeout.
   */
  public pause(): number {
    if (this.timer == null) return console.error("Timer is not running"), 0
    this.remaining -= Date.now() - this.lastStart
    clearTimeout(this.timer)
    this.timer = null
    return this.remaining
  }

  /**
   * Resume the timeout with the remaining time.
   * @returns The remaining time of the timeout.
   */
  public resume(): number {
    if (this.resolve == null || !this.remaining) return console.error("Timer is not initialized"), 0
    this.setTimer(this.remaining, this.resolve)
    return this.remaining
  }
}
