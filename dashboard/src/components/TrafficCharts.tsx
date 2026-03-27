import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { Stats } from '../types';
import { formatEventType, severityColor } from '../utils';

interface TrafficChartsProps {
  stats: Stats | null;
  loading: boolean;
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

export function TrafficCharts({ stats, loading }: TrafficChartsProps) {
  const eventsByTypeData = stats
    ? Object.entries(stats.eventsByType).map(([type, count]) => ({
        name: formatEventType(type),
        count,
      }))
    : [];

  const alertsBySeverityData = stats
    ? SEVERITY_ORDER.filter((s) => s in stats.alertsBySeverity).map((s) => ({
        name: s.charAt(0).toUpperCase() + s.slice(1),
        value: stats.alertsBySeverity[s],
        color: severityColor(s),
      }))
    : [];

  const topIPsData = stats ? stats.topSourceIPs.slice(0, 10) : [];

  if (loading) {
    return (
      <div className="charts-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="chart-card">
            <div className="skeleton chart-skeleton" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="charts-grid">
      {/* Events by Type */}
      <div className="chart-card">
        <h3 className="chart-title">Events by Type</h3>
        {eventsByTypeData.length === 0 ? (
          <p className="no-data">No event data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={eventsByTypeData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alerts by Severity */}
      <div className="chart-card">
        <h3 className="chart-title">Alerts by Severity</h3>
        {alertsBySeverityData.length === 0 ? (
          <p className="no-data">No alert data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={alertsBySeverityData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : name
                }
                labelLine={false}
              >
                {alertsBySeverityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Alerts']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Source IPs */}
      <div className="chart-card">
        <h3 className="chart-title">Top Source IPs</h3>
        {topIPsData.length === 0 ? (
          <p className="no-data">No IP data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={topIPsData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 70, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="ip" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
