import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    path: process.env.DB_PATH || './data/ids.db',
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    to: process.env.ALERT_EMAIL_TO || '',
  },
  webhook: {
    url: process.env.WEBHOOK_URL || '',
  },
  network: {
    interface: process.env.NETWORK_INTERFACE || 'eth0',
    filter: process.env.PACKET_FILTER || 'tcp or udp',
  },
  fim: {
    monitorPaths: (process.env.MONITOR_PATHS || './data/monitored').split(',').map(p => p.trim()),
    baselineFile: process.env.BASELINE_FILE || './data/fim_baseline.json',
  },
  detection: {
    rateThreshold: parseInt(process.env.RATE_THRESHOLD || '100', 10),
    portScanThreshold: parseInt(process.env.PORT_SCAN_THRESHOLD || '20', 10),
    bruteForceThreshold: parseInt(process.env.BRUTE_FORCE_THRESHOLD || '5', 10),
    bruteForceWindowMs: parseInt(process.env.BRUTE_FORCE_WINDOW_MS || '60000', 10),
  },
  logs: {
    paths: (process.env.LOG_PATHS || '/var/log/auth.log').split(',').map(p => p.trim()),
  },
};
