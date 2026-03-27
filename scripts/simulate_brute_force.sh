#!/usr/bin/env bash
# Simulate an SSH brute-force attack by writing crafted log lines directly
# into /var/log/auth.log (no actual SSH connections needed).
# Usage: sudo ./simulate_brute_force.sh [attempts]

ATTEMPTS="${1:-10}"
ATTACKER_IP="203.0.113.42"
LOG_FILE="/var/log/auth.log"

echo "[*] Simulating ${ATTEMPTS} failed SSH logins from ${ATTACKER_IP}..."
echo "[*] Writing to ${LOG_FILE} — requires sudo"

for i in $(seq 1 "${ATTEMPTS}"); do
    TIMESTAMP=$(date '+%b %e %H:%M:%S')
    echo "${TIMESTAMP} ids-host sshd[1234]: Failed password for root from ${ATTACKER_IP} port 54321 ssh2" \
        | sudo tee -a "${LOG_FILE}" > /dev/null
    sleep 0.2
done

echo "[*] Brute-force simulation complete. Check IDS alerts."
