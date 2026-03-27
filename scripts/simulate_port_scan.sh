#!/usr/bin/env bash
# Simulate a port scan using nmap (requires nmap installed).
# Usage: ./simulate_port_scan.sh [target_ip]
# Default target: 127.0.0.1

TARGET="${1:-127.0.0.1}"

echo "[*] Simulating port scan against ${TARGET}..."
echo "[*] Requires: nmap (apt install nmap)"

# SYN scan across a wide port range — triggers port_scan detection rule
nmap -sS -p 1-1000 --min-rate 500 "${TARGET}" 2>&1

echo "[*] Port scan simulation complete."
