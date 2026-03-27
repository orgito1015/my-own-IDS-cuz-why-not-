import type { Alert } from '../types';
import { severityColor, severityBg, formatEventType, formatTimestamp } from '../utils';

interface AlertsPanelProps {
  alerts: Alert[];
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  onAcknowledge: (id: string) => void;
}

const WS_STATUS_LABEL: Record<string, string> = {
  connected: '🟢 Live',
  connecting: '🟡 Connecting…',
  disconnected: '🔴 Disconnected',
};

export function AlertsPanel({ alerts, wsStatus, onAcknowledge }: AlertsPanelProps) {
  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3 className="chart-title" style={{ margin: 0 }}>Live Alerts</h3>
        <span className="ws-badge">{WS_STATUS_LABEL[wsStatus]}</span>
      </div>

      {alerts.length === 0 ? (
        <p className="no-data" style={{ padding: '2rem' }}>No alerts yet — system is quiet 🔇</p>
      ) : (
        <div className="alerts-table-wrap">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Type</th>
                <th>Source IP</th>
                <th>Description</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={alert.acknowledged ? 'acked' : 'unacked'}
                  style={{ backgroundColor: alert.acknowledged ? '#f9fafb' : severityBg(alert.severity) }}
                >
                  <td>
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: severityColor(alert.severity), color: '#fff' }}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td>{formatEventType(alert.type)}</td>
                  <td className="ip-cell">{alert.sourceIP || '—'}</td>
                  <td className="desc-cell">{alert.description}</td>
                  <td className="time-cell">{formatTimestamp(alert.timestamp)}</td>
                  <td>
                    {alert.acknowledged ? (
                      <span className="ack-badge">✓ Acked</span>
                    ) : (
                      <button
                        className="ack-btn"
                        onClick={() => onAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
