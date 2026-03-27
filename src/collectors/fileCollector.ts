import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chokidar from 'chokidar';
import { FileEvent } from '../types';
import { detectionEngine } from '../core/detectionEngine';
import { config } from '../config';
import { logger } from '../utils/logger';

type Baseline = Record<string, string>; // path → sha256 hash

/**
 * Compute SHA-256 hash of a file
 */
function hashFile(filePath: string): string {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Load baseline from disk
 */
function loadBaseline(baselinePath: string): Baseline {
  if (fs.existsSync(baselinePath)) {
    try {
      return JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as Baseline;
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Save baseline to disk
 */
function saveBaseline(baselinePath: string, baseline: Baseline): void {
  try {
    const dir = path.dirname(baselinePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    logger.info('FIM baseline saved', { path: baselinePath, files: Object.keys(baseline).length });
  } catch (err) {
    logger.error('Failed to save FIM baseline', { error: (err as Error).message });
  }
}

/**
 * Build initial baseline by hashing all monitored files
 */
function buildBaseline(monitorPaths: string[]): Baseline {
  const baseline: Baseline = {};

  for (const monitorPath of monitorPaths) {
    if (!fs.existsSync(monitorPath)) continue;

    const scan = (dirPath: string) => {
      try {
        const stat = fs.statSync(dirPath);
        if (stat.isFile()) {
          baseline[dirPath] = hashFile(dirPath);
        } else if (stat.isDirectory()) {
          const entries = fs.readdirSync(dirPath);
          for (const entry of entries) {
            scan(path.join(dirPath, entry));
          }
        }
      } catch {
        // Skip files we can't read
      }
    };

    scan(monitorPath);
  }

  return baseline;
}

/**
 * Start file integrity monitoring on configured directories
 */
export function startFileCollector(): void {
  const { monitorPaths, baselineFile } = config.fim;

  logger.info('Starting file integrity monitor', { paths: monitorPaths });

  // Ensure monitored paths exist (create defaults for dev)
  for (const p of monitorPaths) {
    if (!fs.existsSync(p)) {
      try {
        fs.mkdirSync(p, { recursive: true });
        logger.info(`Created monitored directory: ${p}`);
      } catch {
        // Skip
      }
    }
  }

  // Load or build baseline
  let baseline = loadBaseline(baselineFile);
  if (Object.keys(baseline).length === 0) {
    logger.info('Building initial FIM baseline...');
    baseline = buildBaseline(monitorPaths);
    saveBaseline(baselineFile, baseline);
    logger.info(`Baseline built: ${Object.keys(baseline).length} files`);
  }

  // Start watching with chokidar
  const watcher = chokidar.watch(monitorPaths, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    depth: 10,
  });

  watcher.on('add', (filePath) => {
    const hash = hashFile(filePath);
    baseline[filePath] = hash;

    const event: FileEvent = {
      path: filePath,
      event: 'created',
      hash,
      timestamp: new Date(),
    };
    detectionEngine.processFileEvent(event).catch((err: Error) => {
      logger.error('Error processing file event', { error: err.message });
    });
  });

  watcher.on('change', (filePath) => {
    const previousHash = baseline[filePath];
    const currentHash = hashFile(filePath);
    baseline[filePath] = currentHash;

    if (previousHash && currentHash !== previousHash) {
      const event: FileEvent = {
        path: filePath,
        event: 'modified',
        hash: currentHash,
        previousHash,
        timestamp: new Date(),
      };
      detectionEngine.processFileEvent(event).catch((err: Error) => {
        logger.error('Error processing file event', { error: err.message });
      });
    }
  });

  watcher.on('unlink', (filePath) => {
    const previousHash = baseline[filePath];
    delete baseline[filePath];

    const event: FileEvent = {
      path: filePath,
      event: 'deleted',
      previousHash,
      timestamp: new Date(),
    };
    detectionEngine.processFileEvent(event).catch((err: Error) => {
      logger.error('Error processing file event', { error: err.message });
    });
  });

  watcher.on('error', (err) => {
    logger.error('Chokidar error', { error: (err as Error).message });
  });

  // Periodically save updated baseline
  setInterval(() => saveBaseline(baselineFile, baseline), 5 * 60_000);

  logger.info('File integrity monitor started');
}
