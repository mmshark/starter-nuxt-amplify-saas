/**
 * Structured logger utility
 *
 * Wraps console methods with environment-aware logging.
 * In production, only warn/error are output. In development, all levels are active.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`
  const isDev = import.meta.dev

  return {
    debug(...args: unknown[]) {
      if (isDev) console.debug(prefix, ...args)
    },
    info(...args: unknown[]) {
      if (isDev) console.info(prefix, ...args)
    },
    warn(...args: unknown[]) {
      console.warn(prefix, ...args)
    },
    error(...args: unknown[]) {
      console.error(prefix, ...args)
    }
  }
}

export { createLogger }
export type { Logger }
