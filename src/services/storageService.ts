import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IDSEvent, Alert } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * SQLite-based storage service for events and alerts
 */
class StorageService {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const dataDir = path.dirname(config.database.path);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(config.database.path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
    logger.info('Database initialized', { path: config.database.path });
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        source_ip TEXT,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        source_ip TEXT,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        channels TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_source_ip ON events(source_ip);
      CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
    `);
  }

  async saveEvent(event: IDSEvent): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO events (id, type, severity, source_ip, description, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        event.id,
        event.type,
        event.severity,
        event.sourceIP || null,
        event.description,
        event.timestamp.toISOString(),
        event.metadata ? JSON.stringify(event.metadata) : null
      );
    } catch (err) {
      logger.error('Failed to save event', { error: (err as Error).message });
    }
  }

  async saveAlert(alert: Alert): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO alerts (id, type, severity, source_ip, description, timestamp, acknowledged, channels, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        alert.id,
        alert.type,
        alert.severity,
        alert.sourceIP || null,
        alert.description,
        alert.timestamp.toISOString(),
        alert.acknowledged ? 1 : 0,
        JSON.stringify(alert.channels),
        alert.metadata ? JSON.stringify(alert.metadata) : null
      );
    } catch (err) {
      logger.error('Failed to save alert', { error: (err as Error).message });
    }
  }

  getRecentAlerts(limit = 100, offset = 0): Alert[] {
    const rows = this.db.prepare(`
      SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as Record<string, unknown>[];

    return rows.map(this.rowToAlert);
  }

  getRecentEvents(limit = 100, offset = 0): IDSEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM events ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as Record<string, unknown>[];

    return rows.map(this.rowToEvent);
  }

  getEventsByType(type: string, limit = 50): IDSEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT ?
    `).all(type, limit) as Record<string, unknown>[];

    return rows.map(this.rowToEvent);
  }

  getAlertsByIP(ip: string, limit = 50): Alert[] {
    const rows = this.db.prepare(`
      SELECT * FROM alerts WHERE source_ip = ? ORDER BY timestamp DESC LIMIT ?
    `).all(ip, limit) as Record<string, unknown>[];

    return rows.map(this.rowToAlert);
  }

  acknowledgeAlert(id: string): boolean {
    const result = this.db.prepare(`
      UPDATE alerts SET acknowledged = 1 WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }

  getStats(): {
    totalEvents: number;
    totalAlerts: number;
    unacknowledgedAlerts: number;
    eventsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    topSourceIPs: { ip: string; count: number }[];
  } {
    const totalEvents = (this.db.prepare('SELECT COUNT(*) as count FROM events').get() as Record<string, number>).count;
    const totalAlerts = (this.db.prepare('SELECT COUNT(*) as count FROM alerts').get() as Record<string, number>).count;
    const unacknowledgedAlerts = (this.db.prepare(
      'SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0'
    ).get() as Record<string, number>).count;

    const eventsByTypeRows = this.db.prepare(
      'SELECT type, COUNT(*) as count FROM events GROUP BY type'
    ).all() as { type: string; count: number }[];
    const eventsByType: Record<string, number> = {};
    for (const row of eventsByTypeRows) eventsByType[row.type] = row.count;

    const alertsBySeverityRows = this.db.prepare(
      'SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity'
    ).all() as { severity: string; count: number }[];
    const alertsBySeverity: Record<string, number> = {};
    for (const row of alertsBySeverityRows) alertsBySeverity[row.severity] = row.count;

    const topSourceIPs = this.db.prepare(`
      SELECT source_ip as ip, COUNT(*) as count
      FROM events
      WHERE source_ip IS NOT NULL
      GROUP BY source_ip
      ORDER BY count DESC
      LIMIT 10
    `).all() as { ip: string; count: number }[];

    return { totalEvents, totalAlerts, unacknowledgedAlerts, eventsByType, alertsBySeverity, topSourceIPs };
  }

  private rowToEvent(row: Record<string, unknown>): IDSEvent {
    return {
      id: row['id'] as string,
      type: row['type'] as IDSEvent['type'],
      severity: row['severity'] as IDSEvent['severity'],
      sourceIP: row['source_ip'] as string | undefined || undefined,
      description: row['description'] as string,
      timestamp: new Date(row['timestamp'] as string),
      metadata: row['metadata'] ? JSON.parse(row['metadata'] as string) : undefined,
    };
  }

  private rowToAlert(row: Record<string, unknown>): Alert {
    return {
      id: row['id'] as string,
      type: row['type'] as Alert['type'],
      severity: row['severity'] as Alert['severity'],
      sourceIP: row['source_ip'] as string | undefined || undefined,
      description: row['description'] as string,
      timestamp: new Date(row['timestamp'] as string),
      acknowledged: row['acknowledged'] === 1,
      channels: row['channels'] ? JSON.parse(row['channels'] as string) : [],
      metadata: row['metadata'] ? JSON.parse(row['metadata'] as string) : undefined,
    };
  }
}

export const storageService = new StorageService();
