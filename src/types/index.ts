/**
 * Core types for the IDS/SIEM system
 */

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type AlertChannel = 'console' | 'file' | 'email' | 'webhook';

export type EventType =
  | 'port_scan'
  | 'brute_force'
  | 'ddos'
  | 'suspicious_port'
  | 'rate_anomaly'
  | 'file_modified'
  | 'file_created'
  | 'file_deleted'
  | 'failed_login'
  | 'successful_login'
  | 'correlation_alert'
  | 'unknown';

export interface NetworkPacket {
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER';
  tcpFlags?: {
    syn: boolean;
    ack: boolean;
    fin: boolean;
    rst: boolean;
    psh: boolean;
    urg: boolean;
  };
  size: number;
  timestamp: Date;
}

export interface LogEntry {
  source: string;      // which log file
  rawLine: string;
  timestamp: Date;
  severity?: string;
  ip?: string;
  username?: string;
  message?: string;
  eventType?: EventType;
}

export interface FileEvent {
  path: string;
  event: 'created' | 'modified' | 'deleted';
  hash?: string;
  previousHash?: string;
  timestamp: Date;
}

export interface IDSEvent {
  id: string;
  type: EventType;
  severity: Severity;
  sourceIP?: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Alert extends IDSEvent {
  acknowledged: boolean;
  channels: AlertChannel[];
}

export interface TrafficBaseline {
  ip: string;
  avgPacketsPerMinute: number;
  peakPacketsPerMinute: number;
  samples: number;
  lastUpdated: Date;
}

export interface Session {
  id: string;
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  protocol: string;
  startTime: Date;
  lastSeen: Date;
  packetCount: number;
  byteCount: number;
  flags: Set<string>;
}
