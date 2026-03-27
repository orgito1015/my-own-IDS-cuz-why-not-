# 🛡️ IDS/SIEM-Lite — Production-Grade Intrusion Detection System

A modular, extensible Intrusion Detection and Security Information & Event Management system built with **Node.js + TypeScript**. Designed to run on Debian/Ubuntu Linux servers with clean architecture, multi-channel alerting, and a real-time REST + WebSocket API.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   IDS/SIEM System v2.0                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  COLLECTORS (real-time data ingestion)                   │
│  ├─ networkCollector  → pcap → NetworkPacket             │
│  ├─ logCollector      → auth.log/syslog → LogEntry       │
│  └─ fileCollector     → chokidar → FileEvent             │
│                          │                               │
│  CORE (detection logic)                                  │
│  ├─ detectionEngine   → orchestrates all rules           │
│  ├─ signatureRules    → port scan, brute force, SYN flood│
│  ├─ anomalyRules      → per-IP rate baseline & spikes    │
│  └─ correlationEngine → multi-event attack patterns      │
│                          │                               │
│  SERVICES (persistence & notification)                   │
│  ├─ storageService    → SQLite (events + alerts)         │
│  ├─ alertService      → console / file / email / webhook │
│  └─ wsService         → WebSocket real-time streaming    │
│                          │                               │
│  API (data access)                                       │
│  ├─ GET  /api/alerts  → paginated alert history          │
│  ├─ GET  /api/events  → paginated event history          │
│  ├─ GET  /api/stats   → counters, top IPs, baselines     │
│  └─ GET  /health      → liveness probe                   │
└──────────────────────────────────────────────────────────┘
```

### Folder structure

```
src/
├─ api/              REST API (Express)
│  └─ routes/        alerts · events · stats
├─ collectors/       data ingestion modules
│  ├─ networkCollector.ts   pcap packet capture
│  ├─ logCollector.ts       auth.log / syslog watcher
│  └─ fileCollector.ts      file integrity monitoring
├─ config/           environment-based configuration
├─ core/             detection engine & rules
│  ├─ detectionEngine.ts
│  ├─ correlationEngine.ts
│  └─ rules/
│     ├─ signatureRules.ts   port scan, brute force, SYN
│     └─ anomalyRules.ts     per-IP traffic baselines
├─ services/         alerting, storage, WebSocket
├─ types/            shared TypeScript interfaces
├─ utils/            logger (Winston), IP utilities
└─ __tests__/        Jest test suite
scripts/             attack simulation helpers
```

---

## 🔍 Detection Methods

### Signature-based
| Rule | Trigger | Severity |
|------|---------|----------|
| Port scan | ≥20 unique destination ports within 10 s from one IP | High |
| Suspicious port | Access to FTP (21), Telnet (23), RDP (3389), SMB (445), etc. | Medium |
| Brute force | ≥5 failed logins from one IP within 60 s | Critical |
| SYN flood | ≥50 SYN packets with <10 % ACK ratio within 5 s | Critical |

### Anomaly-based
| Rule | Trigger | Severity |
|------|---------|----------|
| Rate anomaly | >100 packets/min or >3× per-IP baseline average | Medium / High |

### Correlation
| Pattern | Description | Severity |
|---------|-------------|----------|
| `brute_force_then_traffic_spike` | Brute force + subsequent traffic spike → possible breach & exfiltration | Critical |
| `port_scan_then_suspicious_port` | Port scan followed by access to dangerous port → exploitation attempt | High |
| `multiple_attack_types` | ≥3 different attack types from same IP → coordinated attack | Critical |

---

## ⚡ Quick Start (native)

### Prerequisites

```bash
# Debian / Ubuntu
sudo apt-get update
sudo apt-get install -y nodejs npm libpcap-dev python3 make g++
```

Node.js ≥ 18 required.

### Install & build

```bash
git clone https://github.com/orgito1015/my-own-IDS-cuz-why-not-.git
cd my-own-IDS-cuz-why-not-

cp .env.example .env       # edit as needed
npm install
npm run build
```

### Run

```bash
# Development (ts-node, hot-reload friendly)
npm run dev

# Production (compiled JS)
npm start

# Run as root for packet capture (required for pcap)
sudo npm start
```

The API server starts on port **3000** by default.

---

## 🐳 Docker / Docker Compose

```bash
cp .env.example .env   # fill in SMTP / webhook credentials

docker compose up -d
```

Services started:
- `ids-app` — IDS backend on port 3000
- `ids-redis` — Redis 7 (cache layer, port 6379)

> **Note:** `network_mode: host` is enabled so pcap can capture host traffic. Remove it if you only need log/file monitoring.

---

## 🔧 Configuration (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Environment |
| `DB_PATH` | `./data/ids.db` | SQLite database path |
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `ALERT_EMAIL_TO` | — | Recipient email for alerts |
| `WEBHOOK_URL` | — | Slack / Discord webhook URL |
| `NETWORK_INTERFACE` | `eth0` | Network interface to sniff |
| `PACKET_FILTER` | `tcp or udp` | libpcap BPF filter |
| `MONITOR_PATHS` | `./data/monitored` | Comma-separated paths for FIM |
| `BASELINE_FILE` | `./data/fim_baseline.json` | FIM baseline file |
| `LOG_PATHS` | `/var/log/auth.log` | Comma-separated log files |
| `RATE_THRESHOLD` | `100` | Packets/min before rate alert |
| `PORT_SCAN_THRESHOLD` | `20` | Unique ports before scan alert |
| `BRUTE_FORCE_THRESHOLD` | `5` | Failed logins before alert |
| `BRUTE_FORCE_WINDOW_MS` | `60000` | Brute-force detection window |

---

## 📡 API Endpoints

```
GET  /health                          → liveness probe
GET  /api/alerts                      → list alerts (limit, offset)
GET  /api/alerts/ip/:ip               → alerts for a specific IP
PATCH /api/alerts/:id/acknowledge     → acknowledge an alert
GET  /api/events                      → list events (limit, offset, type)
GET  /api/stats                       → counts, top IPs, traffic baselines
```

### WebSocket (real-time alerts)

Connect to `ws://localhost:3000`.

Messages received:
```json
{ "type": "alert",             "data": { ... } }
{ "type": "correlation_alert", "data": { ... } }
{ "type": "connected",         "message": "IDS WebSocket stream active" }
```

---

## 🚨 Alert Channels

| Channel | When active | Notes |
|---------|-------------|-------|
| Console | Always | Colour-coded by severity |
| File | Always | `logs/ids-alerts.log` (Winston) |
| Email | High + Critical | Requires SMTP config |
| Webhook | High + Critical | Slack / Discord compatible |

---

## 🧪 Simulating Attacks

Scripts in the `scripts/` directory let you test detection without a live attacker.

```bash
# Port scan (requires nmap + root)
sudo ./scripts/simulate_port_scan.sh 127.0.0.1

# Brute-force SSH (writes to /var/log/auth.log — requires sudo)
sudo ./scripts/simulate_brute_force.sh 15

# Traffic flood (requires hping3 or ping + root)
sudo ./scripts/simulate_traffic_flood.sh 127.0.0.1 300
```

---

## 🧾 Example Alert Output

```
🚨 [CRITICAL] Brute-force attack detected from 203.0.113.42: 5 failed attempts
   Time: 2024-01-15T14:23:01.000Z | Type: brute_force | IP: 203.0.113.42

🔴 [HIGH] Port scan detected from 10.0.0.1: 25 ports probed
   Time: 2024-01-15T14:23:05.000Z | Type: port_scan | IP: 10.0.0.1

🚨 [CRITICAL] [CORRELATION] Brute-force attempt followed by traffic spike
   Time: 2024-01-15T14:23:10.000Z | Type: correlation_alert | IP: N/A
```

---

## 🧪 Tests

```bash
npm test               # run all tests
npm run test:coverage  # with coverage report
```

Tests cover:
- Signature rules (port scan, suspicious port, brute force, SYN flood)
- Anomaly rules (rate threshold)
- IP utility functions (validation, private detection, sanitization)

---

## 🔐 Security Notes

- API input is validated with `express-validator` and sanitized
- Express is hardened with `helmet` and `cors`
- Rate limiting on all API routes (500 req / 15 min)
- SQLite queries use parameterized statements (no SQL injection)
- Secrets are loaded from environment variables only — never committed
- Packet capture requires `CAP_NET_RAW`; all other components run as non-root

---

## 📋 Roadmap

- [ ] React dashboard (live alerts, traffic charts)
- [ ] Redis caching for hot stats
- [ ] PostgreSQL / MongoDB storage backend option
- [ ] GeoIP enrichment for source IPs
- [ ] ML-based anomaly scoring
- [ ] MITRE ATT&CK tactic tagging
