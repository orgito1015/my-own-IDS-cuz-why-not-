import { NetworkPacket, IDSEvent, TrafficBaseline } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// Per-IP packet counters for current minute
const packetCounters = new Map<string, { count: number; minuteStart: number }>();

// Baseline per IP
const baselines = new Map<string, TrafficBaseline>();

const ANOMALY_MULTIPLIER = 3; // Alert if traffic is 3x the baseline average

/**
 * Track traffic rate per IP and detect anomalies
 */
export function detectRateAnomaly(packet: NetworkPacket): IDSEvent | null {
  const { srcIP, timestamp } = packet;
  const now = timestamp.getTime();
  const minuteStart = Math.floor(now / 60_000) * 60_000;

  // Update current minute counter
  let counter = packetCounters.get(srcIP);
  if (!counter || counter.minuteStart !== minuteStart) {
    // New minute: update baseline with previous minute's data
    if (counter) {
      updateBaseline(srcIP, counter.count);
    }
    counter = { count: 0, minuteStart };
    packetCounters.set(srcIP, counter);
  }
  counter.count++;

  // Check against absolute rate threshold (for IPs with no baseline yet)
  if (counter.count > config.detection.rateThreshold) {
    const baseline = baselines.get(srcIP);
    // Only alert if significantly above baseline or no baseline yet
    if (!baseline || counter.count > baseline.avgPacketsPerMinute * ANOMALY_MULTIPLIER) {
      logger.warn('Rate anomaly detected', { srcIP, count: counter.count });
      return {
        id: '',
        type: 'rate_anomaly',
        severity: counter.count > config.detection.rateThreshold * 2 ? 'high' : 'medium',
        sourceIP: srcIP,
        description: `Traffic spike from ${srcIP}: ${counter.count} packets/min (threshold: ${config.detection.rateThreshold})`,
        timestamp,
        metadata: {
          packetsPerMinute: counter.count,
          baseline: baseline?.avgPacketsPerMinute,
        },
      };
    }
  }

  return null;
}

function updateBaseline(ip: string, count: number): void {
  const existing = baselines.get(ip);
  if (!existing) {
    baselines.set(ip, {
      ip,
      avgPacketsPerMinute: count,
      peakPacketsPerMinute: count,
      samples: 1,
      lastUpdated: new Date(),
    });
  } else {
    // Exponential moving average
    const alpha = 0.2;
    existing.avgPacketsPerMinute = alpha * count + (1 - alpha) * existing.avgPacketsPerMinute;
    existing.peakPacketsPerMinute = Math.max(existing.peakPacketsPerMinute, count);
    existing.samples++;
    existing.lastUpdated = new Date();
  }
}

export function getAllBaselines(): TrafficBaseline[] {
  return Array.from(baselines.values());
}

export function getBaselineForIP(ip: string): TrafficBaseline | undefined {
  return baselines.get(ip);
}
