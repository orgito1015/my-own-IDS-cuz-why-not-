#!/usr/bin/env bash
# Simulate a traffic flood / DDoS using hping3 or ping flood.
# Usage: ./simulate_traffic_flood.sh [target_ip] [count]
# Default target: 127.0.0.1, packets: 200

TARGET="${1:-127.0.0.1}"
COUNT="${2:-200}"

echo "[*] Simulating SYN flood / traffic spike towards ${TARGET} (${COUNT} packets)..."

if command -v hping3 &>/dev/null; then
    echo "[*] Using hping3 for SYN flood (requires sudo)..."
    sudo hping3 -S --flood -p 80 -c "${COUNT}" "${TARGET}" 2>&1
elif command -v ping &>/dev/null; then
    echo "[*] hping3 not found — falling back to ICMP flood with ping..."
    ping -f -c "${COUNT}" "${TARGET}" 2>&1
else
    echo "[!] Neither hping3 nor ping found. Install hping3: apt install hping3"
    exit 1
fi

echo "[*] Traffic flood simulation complete."
