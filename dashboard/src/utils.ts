import type { Severity } from './types/index';

export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'medium':   return '#eab308';
    case 'low':      return '#22c55e';
    default:         return '#6b7280';
  }
}

export function severityBg(severity: Severity): string {
  switch (severity) {
    case 'critical': return '#fef2f2';
    case 'high':     return '#fff7ed';
    case 'medium':   return '#fefce8';
    case 'low':      return '#f0fdf4';
    default:         return '#f9fafb';
  }
}

export function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}
