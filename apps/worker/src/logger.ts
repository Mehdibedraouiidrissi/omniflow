// ============================================================================
// Omniflow Worker - Pino Logger Setup
// ============================================================================

import pino from 'pino';
import { config } from './config';

export const logger = pino({
  name: 'omniflow-worker',
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        }
      : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createChildLogger(name: string) {
  return logger.child({ worker: name });
}
