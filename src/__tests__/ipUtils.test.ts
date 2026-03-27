import { isValidIPv4, isPrivateIP, sanitizeIP } from '../utils/ipUtils';

describe('IP Utilities', () => {
  describe('isValidIPv4', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
      expect(isValidIPv4('10.0.0.1')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.0.0.1')).toBe(false);
      expect(isValidIPv4('not-an-ip')).toBe(false);
      expect(isValidIPv4('192.168.1')).toBe(false);
    });
  });

  describe('isPrivateIP', () => {
    it('should identify private IPs', () => {
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('should identify public IPs as non-private', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
    });
  });

  describe('sanitizeIP', () => {
    it('should strip dangerous characters', () => {
      expect(sanitizeIP('192.168.1.1')).toBe('192.168.1.1');
      expect(sanitizeIP('192.168.1.1; DROP TABLE')).toBe('192.168.1.1');
      expect(sanitizeIP('<script>alert(1)</script>')).toBe('');
    });
  });
});
