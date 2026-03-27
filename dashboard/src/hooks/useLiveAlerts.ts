import { useState, useEffect, useCallback, useRef } from 'react';
import type { Alert, WsMessage } from '../types';

const WS_URL = `ws://${window.location.host}`;

export function useLiveAlerts(initialAlerts: Alert[]) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setWsStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        if (msg.type === 'alert' && msg.data) {
          setAlerts((prev) => [msg.data, ...prev].slice(0, 200));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      wsRef.current = null;
      // Reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Update alerts when initialAlerts changes (from REST fetch)
  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  return { alerts, setAlerts, wsStatus };
}
