import winston from 'winston';
import { SeqTransport } from '@datalust/winston-seq';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for console
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    // Exclude service and environment from meta to keep console clean
    const { service: _s, environment: _e, ...rest } = meta as any; /* eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
    if (Object.keys(rest).length > 0) {
      log += `\n${JSON.stringify(rest, null, 2)}`;
    }
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (config.isProduction ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: 'cargpt-api',
    environment: config.mode
  },
  transports: [
    // Seq transport for centralized logging
    new SeqTransport({
      serverUrl: process.env.SEQ_URL || 'http://localhost:5341',
      apiKey: process.env.SEQ_API_KEY,
      onError: (e) => console.error('Seq transport error:', e),
      handleExceptions: true,
      handleRejections: true
    })
  ],
  // Don't exit on error
  exitOnError: false
});

// Console output in development
if (!config.isProduction) {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Create stream for Morgan
export const stream = {
  write: (message: string) => logger.info(message.trim())
};

export default logger;
