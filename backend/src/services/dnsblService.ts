import dns from 'dns/promises';

// Free DNSBL lists — no signup required
const DNSBL_LISTS = [
  'zen.spamhaus.org',
  'bl.spamcop.net',
  'multi.surbl.org',
  'dnsbl.sorbs.net',
];

/**
 * Check if an IP address is listed in any DNSBL.
 * Returns the first blocklist name that matches, or null if clean.
 */
export async function checkIpDnsbl(ip: string): Promise<string | null> {
  const reversed = ip.split('.').reverse().join('.');

  for (const list of DNSBL_LISTS) {
    try {
      await dns.resolve4(`${reversed}.${list}`);
      return list; // listed = spam
    } catch {
      // NXDOMAIN = not listed, continue
    }
  }
  return null;
}

/**
 * Resolve the sending domain to an IP, then DNSBL-check it.
 */
export async function checkDomainDnsbl(domain: string): Promise<string | null> {
  try {
    const [ip] = await dns.resolve4(domain);
    return checkIpDnsbl(ip);
  } catch {
    return null;
  }
}
