// ============================================================================
// Omniflow - Utility Functions
// ============================================================================

import { createHash, randomBytes } from 'crypto';

// ----------------------------------------------------------------------------
// Slug generation
// ----------------------------------------------------------------------------

/**
 * Convert an arbitrary name string into a URL-safe slug.
 * e.g. "Hello World! 2024" → "hello-world-2024"
 */
export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    // Remove diacritic marks
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Strip leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse consecutive hyphens
    .replace(/-{2,}/g, '-')
    // Limit length
    .slice(0, 64);
}

// ----------------------------------------------------------------------------
// API key generation
// ----------------------------------------------------------------------------

export interface GeneratedApiKey {
  /** Full key shown once to the user — store only `hash` */
  key: string;
  /** SHA-256 hash of `key` — safe to persist in the database */
  hash: string;
  /** Human-readable prefix for display (e.g. "nxk_xxxx...") */
  prefix: string;
}

/**
 * Generate a secure API key with a SHA-256 hash for safe storage.
 * The raw key is returned only once; persist only `hash` and `prefix`.
 */
export function generateApiKey(): GeneratedApiKey {
  const randomPart = randomBytes(32).toString('hex');
  const key = `nxk_${randomPart}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

// ----------------------------------------------------------------------------
// Currency formatting
// ----------------------------------------------------------------------------

/**
 * Format a monetary amount using the browser / Node Intl API.
 * Amounts are expected as the smallest currency unit (e.g. cents for USD).
 *
 * @param amount   - Amount in major currency units (e.g. 19.99)
 * @param currency - ISO 4217 currency code (e.g. "USD")
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

// ----------------------------------------------------------------------------
// Sort parsing
// ----------------------------------------------------------------------------

/**
 * Parse a sort query param like "createdAt:desc" or "name" into a typed object.
 * Defaults to ascending when no direction is specified.
 */
export function parseSort(sort: string): { field: string; order: 'asc' | 'desc' } {
  const parts = sort.trim().split(':');
  const field = parts[0]?.trim() ?? 'createdAt';
  const rawOrder = parts[1]?.trim().toLowerCase();
  const order: 'asc' | 'desc' = rawOrder === 'desc' ? 'desc' : 'asc';
  return { field, order };
}

// ----------------------------------------------------------------------------
// Privacy masking
// ----------------------------------------------------------------------------

/**
 * Mask an email address for display.
 * "john.doe@example.com" → "jo***e@example.com"
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }

  const visible = Math.max(2, Math.floor(localPart.length * 0.3));
  const masked = '*'.repeat(localPart.length - visible * 2);
  return `${localPart.slice(0, visible)}${masked}${localPart.slice(-visible)}@${domain}`;
}

/**
 * Mask a phone number for display, preserving the last 4 digits.
 * "+12125550100" → "+1******0100"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;

  const lastFour = digits.slice(-4);
  const prefix = phone.startsWith('+') ? '+' : '';
  const masked = '*'.repeat(digits.length - 4);
  return `${prefix}${masked}${lastFour}`;
}

// ----------------------------------------------------------------------------
// Pagination helpers
// ----------------------------------------------------------------------------

export interface PaginationMeta {
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Compute pagination metadata from totals.
 */
export function calculatePagination(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ----------------------------------------------------------------------------
// Cron expression validation
// ----------------------------------------------------------------------------

/**
 * Validate a 5-part cron expression (minute hour day month weekday).
 * Returns true when the expression looks structurally valid.
 * This is a lightweight check — it does not evaluate edge cases like Feb 30.
 */
export function isValidCron(expression: string): boolean {
  if (!expression || typeof expression !== 'string') return false;

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const ranges = [
    { min: 0, max: 59 },  // minute
    { min: 0, max: 23 },  // hour
    { min: 1, max: 31 },  // day of month
    { min: 1, max: 12 },  // month
    { min: 0, max: 7 },   // day of week (0 and 7 both = Sunday)
  ];

  return parts.every((part, index) => {
    const range = ranges[index];
    if (!range) return false;

    // Wildcard
    if (part === '*') return true;

    // Step value e.g. */5 or 1-5/2
    if (part.includes('/')) {
      const [base, stepStr] = part.split('/');
      const step = parseInt(stepStr ?? '', 10);
      if (isNaN(step) || step < 1) return false;
      if (base === '*') return true;
      // Fall through to validate the base
      part = base ?? part;
    }

    // Range e.g. 1-5
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr ?? '', 10);
      const end = parseInt(endStr ?? '', 10);
      return (
        !isNaN(start) &&
        !isNaN(end) &&
        start >= range.min &&
        end <= range.max &&
        start <= end
      );
    }

    // List e.g. 1,3,5
    if (part.includes(',')) {
      return part.split(',').every((v) => {
        const n = parseInt(v, 10);
        return !isNaN(n) && n >= range.min && n <= range.max;
      });
    }

    // Single value
    const n = parseInt(part, 10);
    return !isNaN(n) && n >= range.min && n <= range.max;
  });
}

// ----------------------------------------------------------------------------
// Idempotency key
// ----------------------------------------------------------------------------

/**
 * Generate a UUID-v4-style idempotency key for deduplicating API requests.
 */
export function generateIdempotencyKey(): string {
  const bytes = randomBytes(16);
  // Set version 4 bits
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  // Set variant bits
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// ----------------------------------------------------------------------------
// HTML sanitisation (basic — for production use a library like DOMPurify/sanitize-html)
// ----------------------------------------------------------------------------

const ALLOWED_TAGS = new Set([
  'a', 'b', 'i', 'em', 'strong', 'u', 's', 'br', 'p',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'span', 'div',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

/**
 * Strip dangerous HTML tags and attributes from a string.
 * This is a naive regex-based implementation.
 * For rich text editors in production, prefer a dedicated library (DOMPurify, sanitize-html).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove on* event handlers
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: href values
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
    // Remove tags not in the allowed list
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName: string) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';

      // For closing tags just return them
      if (match.startsWith('</')) return `</${tag}>`;

      // For opening/self-closing tags, filter attributes
      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed) return `<${tag}>`;

      const attrString = [...match.matchAll(/(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g)]
        .slice(1) // skip the tag name match
        .filter(([, name]) => name && allowed.has(name.toLowerCase()))
        .map(([, name, dq, sq, unquoted]) => {
          const val = dq ?? sq ?? unquoted ?? '';
          return `${name}="${val}"`;
        })
        .join(' ');

      return attrString ? `<${tag} ${attrString}>` : `<${tag}>`;
    });
}

// ----------------------------------------------------------------------------
// Async sleep
// ----------------------------------------------------------------------------

/**
 * Pause execution for the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
