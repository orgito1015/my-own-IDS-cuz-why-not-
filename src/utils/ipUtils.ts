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
 * Sanitize user input that may contain an IP address.
 * Extracts a valid IPv4 or IPv6 address from the start of the input,
 * returning an empty string if no valid address is found.
 */
export function sanitizeIP(input: string): string {
  const trimmed = input.trim();
  // Try to extract a valid IPv4 address anchored at the start
  const ipv4Match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (ipv4Match) {
    return isValidIPv4(ipv4Match[1]) ? ipv4Match[1] : '';
  }
  // Try to extract an IPv6 address anchored at the start
  const ipv6Match = trimmed.match(/^[0-9a-fA-F:]{2,39}/);
  if (ipv6Match && ipv6Match[0].includes(':')) return ipv6Match[0];
  return '';
}
