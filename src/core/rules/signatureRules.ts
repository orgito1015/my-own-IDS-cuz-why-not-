import { NetworkPacket, IDSEvent } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// Suspicious ports that should rarely be accessed
const SUSPICIOUS_PORTS = new Set([
  21,   // FTP
  23,   // Telnet
  135,  // RPC
  139,  // NetBIOS
  445,  // SMB
  1433, // MSSQL
  3306, // MySQL (external access)
  3389, // RDP
  4444, // Metasploit default
  5900, // VNC
  6667, // IRC (malware C2)
]);

// Track port scan candidates: srcIP → Set of unique dst ports contacted within time window
const portScanTracker = new Map<string, { ports: Set<number>; windowStart: number }>();
const PORT_SCAN_WINDOW_MS = 10_000; // 10 seconds

/**
 * Detect port scans: many different destination ports from one source IP
 */
export function detectPortScan(packet: NetworkPacket): IDSEvent | null {
  const { srcIP, dstPort, timestamp } = packet;
  const now = timestamp.getTime();

  let entry = portScanTracker.get(srcIP);
  if (!entry || now - entry.windowStart > PORT_SCAN_WINDOW_MS) {
    entry = { ports: new Set(), windowStart: now };
    portScanTracker.set(srcIP, entry);
  }

  entry.ports.add(dstPort);

  if (entry.ports.size >= config.detection.portScanThreshold) {
    const portList = Array.from(entry.ports).sort((a, b) => a - b);
    // Reset to avoid repeated alerts
    portScanTracker.delete(srcIP);
    logger.warn('Port scan detected', { srcIP, ports: portList.length });

    return {
      id: '',
      type: 'port_scan',
      severity: 'high',
      sourceIP: srcIP,
      description: `Port scan detected from ${srcIP}: ${portList.length} ports probed`,
      timestamp,
      metadata: { ports: portList },
    };
  }

  return null;
}

/**
 * Detect access to suspicious/dangerous ports
 */
export function detectSuspiciousPort(packet: NetworkPacket): IDSEvent | null {
  const { srcIP, dstPort, timestamp } = packet;

  if (SUSPICIOUS_PORTS.has(dstPort)) {
    const portName = getPortName(dstPort);
    return {
      id: '',
      type: 'suspicious_port',
      severity: 'medium',
      sourceIP: srcIP,
      description: `Suspicious port access: ${srcIP} → port ${dstPort} (${portName})`,
      timestamp,
      metadata: { port: dstPort, portName },
    };
  }

  return null;
}

function getPortName(port: number): string {
  const names: Record<number, string> = {
    21: 'FTP', 23: 'Telnet', 135: 'RPC', 139: 'NetBIOS',
    445: 'SMB', 1433: 'MSSQL', 3306: 'MySQL', 3389: 'RDP',
    4444: 'Metasploit', 5900: 'VNC', 6667: 'IRC/C2',
  };
  return names[port] || 'unknown';
}

// Track failed login attempts: IP → { count, windowStart }
const bruteForceTracker = new Map<string, { count: number; windowStart: number; usernames: Set<string> }>();

/**
 * Detect brute-force SSH/login attempts from log events
 */
export function detectBruteForce(
  ip: string,
  username: string,
  timestamp: Date
): IDSEvent | null {
  const now = timestamp.getTime();
  const window = config.detection.bruteForceWindowMs;
  const threshold = config.detection.bruteForceThreshold;

  let entry = bruteForceTracker.get(ip);
  if (!entry || now - entry.windowStart > window) {
    entry = { count: 0, windowStart: now, usernames: new Set() };
    bruteForceTracker.set(ip, entry);
  }

  entry.count++;
  if (username) entry.usernames.add(username);

  if (entry.count >= threshold) {
    bruteForceTracker.delete(ip);
    logger.warn('Brute force detected', { ip, attempts: entry.count });

    return {
      id: '',
      type: 'brute_force',
      severity: 'critical',
      sourceIP: ip,
      description: `Brute-force attack detected from ${ip}: ${entry.count} failed attempts`,
      timestamp,
      metadata: { attempts: entry.count, usernames: Array.from(entry.usernames) },
    };
  }

  return null;
}

/**
 * Detect SYN flood (many SYN packets, few ACKs)
 */
const synFloodTracker = new Map<string, { synCount: number; ackCount: number; windowStart: number }>();
const SYN_FLOOD_WINDOW_MS = 5_000;
const SYN_FLOOD_THRESHOLD = 50;

export function detectSynFlood(packet: NetworkPacket): IDSEvent | null {
  if (!packet.tcpFlags) return null;

  const { srcIP, tcpFlags, timestamp } = packet;
  const now = timestamp.getTime();

  let entry = synFloodTracker.get(srcIP);
  if (!entry || now - entry.windowStart > SYN_FLOOD_WINDOW_MS) {
    entry = { synCount: 0, ackCount: 0, windowStart: now };
    synFloodTracker.set(srcIP, entry);
  }

  if (tcpFlags.syn && !tcpFlags.ack) entry.synCount++;
  if (tcpFlags.ack) entry.ackCount++;

  // SYN flood: many SYNs with very few ACKs
  if (entry.synCount >= SYN_FLOOD_THRESHOLD && entry.ackCount < entry.synCount * 0.1) {
    synFloodTracker.delete(srcIP);
    return {
      id: '',
      type: 'ddos',
      severity: 'critical',
      sourceIP: srcIP,
      description: `SYN flood detected from ${srcIP}: ${entry.synCount} SYN packets`,
      timestamp,
      metadata: { synCount: entry.synCount, ackCount: entry.ackCount },
    };
  }

  return null;
}
