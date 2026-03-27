/**
 * Utility functions for IP address manipulation and validation
 */

/**
 * Validate an IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  return ip.split('.').every(octet => parseInt(octet, 10) <= 255);
}

/**
 * Check if an IP is a private/internal address
 */
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    ip === '127.0.0.1' ||
    ip === '::1'
  );
}

/**
 * Convert IP string to numeric representation for range checks
 */
export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Sanitize user input that may contain an IP address
 */
export function sanitizeIP(input: string): string {
  // Strip any characters that are not valid in an IP address
  return input.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45);
}
