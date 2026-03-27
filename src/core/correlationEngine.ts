import { IDSEvent, Alert, EventType, Severity } from '../types';
import { logger } from '../utils/logger';

// Recent events window for correlation
const CORRELATION_WINDOW_MS = 5 * 60_000; // 5 minutes
const recentEvents: IDSEvent[] = [];

interface CorrelationRule {
  name: string;
  description: string;
  severity: Severity;
  check: (events: IDSEvent[]) => boolean;
  metadata?: (events: IDSEvent[]) => Record<string, unknown>;
}

const CORRELATION_RULES: CorrelationRule[] = [
  {
    name: 'brute_force_then_traffic_spike',
    description: 'Brute-force attempt followed by traffic spike — possible successful breach with data exfiltration',
    severity: 'critical',
    check: (events) => {
      const hasBruteForce = events.some(e => e.type === 'brute_force');
      const hasTrafficSpike = events.some(e => e.type === 'rate_anomaly' || e.type === 'ddos');
      return hasBruteForce && hasTrafficSpike;
    },
  },
  {
    name: 'port_scan_then_suspicious_port',
    description: 'Port scan followed by connection to suspicious port — possible exploitation attempt',
    severity: 'high',
    check: (events) => {
      const portScanIPs = new Set(events.filter(e => e.type === 'port_scan').map(e => e.sourceIP));
      return events.some(e => e.type === 'suspicious_port' && portScanIPs.has(e.sourceIP));
    },
    metadata: (events) => ({
      attackerIPs: Array.from(
        new Set(events.filter(e => e.type === 'port_scan').map(e => e.sourceIP))
      ),
    }),
  },
  {
    name: 'multiple_attack_types',
    description: 'Multiple attack types from same IP — coordinated multi-vector attack',
    severity: 'critical',
    check: (events) => {
      const ipEventTypes = new Map<string, Set<EventType>>();
      for (const event of events) {
        if (!event.sourceIP) continue;
        if (!ipEventTypes.has(event.sourceIP)) {
          ipEventTypes.set(event.sourceIP, new Set());
        }
        ipEventTypes.get(event.sourceIP)!.add(event.type);
      }
      return Array.from(ipEventTypes.values()).some(types => types.size >= 3);
    },
  },
];

// Track which correlation rules have fired recently to avoid duplicates
const lastFired = new Map<string, number>();
const CORRELATION_COOLDOWN_MS = 10 * 60_000; // 10 minutes

/**
 * Add an event to the correlation window and check all rules
 */
export function correlate(event: IDSEvent): Alert[] {
  const now = Date.now();

  // Add to recent events and prune old ones
  recentEvents.push(event);
  const cutoff = now - CORRELATION_WINDOW_MS;
  while (recentEvents.length > 0 && recentEvents[0].timestamp.getTime() < cutoff) {
    recentEvents.shift();
  }

  const alerts: Alert[] = [];

  for (const rule of CORRELATION_RULES) {
    const lastFireTime = lastFired.get(rule.name) || 0;
    if (now - lastFireTime < CORRELATION_COOLDOWN_MS) continue;

    if (rule.check(recentEvents)) {
      lastFired.set(rule.name, now);
      logger.warn('Correlation rule triggered', { rule: rule.name });

      alerts.push({
        id: '',
        type: 'correlation_alert',
        severity: rule.severity,
        description: `[CORRELATION] ${rule.description}`,
        timestamp: new Date(),
        acknowledged: false,
        channels: ['console', 'file'],
        metadata: rule.metadata ? rule.metadata(recentEvents) : { rule: rule.name },
      });
    }
  }

  return alerts;
}
