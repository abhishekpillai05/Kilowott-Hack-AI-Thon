import { config } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configuredLevel = LEVELS[config.LOG_LEVEL as LogLevel] ?? LEVELS.info;

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < configuredLevel) return;

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };

  if (meta && Object.keys(meta).length > 0) {
    // Never log keys that look like secrets
    const safeKeys = Object.fromEntries(
      Object.entries(meta).filter(([k]) => !/(key|secret|password|token|credential)/i.test(k)),
    );
    Object.assign(entry, safeKeys);
  }

  const output = config.NODE_ENV === 'production' ? JSON.stringify(entry) : formatDev(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function formatDev(entry: Record<string, unknown>): string {
  const { ts, level, msg, ...rest } = entry;
  const timestamp = String(ts).slice(11, 23);
  const lvlColours: Record<string, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const colour = lvlColours[String(level)] ?? '';
  const restStr = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
  return `${timestamp} ${colour}[${String(level).toUpperCase()}]${reset} ${msg}${restStr}`;
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
