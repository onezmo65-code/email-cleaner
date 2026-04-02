import { EmailRecord } from '../db/models';
import { checkDomainDnsbl } from './dnsblService';

export type FlagReason =
  | 'frequency'     // >10 emails from same sender
  | 'domain-match'  // same domain as searched address
  | 'exact-match'   // exact address search match
  | 'dnsbl'         // IP/domain on spam blocklist
  | 'rule';         // SpamAssassin-style rule hit

export interface FilterResult {
  uid: string;
  flagged: boolean;
  reason: FlagReason | null;
  detail: string;
}

// --- SpamAssassin-style subject/header rules ---
const SPAM_RULES: Array<{ pattern: RegExp; label: string }> = [
  // "free" only when paired with a prize/money word — avoids "free shipping", "free to use" etc.
  { pattern: /\bfree\s+(gift|money|cash|prize|iphone|ipad|vacation|cruise|trial offer|slot|spin)\b/i, label: 'spam-keyword-free' },
  // Prize/lottery keywords (standalone "won"/"free" removed — too many false positives)
  { pattern: /\b(winner|you('ve| have) won|lottery|sweepstakes|jackpot|you are a winner)\b/i, label: 'spam-keyword-prize' },
  // "claim" only in a spam prize context
  { pattern: /\bclaim\s+(your\s+)?(prize|reward|cash|gift|winnings|bonus)\b/i, label: 'spam-keyword-claim' },
  // Pharma spam
  { pattern: /\b(viagra|cialis|pharmacy pill|buy meds|online pharmacy)\b/i, label: 'spam-keyword-pharma' },
  // Aggressive CTAs — tightened to avoid "limited time" on legitimate sales
  { pattern: /\b(click here|act now|respond now|expires today|urgent action|last chance offer)\b/i, label: 'spam-keyword-cta' },
  // Money scams
  { pattern: /\b(earn \$|make money fast|cash out now|wire transfer|money transfer|send money)\b/i, label: 'spam-keyword-money' },
  // Phishing
  { pattern: /\b(verify your account|confirm your identity|account suspended|unusual sign.?in|security alert|your account (will be|has been) (suspended|closed|terminated))\b/i, label: 'spam-keyword-phish' },
  // Formatting abuse — raised caps threshold to 6 to avoid all-caps acronyms
  { pattern: /[A-Z]{6,}/, label: 'excessive-caps' },
  { pattern: /!{3,}/, label: 'excessive-exclamation' },
];

/**
 * Flag emails that appear more than threshold times from the same sender address.
 */
export function applyFrequencyFilter(
  emails: EmailRecord[],
  threshold = 10
): FilterResult[] {
  const countByAddress: Record<string, number> = {};
  for (const e of emails) {
    countByAddress[e.fromAddress] = (countByAddress[e.fromAddress] ?? 0) + 1;
  }

  return emails.map((e) => {
    const count = countByAddress[e.fromAddress];
    if (count > threshold) {
      return { uid: e.uid, flagged: true, reason: 'frequency', detail: `${count} emails from ${e.fromAddress}` };
    }
    return { uid: e.uid, flagged: false, reason: null, detail: '' };
  });
}

/**
 * Search by exact address → flag all emails from the same domain.
 * e.g. search "donotreply@capitalone.com" → flags all *@capitalone.com
 */
export function applyDomainFilter(
  emails: EmailRecord[],
  searchAddress: string
): FilterResult[] {
  const domain = searchAddress.split('@')[1]?.toLowerCase();
  if (!domain) return emails.map((e) => ({ uid: e.uid, flagged: false, reason: null, detail: '' }));

  return emails.map((e) => {
    const fromDomain = e.fromAddress.split('@')[1]?.toLowerCase();
    if (e.fromAddress.toLowerCase() === searchAddress.toLowerCase()) {
      return { uid: e.uid, flagged: true, reason: 'exact-match', detail: `Exact address match: ${searchAddress}` };
    }
    if (fromDomain === domain) {
      return { uid: e.uid, flagged: true, reason: 'domain-match', detail: `Domain match: *@${domain}` };
    }
    return { uid: e.uid, flagged: false, reason: null, detail: '' };
  });
}

/**
 * Apply SpamAssassin-style subject rules.
 */
export function applyRuleFilter(emails: EmailRecord[]): FilterResult[] {
  return emails.map((e) => {
    for (const rule of SPAM_RULES) {
      if (rule.pattern.test(e.subject)) {
        return { uid: e.uid, flagged: true, reason: 'rule', detail: `Rule hit: ${rule.label}` };
      }
    }
    return { uid: e.uid, flagged: false, reason: null, detail: '' };
  });
}

/**
 * DNSBL check for a list of unique sender domains.
 * Returns a Set of domains that are blocklisted.
 */
export async function buildDnsblBlocklist(emails: EmailRecord[]): Promise<Set<string>> {
  const domains = [...new Set(emails.map((e) => e.fromAddress.split('@')[1]).filter(Boolean))];
  const blocked = new Set<string>();

  // Check in parallel, batch of 20
  const BATCH = 20;
  for (let i = 0; i < domains.length; i += BATCH) {
    const batch = domains.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (d) => ({ domain: d, hit: await checkDomainDnsbl(d) }))
    );
    for (const r of results) {
      if (r.hit) blocked.add(r.domain);
    }
  }

  return blocked;
}

export function applyDnsblFilter(emails: EmailRecord[], blocklist: Set<string>): FilterResult[] {
  return emails.map((e) => {
    const domain = e.fromAddress.split('@')[1]?.toLowerCase();
    if (domain && blocklist.has(domain)) {
      return { uid: e.uid, flagged: true, reason: 'dnsbl', detail: `Domain ${domain} is on a spam blocklist` };
    }
    return { uid: e.uid, flagged: false, reason: null, detail: '' };
  });
}

/**
 * Run all filters and merge results.
 * A single email can be flagged by multiple rules — first match wins for display.
 */
export async function runAllFilters(
  emails: EmailRecord[],
  opts: {
    frequencyThreshold?: number;
    searchAddress?: string;
    runDnsbl?: boolean;
    runRules?: boolean;
  } = {}
): Promise<Map<string, FilterResult>> {
  const merged = new Map<string, FilterResult>(
    emails.map((e) => [e.uid, { uid: e.uid, flagged: false, reason: null, detail: '' }])
  );

  function merge(results: FilterResult[]) {
    for (const r of results) {
      if (r.flagged && !merged.get(r.uid)?.flagged) {
        merged.set(r.uid, r);
      }
    }
  }

  merge(applyFrequencyFilter(emails, opts.frequencyThreshold ?? 10));

  if (opts.searchAddress) {
    merge(applyDomainFilter(emails, opts.searchAddress));
  }

  if (opts.runRules !== false) {
    merge(applyRuleFilter(emails));
  }

  if (opts.runDnsbl) {
    const blocklist = await buildDnsblBlocklist(emails);
    merge(applyDnsblFilter(emails, blocklist));
  }

  return merged;
}
