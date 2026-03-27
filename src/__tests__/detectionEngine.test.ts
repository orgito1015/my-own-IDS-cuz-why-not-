import { detectPortScan, detectSuspiciousPort, detectBruteForce, detectSynFlood } from '../core/rules/signatureRules';
import { detectRateAnomaly } from '../core/rules/anomalyRules';
import { NetworkPacket } from '../types';

function makePacket(override: Partial<NetworkPacket> = {}): NetworkPacket {
  return {
    srcIP: '192.168.1.100',
    dstIP: '10.0.0.1',
    srcPort: 54321,
    dstPort: 80,
    protocol: 'TCP',
    size: 64,
    timestamp: new Date(),
    ...override,
  };
}

describe('Signature Rules', () => {
  describe('detectPortScan', () => {
    it('should return null for normal traffic', () => {
      const packet = makePacket({ dstPort: 80 });
      // Single packet should not trigger
      expect(detectPortScan(packet)).toBeNull();
    });

    it('should detect a port scan when many ports are probed', () => {
      const srcIP = `10.0.0.${Math.floor(Math.random() * 200) + 50}`;
      let result = null;
      for (let port = 1; port <= 25; port++) {
        result = detectPortScan(makePacket({ srcIP, dstPort: port }));
        if (result) break;
      }
      expect(result).not.toBeNull();
      expect(result?.type).toBe('port_scan');
      expect(result?.severity).toBe('high');
    });
  });

  describe('detectSuspiciousPort', () => {
    it('should detect access to telnet port', () => {
      const result = detectSuspiciousPort(makePacket({ dstPort: 23 }));
      expect(result).not.toBeNull();
      expect(result?.type).toBe('suspicious_port');
    });

    it('should return null for normal HTTP traffic', () => {
      const result = detectSuspiciousPort(makePacket({ dstPort: 80 }));
      expect(result).toBeNull();
    });

    it('should detect access to RDP port', () => {
      const result = detectSuspiciousPort(makePacket({ dstPort: 3389 }));
      expect(result).not.toBeNull();
    });
  });

  describe('detectBruteForce', () => {
    it('should detect brute force after threshold attempts', () => {
      const ip = `10.1.1.${Math.floor(Math.random() * 200) + 50}`;
      let result = null;
      for (let i = 0; i < 10; i++) {
        result = detectBruteForce(ip, 'root', new Date());
        if (result) break;
      }
      expect(result).not.toBeNull();
      expect(result?.type).toBe('brute_force');
      expect(result?.severity).toBe('critical');
    });

    it('should not trigger for single attempt', () => {
      const ip = `172.16.${Math.floor(Math.random() * 255)}.1`;
      const result = detectBruteForce(ip, 'admin', new Date());
      expect(result).toBeNull();
    });
  });

  describe('detectSynFlood', () => {
    it('should detect SYN flood', () => {
      const srcIP = `203.0.113.${Math.floor(Math.random() * 200) + 50}`;
      let result = null;
      for (let i = 0; i < 60; i++) {
        result = detectSynFlood(makePacket({
          srcIP,
          tcpFlags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        }));
        if (result) break;
      }
      expect(result).not.toBeNull();
      expect(result?.type).toBe('ddos');
    });
  });
});

describe('Anomaly Rules', () => {
  describe('detectRateAnomaly', () => {
    it('should return null for low traffic', () => {
      const result = detectRateAnomaly(makePacket());
      expect(result).toBeNull();
    });

    it('should detect rate anomaly after threshold', () => {
      const srcIP = `198.51.100.${Math.floor(Math.random() * 200) + 50}`;
      let result = null;
      for (let i = 0; i < 110; i++) {
        result = detectRateAnomaly(makePacket({ srcIP }));
        if (result) break;
      }
      expect(result).not.toBeNull();
      expect(result?.type).toBe('rate_anomaly');
    });
  });
});
