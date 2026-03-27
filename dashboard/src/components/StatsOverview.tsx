import type { Stats } from '../types';

interface StatsOverviewProps {
  stats: Stats | null;
  loading: boolean;
}

export function StatsOverview({ stats, loading }: StatsOverviewProps) {
  const cards = [
    {
      label: 'Total Events',
      value: stats?.totalEvents ?? '—',
      color: '#3b82f6',
      icon: '📡',
    },
    {
      label: 'Total Alerts',
      value: stats?.totalAlerts ?? '—',
      color: '#8b5cf6',
      icon: '🚨',
    },
    {
      label: 'Unacknowledged',
      value: stats?.unacknowledgedAlerts ?? '—',
      color: '#ef4444',
      icon: '⚠️',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card" style={{ borderTopColor: card.color }}>
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: card.color }}>
              {loading ? <span className="skeleton" /> : card.value}
            </div>
            <div className="stat-label">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
