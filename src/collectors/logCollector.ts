import fs from 'fs';
import { LogEntry, EventType } from '../types';
import { detectionEngine } from '../core/detectionEngine';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Parsers for different log formats
 */

// Auth log patterns
const AUTH_LOG_PATTERNS = [
  // Failed password for user from IP port N ssh2
  {
    regex: /Failed (?:password|publickey) for (?:invalid user )?(\S+) from ([\d.]+)/,
    type: 'failed_login' as EventType,
    extract: (m: RegExpMatchArray) => ({ username: m[1], ip: m[2] }),
  },
  // Accepted password for user from IP
  {
    regex: /Accepted (?:password|publickey) for (\S+) from ([\d.]+)/,
    type: 'successful_login' as EventType,
    extract: (m: RegExpMatchArray) => ({ username: m[1], ip: m[2] }),
  },
  // Invalid user X from Y
  {
    regex: /Invalid user (\S+) from ([\d.]+)/,
    type: 'failed_login' as EventType,
    extract: (m: RegExpMatchArray) => ({ username: m[1], ip: m[2] }),
  },
];

// Syslog timestamp pattern: "Mar 27 14:23:00"
const SYSLOG_TIMESTAMP_RE = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/;

function parseLine(source: string, line: string): LogEntry {
  const entry: LogEntry = {
    source,
    rawLine: line,
    timestamp: extractTimestamp(line),
    eventType: 'unknown',
  };

  for (const pattern of AUTH_LOG_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const fields = pattern.extract(match);
      entry.ip = fields.ip;
      entry.username = fields.username;
      entry.eventType = pattern.type;
      entry.message = line;
      break;
    }
  }

  return entry;
}

function extractTimestamp(line: string): Date {
  const match = line.match(SYSLOG_TIMESTAMP_RE);
  if (match) {
    // Add current year since syslog doesn't include it
    const year = new Date().getFullYear();
    const parsed = new Date(`${match[1]} ${year}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Start monitoring one log file using fs.watch fallback
 */
function monitorLogFile(logPath: string): void {
  if (!fs.existsSync(logPath)) {
    logger.warn(`Log file not found, skipping: ${logPath}`);
    return;
  }

  logger.info(`Monitoring log file: ${logPath}`);

  let lastSize = fs.statSync(logPath).size;

  fs.watch(logPath, () => {
    try {
      const stat = fs.statSync(logPath);
      if (stat.size <= lastSize) return;

      const stream = fs.createReadStream(logPath, {
        start: lastSize,
        end: stat.size,
        encoding: 'utf-8',
      });

      let buffer = '';
      stream.on('data', (chunk: string | Buffer) => (buffer += chunk.toString()));
      stream.on('end', () => {
        lastSize = stat.size;
        const lines = buffer.split('\n').filter(Boolean);
        for (const line of lines) {
          const entry = parseLine(logPath, line);
          detectionEngine.processLogEntry(entry).catch((err: Error) => {
            logger.error('Error processing log entry', { error: err.message });
          });
        }
      });
    } catch (err) {
      logger.error('Error reading log file', { path: logPath, error: (err as Error).message });
    }
  });
}

/**
 * Start all log collectors
 */
export function startLogCollector(): void {
  logger.info('Starting log collector...');

  for (const logPath of config.logs.paths) {
    monitorLogFile(logPath.trim());
  }
}
