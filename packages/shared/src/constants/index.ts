// ============================================================================
// Omniflow - Application Constants
// ============================================================================

// ----------------------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ----------------------------------------------------------------------------
// Password policy
// ----------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// ----------------------------------------------------------------------------
// Token expiry (in seconds unless noted)
// ----------------------------------------------------------------------------

export const TOKEN_EXPIRY = {
  /** Short-lived JWT — 15 minutes */
  ACCESS: 15 * 60,
  /** Refresh JWT — 30 days */
  REFRESH: 30 * 24 * 60 * 60,
  /** Team / sub-account invitation link — 7 days */
  INVITE: 7 * 24 * 60 * 60,
  /** Email address verification link — 24 hours */
  EMAIL_VERIFICATION: 24 * 60 * 60,
  /** Password reset link — 1 hour */
  PASSWORD_RESET: 60 * 60,
  /** API key — never expires (0 = no expiry) */
  API_KEY: 0,
} as const;

// ----------------------------------------------------------------------------
// Rate limits (requests per window per IP / user)
// ----------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Global API rate limit per user */
  API: { requests: 1000, windowMs: 60 * 1000 },
  /** Auth endpoints — login, register */
  AUTH: { requests: 10, windowMs: 15 * 60 * 1000 },
  /** Password reset / forgot password */
  PASSWORD_RESET: { requests: 5, windowMs: 60 * 60 * 1000 },
  /** Email verification resend */
  EMAIL_VERIFICATION: { requests: 3, windowMs: 60 * 60 * 1000 },
  /** Webhook delivery */
  WEBHOOK: { requests: 500, windowMs: 60 * 1000 },
  /** File uploads */
  UPLOAD: { requests: 50, windowMs: 60 * 1000 },
} as const;

// ----------------------------------------------------------------------------
// Supported currencies (ISO 4217 codes)
// ----------------------------------------------------------------------------

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'JPY', 'SGD', 'HKD',
  'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'ARS', 'COP', 'CLP', 'PEN', 'INR',
  'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'EGP', 'MAD', 'ZAR', 'NGN', 'GHS',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// ----------------------------------------------------------------------------
// Supported timezones
// Reference the IANA tz database — full list is too large to enumerate here.
// Use `Intl.supportedValuesOf('timeZone')` at runtime for the complete set.
// ----------------------------------------------------------------------------

export type SupportedTimezone = string;

export const DEFAULT_TIMEZONE = 'UTC';

// ----------------------------------------------------------------------------
// File upload limits
// ----------------------------------------------------------------------------

export const FILE_UPLOAD_LIMITS = {
  image: {
    /** Maximum file size in bytes — 10 MB */
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
  video: {
    /** Maximum file size in bytes — 500 MB */
    maxSize: 500 * 1024 * 1024,
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  },
  document: {
    /** Maximum file size in bytes — 50 MB */
    maxSize: 50 * 1024 * 1024,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
  },
  audio: {
    /** Maximum file size in bytes — 100 MB */
    maxSize: 100 * 1024 * 1024,
    allowedTypes: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'],
  },
  avatar: {
    /** Maximum file size in bytes — 2 MB */
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

// ----------------------------------------------------------------------------
// Webhook events emitted by the platform
// ----------------------------------------------------------------------------

export const WEBHOOK_EVENTS = [
  // Contacts
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'contact.tag_added',
  'contact.tag_removed',
  // Conversations & Messages
  'conversation.created',
  'conversation.closed',
  'message.received',
  'message.sent',
  'message.delivered',
  'message.failed',
  // Opportunities
  'opportunity.created',
  'opportunity.updated',
  'opportunity.stage_changed',
  'opportunity.won',
  'opportunity.lost',
  // Appointments
  'appointment.scheduled',
  'appointment.confirmed',
  'appointment.cancelled',
  'appointment.rescheduled',
  'appointment.completed',
  'appointment.no_show',
  // Forms
  'form.submitted',
  // Workflows
  'workflow.started',
  'workflow.completed',
  'workflow.failed',
  // Orders & Payments
  'order.created',
  'order.paid',
  'order.failed',
  'order.refunded',
  'payment.succeeded',
  'payment.failed',
  // Subscriptions
  'subscription.created',
  'subscription.renewed',
  'subscription.cancelled',
  'subscription.past_due',
  // Courses
  'enrollment.created',
  'enrollment.completed',
  // Tenants
  'tenant.created',
  'tenant.suspended',
  'tenant.cancelled',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// ----------------------------------------------------------------------------
// Granular permissions grouped by module
// ----------------------------------------------------------------------------

export const PERMISSIONS = {
  // Contacts module
  contacts: {
    READ: 'contacts.read',
    WRITE: 'contacts.write',
    DELETE: 'contacts.delete',
    IMPORT: 'contacts.import',
    EXPORT: 'contacts.export',
    MERGE: 'contacts.merge',
  },
  // Conversations module
  conversations: {
    READ: 'conversations.read',
    WRITE: 'conversations.write',
    DELETE: 'conversations.delete',
    ASSIGN: 'conversations.assign',
  },
  // Opportunities / CRM module
  opportunities: {
    READ: 'opportunities.read',
    WRITE: 'opportunities.write',
    DELETE: 'opportunities.delete',
  },
  // Pipelines
  pipelines: {
    READ: 'pipelines.read',
    WRITE: 'pipelines.write',
    DELETE: 'pipelines.delete',
  },
  // Calendars & Appointments
  appointments: {
    READ: 'appointments.read',
    WRITE: 'appointments.write',
    DELETE: 'appointments.delete',
  },
  calendars: {
    READ: 'calendars.read',
    WRITE: 'calendars.write',
    DELETE: 'calendars.delete',
  },
  // Marketing
  campaigns: {
    READ: 'campaigns.read',
    WRITE: 'campaigns.write',
    DELETE: 'campaigns.delete',
    SEND: 'campaigns.send',
  },
  // Workflows / Automation
  workflows: {
    READ: 'workflows.read',
    WRITE: 'workflows.write',
    DELETE: 'workflows.delete',
    TRIGGER: 'workflows.trigger',
  },
  // Forms
  forms: {
    READ: 'forms.read',
    WRITE: 'forms.write',
    DELETE: 'forms.delete',
    SUBMISSIONS_READ: 'forms.submissions.read',
  },
  // Funnels / Pages
  funnels: {
    READ: 'funnels.read',
    WRITE: 'funnels.write',
    DELETE: 'funnels.delete',
    PUBLISH: 'funnels.publish',
  },
  // Courses / Memberships
  courses: {
    READ: 'courses.read',
    WRITE: 'courses.write',
    DELETE: 'courses.delete',
    PUBLISH: 'courses.publish',
  },
  // Products & Orders
  products: {
    READ: 'products.read',
    WRITE: 'products.write',
    DELETE: 'products.delete',
  },
  orders: {
    READ: 'orders.read',
    WRITE: 'orders.write',
    REFUND: 'orders.refund',
  },
  // Media
  media: {
    READ: 'media.read',
    UPLOAD: 'media.upload',
    DELETE: 'media.delete',
  },
  // Reporting
  reports: {
    READ: 'reports.read',
    EXPORT: 'reports.export',
  },
  // Settings
  settings: {
    READ: 'settings.read',
    WRITE: 'settings.write',
  },
  // Team members
  team: {
    READ: 'team.read',
    INVITE: 'team.invite',
    REMOVE: 'team.remove',
    MANAGE_ROLES: 'team.manage_roles',
  },
  // API keys / Integrations
  integrations: {
    READ: 'integrations.read',
    WRITE: 'integrations.write',
    DELETE: 'integrations.delete',
  },
  // Billing
  billing: {
    READ: 'billing.read',
    WRITE: 'billing.write',
  },
  // Agency-level permissions (only for AGENCY tenant type)
  agency: {
    MANAGE_SUBACCOUNTS: 'agency.manage_subaccounts',
    VIEW_SUBACCOUNTS: 'agency.view_subaccounts',
    BILLING_READ: 'agency.billing.read',
    BILLING_WRITE: 'agency.billing.write',
  },
} as const;

/** Flat array of every permission string in the platform */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).flatMap((module) =>
  Object.values(module),
);

/** Role → default permission sets */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((p) => !p.startsWith('agency.')),
  MANAGER: [
    PERMISSIONS.contacts.READ,
    PERMISSIONS.contacts.WRITE,
    PERMISSIONS.conversations.READ,
    PERMISSIONS.conversations.WRITE,
    PERMISSIONS.conversations.ASSIGN,
    PERMISSIONS.opportunities.READ,
    PERMISSIONS.opportunities.WRITE,
    PERMISSIONS.appointments.READ,
    PERMISSIONS.appointments.WRITE,
    PERMISSIONS.reports.READ,
    PERMISSIONS.team.READ,
  ],
  MEMBER: [
    PERMISSIONS.contacts.READ,
    PERMISSIONS.contacts.WRITE,
    PERMISSIONS.conversations.READ,
    PERMISSIONS.conversations.WRITE,
    PERMISSIONS.opportunities.READ,
    PERMISSIONS.opportunities.WRITE,
    PERMISSIONS.appointments.READ,
    PERMISSIONS.appointments.WRITE,
  ],
  VIEWER: [
    PERMISSIONS.contacts.READ,
    PERMISSIONS.conversations.READ,
    PERMISSIONS.opportunities.READ,
    PERMISSIONS.appointments.READ,
    PERMISSIONS.reports.READ,
  ],
};
