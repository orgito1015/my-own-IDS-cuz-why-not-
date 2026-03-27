import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { StatsOverview } from './components/StatsOverview';
import { TrafficCharts } from './components/TrafficCharts';
import { AlertsPanel } from './components/AlertsPanel';
import { useLiveAlerts } from './hooks/useLiveAlerts';
import type { Alert, Stats } from './types';

const REFRESH_INTERVAL_MS = 30_000;

async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch('/api/alerts?limit=100');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { alerts: Alert[] };
  return json.alerts;
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Stats>;
}

async function acknowledgeAlert(id: string): Promise<void> {
  await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' });
}

function App() {
  const [initialAlerts, setInitialAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { alerts, setAlerts, wsStatus } = useLiveAlerts(initialAlerts);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [fetchedAlerts, fetchedStats] = await Promise.all([fetchAlerts(), fetchStats()]);
      setInitialAlerts(fetchedAlerts);
      setStats(fetchedStats);
      setLastRefresh(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-refresh stats every 30 s
  useEffect(() => {
    const timer = setInterval(() => { void refresh(); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
    setStats((prev) =>
      prev
        ? { ...prev, unacknowledgedAlerts: Math.max(0, prev.unacknowledgedAlerts - 1) }
        : prev
    );
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="header-icon">🛡️</span>
          <div>
            <h1 className="header-title">IDS Dashboard</h1>
            <span className="header-subtitle">Intrusion Detection &amp; SIEM</span>
          </div>
        </div>
        <div className="header-actions">
          {error && <span className="error-badge">⚠️ {error}</span>}
          <span className="refresh-info">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button className="refresh-btn" onClick={() => { void refresh(); }}>
            ↻ Refresh
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <StatsOverview stats={stats} loading={statsLoading} />
        <TrafficCharts stats={stats} loading={statsLoading} />
        <AlertsPanel
          alerts={alerts}
          wsStatus={wsStatus}
          onAcknowledge={(id) => { void handleAcknowledge(id); }}
        />
      </main>

      <footer className="dashboard-footer">
        <span>Simple IDS v2.0 · Stats auto-refresh every 30 s · Alerts streamed via WebSocket</span>
      </footer>
    </div>
  );
}

export default App;
