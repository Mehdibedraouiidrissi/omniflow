// ============================================================================
// Omniflow Worker - Handlebars Template Engine
// ============================================================================

import Handlebars from 'handlebars';
import dayjs from 'dayjs';
import { createChildLogger } from '../logger';

const log = createChildLogger('template-engine');

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

// ---------------------------------------------------------------------------
// Register Handlebars helpers
// ---------------------------------------------------------------------------

Handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
  if (!date) return '';
  const fmt = typeof format === 'string' ? format : 'MMMM D, YYYY';
  return dayjs(date).format(fmt);
});

Handlebars.registerHelper('formatCurrency', (amount: number, currency?: string) => {
  if (amount == null) return '';
  const curr = typeof currency === 'string' ? currency : 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: curr,
  }).format(amount / 100);
});

Handlebars.registerHelper('uppercase', (str: string) =>
  typeof str === 'string' ? str.toUpperCase() : '',
);

Handlebars.registerHelper('lowercase', (str: string) =>
  typeof str === 'string' ? str.toLowerCase() : '',
);

Handlebars.registerHelper('capitalize', (str: string) => {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper(
  'ifEquals',
  function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
);

Handlebars.registerHelper(
  'ifGt',
  function (this: unknown, a: number, b: number, options: Handlebars.HelperOptions) {
    return a > b ? options.fn(this) : options.inverse(this);
  },
);

Handlebars.registerHelper('truncate', (str: string, length: number) => {
  if (typeof str !== 'string') return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
});

Handlebars.registerHelper('defaultValue', (value: unknown, defaultVal: unknown) => {
  return value != null && value !== '' ? value : defaultVal;
});

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Render a Handlebars template string with given variables.
 * Compiled templates are cached by source for performance.
 */
export function renderTemplate(
  templateSource: string,
  variables: Record<string, unknown>,
): string {
  let compiled = templateCache.get(templateSource);
  if (!compiled) {
    compiled = Handlebars.compile(templateSource);
    templateCache.set(templateSource, compiled);
  }
  return compiled(variables);
}

/**
 * Render a named template. Uses a namespaced cache key so different
 * template names with different source won't collide.
 */
export function renderNamedTemplate(
  name: string,
  templateSource: string,
  variables: Record<string, unknown>,
): string {
  const cacheKey = `named:${name}`;
  let compiled = templateCache.get(cacheKey);
  if (!compiled) {
    compiled = Handlebars.compile(templateSource);
    templateCache.set(cacheKey, compiled);
    log.debug({ templateName: name }, 'Template compiled and cached');
  }
  return compiled(variables);
}

/**
 * Clear the template cache (e.g. when templates are updated).
 */
export function clearTemplateCache(): void {
  templateCache.clear();
  log.info('Template cache cleared');
}
