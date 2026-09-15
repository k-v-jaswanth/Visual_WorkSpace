/**
 * Strict email validation & typo detection for Google Accounts and workspace login.
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

// Common typo domains for popular email providers
const DOMAIN_TYPO_MAP: Record<string, string> = {
  'gmail.xocm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cmo': 'gmail.com',
  'gmail.coom': 'gmail.com',
  'gmail.ocm': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'googlemail.xocm': 'googlemail.com',
  'googlemail.con': 'googlemail.com',
  'yahoo.xocm': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outlook.xocm': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlok.com': 'outlook.com',
  'hotmail.xocm': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
};

// Common invalid TLD typos
const INVALID_TLD_TYPOS = new Set([
  'xocm', 'con', 'cmo', 'coom', 'ocm', 'comm', 'vom', 'xom', 'cpm', 'kom', 'col'
]);

// Valid popular TLDs
const VALID_COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'in', 'ai', 'app', 'dev',
  'me', 'tech', 'info', 'biz', 'xyz', 'online', 'site', 'cloud', 'global', 'pro',
  'uk', 'ca', 'de', 'jp', 'fr', 'au', 'nl', 'br', 'ru', 'ch', 'it', 'se', 'no',
  'es', 'sg', 'ae', 'za', 'nz', 'ie', 'kr', 'cn', 'hk', 'tw', 'mx', 'ac.in', 'co.in'
]);

export function validateEmail(rawEmail: string): EmailValidationResult {
  const email = (rawEmail || '').trim().toLowerCase();

  if (!email) {
    return { isValid: false, error: 'Email address is required.' };
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email address exceeds maximum length of 254 characters.' };
  }

  // Basic RFC 5322 regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@domain.com).' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Email must contain exactly one @ symbol.' };
  }

  const [localPart, domain] = parts;

  if (localPart.length > 64) {
    return { isValid: false, error: 'Email username cannot exceed 64 characters.' };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, error: 'Email username cannot start, end with, or contain consecutive dots.' };
  }

  // Check domain typos
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggestion = `${localPart}@${DOMAIN_TYPO_MAP[domain]}`;
    return {
      isValid: false,
      error: `Invalid email domain "@${domain}". Did you mean "${suggestion}"?`,
      suggestion,
    };
  }

  // Check domain parts and TLD
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'Email domain must include a top-level domain (e.g. .com).' };
  }

  const tld = domainParts[domainParts.length - 1];

  // Disallow invalid TLD typos like .xocm
  if (INVALID_TLD_TYPOS.has(tld)) {
    return {
      isValid: false,
      error: `".${tld}" is not a valid top-level domain. Did you mean ".com"?`,
      suggestion: `${localPart}@${domainParts.slice(0, -1).join('.')}.com`,
    };
  }

  // TLD must only contain letters, length 2..24
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return { isValid: false, error: `Invalid domain extension ".${tld}".` };
  }

  // Check gmail domain specifically
  if (domain.startsWith('gmail.') && domain !== 'gmail.com') {
    return {
      isValid: false,
      error: `Invalid Google Account domain "@${domain}". Did you mean "@gmail.com"?`,
      suggestion: `${localPart}@gmail.com`,
    };
  }

  return { isValid: true };
}
