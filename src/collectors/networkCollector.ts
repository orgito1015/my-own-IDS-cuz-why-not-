import { NetworkPacket } from '../types';
import { detectionEngine } from '../core/detectionEngine';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Network packet collector using pcap
 * Falls back gracefully if pcap is unavailable (e.g., no root / no interface)
 */
export function startNetworkCollector(): void {
  try {
    // Dynamic require so the app still starts if pcap is not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pcap = require('pcap');

    const iface = config.network.interface;
    const filter = config.network.filter;

    logger.info(`Starting network collector on ${iface} with filter: "${filter}"`);

    const session = pcap.createSession(iface, { filter });

    session.on('packet', (rawPacket: unknown) => {
      try {
        const decoded = pcap.decode.packet(rawPacket);
        const packet = parsePacket(decoded);
        if (packet) {
          detectionEngine.processPacket(packet).catch((err: Error) => {
            logger.error('Error processing packet', { error: err.message });
          });
        }
      } catch {
        // Ignore malformed packets
      }
    });

    session.on('error', (err: Error) => {
      logger.error('pcap session error', { error: err.message });
    });

    logger.info('Network collector started');
  } catch (err) {
    logger.warn('pcap not available — network monitoring disabled. Run as root with libpcap installed.', {
      error: (err as Error).message,
    });
  }
}

/**
 * Parse a pcap decoded packet into our NetworkPacket type
 */
function parsePacket(decoded: unknown): NetworkPacket | null {
  try {
    const d = decoded as Record<string, unknown>;
    const payload = d['payload'] as Record<string, unknown> | undefined;
    const ip = payload?.['payload'] as Record<string, unknown> | undefined;
    if (!ip || !ip['saddr'] || !ip['daddr']) return null;

    const srcIP = String(ip['saddr']);
    const dstIP = String(ip['daddr']);

    // Determine protocol
    let protocol: NetworkPacket['protocol'] = 'OTHER';
    let srcPort = 0;
    let dstPort = 0;
    let tcpFlags: NetworkPacket['tcpFlags'] | undefined;

    const transport = ip['payload'] as Record<string, unknown> | undefined;
    if (!transport) return null;

    if (ip['protocol'] === 6) {
      // TCP
      protocol = 'TCP';
      srcPort = (transport['sport'] as number) || 0;
      dstPort = (transport['dport'] as number) || 0;
      const flags = (transport['flags'] as number) || 0;
      tcpFlags = {
        syn: (flags & 0x02) !== 0,
        ack: (flags & 0x10) !== 0,
        fin: (flags & 0x01) !== 0,
        rst: (flags & 0x04) !== 0,
        psh: (flags & 0x08) !== 0,
        urg: (flags & 0x20) !== 0,
      };
    } else if (ip['protocol'] === 17) {
      // UDP
      protocol = 'UDP';
      srcPort = (transport['sport'] as number) || 0;
      dstPort = (transport['dport'] as number) || 0;
    } else if (ip['protocol'] === 1) {
      protocol = 'ICMP';
    }

    return {
      srcIP,
      dstIP,
      srcPort,
      dstPort,
      protocol,
      tcpFlags,
      size: (payload?.['len'] as number) || 0,
      timestamp: new Date(),
    };
  } catch {
    return null;
  }
}
