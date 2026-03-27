import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';

/**
 * WebSocket service for real-time alert streaming to dashboard clients
 */
class WsService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  attach(server: unknown): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      logger.info('WebSocket client connected', { clients: this.clients.size });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('WebSocket client disconnected', { clients: this.clients.size });
      });

      ws.on('error', (err) => {
        logger.error('WebSocket error', { error: err.message });
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({ type: 'connected', message: 'IDS WebSocket stream active' }));
    });

    logger.info('WebSocket server attached');
  }

  broadcast(data: object): void {
    if (this.clients.size === 0) return;
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}

export const wsService = new WsService();
