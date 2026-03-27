import { v4 as uuidv4 } from 'uuid';
import { NetworkPacket, LogEntry, FileEvent, IDSEvent, Alert } from '../types';
import { detectPortScan, detectSuspiciousPort, detectBruteForce, detectSynFlood } from './rules/signatureRules';
import { detectRateAnomaly } from './rules/anomalyRules';
import { correlate } from './correlationEngine';
import { alertService } from '../services/alertService';
import { storageService } from '../services/storageService';
import { wsService } from '../services/wsService';
import { logger } from '../utils/logger';

/**
 * Central detection engine — routes events to appropriate detection modules
 * and dispatches alerts through the alerting pipeline
 */
class DetectionEngine {
  /**
   * Process a network packet through all detection rules
   */
  async processPacket(packet: NetworkPacket): Promise<void> {
    const detectedEvents: IDSEvent[] = [];

    // Signature-based
    const portScan = detectPortScan(packet);
    if (portScan) detectedEvents.push(portScan);

    const suspiciousPort = detectSuspiciousPort(packet);
    if (suspiciousPort) detectedEvents.push(suspiciousPort);

    const synFlood = detectSynFlood(packet);
    if (synFlood) detectedEvents.push(synFlood);

    // Anomaly-based
    const rateAnomaly = detectRateAnomaly(packet);
    if (rateAnomaly) detectedEvents.push(rateAnomaly);

    // Process each detected event
    for (const event of detectedEvents) {
      await this.dispatchEvent(event);
    }
  }

  /**
   * Process a log entry through detection rules
   */
  async processLogEntry(entry: LogEntry): Promise<void> {
    if (entry.eventType === 'failed_login' && entry.ip) {
      const bruteForce = detectBruteForce(entry.ip, entry.username || '', entry.timestamp);
      if (bruteForce) {
        await this.dispatchEvent(bruteForce);
      }
    }

    // Store the log entry event regardless
    if (entry.eventType && entry.eventType !== 'unknown') {
      const event: IDSEvent = {
        id: uuidv4(),
        type: entry.eventType,
        severity: entry.eventType === 'failed_login' ? 'medium' : 'low',
        sourceIP: entry.ip,
        description: entry.message || entry.rawLine,
        timestamp: entry.timestamp,
        metadata: { source: entry.source, username: entry.username },
      };
      await storageService.saveEvent(event);
    }
  }

  /**
   * Process a file integrity event
   */
  async processFileEvent(fileEvent: FileEvent): Promise<void> {
    const severity = fileEvent.event === 'deleted' ? 'high' : 'medium';
    const event: IDSEvent = {
      id: uuidv4(),
      type: fileEvent.event === 'created' ? 'file_created'
        : fileEvent.event === 'deleted' ? 'file_deleted'
        : 'file_modified',
      severity,
      description: `File ${fileEvent.event}: ${fileEvent.path}`,
      timestamp: fileEvent.timestamp,
      metadata: {
        path: fileEvent.path,
        hash: fileEvent.hash,
        previousHash: fileEvent.previousHash,
      },
    };
    await this.dispatchEvent(event);
  }

  /**
   * Dispatch an event: correlate, store, and alert
   */
  private async dispatchEvent(event: IDSEvent): Promise<void> {
    // Assign ID if not set
    if (!event.id) event.id = uuidv4();

    // Run correlation engine
    const correlationAlerts = correlate(event);

    // Store the raw event
    await storageService.saveEvent(event);

    // Build alert from event
    const alert: Alert = {
      ...event,
      acknowledged: false,
      channels: this.getAlertChannels(event.severity),
    };

    // Send alert
    await alertService.send(alert);

    // Push to WebSocket clients
    wsService.broadcast({ type: 'alert', data: alert });

    // Process correlation alerts
    for (const corrAlert of correlationAlerts) {
      corrAlert.id = uuidv4();
      await storageService.saveAlert(corrAlert);
      await alertService.send(corrAlert);
      wsService.broadcast({ type: 'correlation_alert', data: corrAlert });
    }
  }

  private getAlertChannels(severity: string): Alert['channels'] {
    const channels: Alert['channels'] = ['console', 'file'];
    if (severity === 'high' || severity === 'critical') {
      channels.push('email', 'webhook');
    }
    return channels;
  }
}

export const detectionEngine = new DetectionEngine();
