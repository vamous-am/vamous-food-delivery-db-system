const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors, json } = format;

const isDev = process.env.NODE_ENV !== 'production';

// ─── Development format ───────────────────────────────────────────────────
// Example: [2026-05-19 14:32:01] INFO: Order created { orderId: 1 }
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),  // include stack trace on Error objects
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? ' ' + JSON.stringify(meta)
      : '';
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
  })
);

// ─── Production format ────────────────────────────────────────────────────
// Structured JSON — one log entry per line, parseable by Render / log tools
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ─── Transport list ───────────────────────────────────────────────────────
const transportList = isDev
  ? [new transports.Console()]
  : [
      new transports.Console(),                            // still useful on Render
      new transports.File({ filename: 'logs/error.log',    level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' }),
    ];

const logger = createLogger({
  level:      isDev ? 'debug' : 'info',
  format:     isDev ? devFormat : prodFormat,
  transports: transportList,
  // Prevent Winston from crashing the process on uncaught exceptions
  exitOnError: false,
});

module.exports = logger;
