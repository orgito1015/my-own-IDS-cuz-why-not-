export type Severity = 'low' | 'medium' | 'high' | 'critical';

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

export interface Alert {
  id: string;
  type: EventType;
  severity: Severity;
  sourceIP?: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  channels: string[];
  metadata?: Record<string, unknown>;
}

export interface Stats {
  totalEvents: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  eventsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  topSourceIPs: { ip: string; count: number }[];
  baselines?: unknown[];
}

export type WsMessage =
  | { type: 'connected'; message: string }
  | { type: 'alert'; data: Alert }
  | { type: 'event'; data: Record<string, unknown> };
