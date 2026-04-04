// ============================================================================
// Omniflow - Zod Validation Schemas
// ============================================================================

import { z } from 'zod';

// ----------------------------------------------------------------------------
// Primitive field schemas
// ----------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase();

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number — use E.164 format (e.g. +12125550100)');

export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL must not exceed 2048 characters');

export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(64, 'Slug must not exceed 64 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

// ----------------------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1, 'Page must be at least 1')),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100, 'Limit must not exceed 100')),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PaginationInput = z.input<typeof paginationSchema>;
export type PaginationOutput = z.output<typeof paginationSchema>;

// ----------------------------------------------------------------------------
// Contact schemas
// ----------------------------------------------------------------------------

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().max(100).trim().optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  companyName: z.string().max(200).trim().optional(),
  jobTitle: z.string().max(150).trim().optional(),
  website: urlSchema.optional(),
  address: z.string().max(500).trim().optional(),
  city: z.string().max(100).trim().optional(),
  state: z.string().max(100).trim().optional(),
  country: z.string().max(100).trim().optional(),
  postalCode: z.string().max(20).trim().optional(),
  tags: z.array(z.string().max(50)).max(50).optional().default([]),
  source: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.unknown()).optional().default({}),
}).refine(
  (data) => data.email !== undefined || data.phone !== undefined,
  { message: 'At least one of email or phone is required' },
);

export const updateContactSchema = createContactSchema
  .partial()
  .omit({ tags: true })
  .extend({
    tags: z.array(z.string().max(50)).max(50).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' },
  );

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ----------------------------------------------------------------------------
// Opportunity schemas
// ----------------------------------------------------------------------------

export const createOpportunitySchema = z.object({
  name: z.string().min(1, 'Opportunity name is required').max(255).trim(),
  contactId: z.string().cuid('Invalid contact ID'),
  pipelineId: z.string().cuid('Invalid pipeline ID'),
  stageId: z.string().cuid('Invalid pipeline stage ID'),
  value: z.number().nonnegative('Value must be zero or greater').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
  closeDate: z.coerce.date().optional(),
  assignedToId: z.string().cuid().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(50).optional().default([]),
  customFields: z.record(z.unknown()).optional().default({}),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

// ----------------------------------------------------------------------------
// Form schemas
// ----------------------------------------------------------------------------

const formFieldSchema = z.object({
  label: z.string().min(1, 'Field label is required').max(255),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'URL', 'EMAIL', 'PHONE']),
  required: z.boolean().default(false),
  placeholder: z.string().max(255).optional(),
  options: z.array(z.string().max(255)).optional(),
  order: z.number().int().nonnegative(),
  fieldKey: slugSchema,
});

export const createFormSchema = z.object({
  name: z.string().min(1, 'Form name is required').max(255).trim(),
  type: z.enum(['FORM', 'SURVEY', 'QUIZ']).default('FORM'),
  description: z.string().max(1000).optional(),
  fields: z.array(formFieldSchema).min(1, 'A form must have at least one field'),
  redirectUrl: urlSchema.optional(),
  submitButtonText: z.string().max(100).default('Submit'),
  enableEmailNotification: z.boolean().default(false),
  notificationEmail: emailSchema.optional(),
  customCss: z.string().max(10000).optional(),
}).refine(
  (data) => !data.enableEmailNotification || data.notificationEmail !== undefined,
  { message: 'Notification email is required when email notifications are enabled' },
);

export type CreateFormInput = z.infer<typeof createFormSchema>;

// ----------------------------------------------------------------------------
// Workflow schemas
// ----------------------------------------------------------------------------

const workflowStepSchema = z.object({
  type: z.enum([
    'SEND_EMAIL',
    'SEND_SMS',
    'WAIT',
    'IF_ELSE',
    'ADD_TAG',
    'REMOVE_TAG',
    'CREATE_TASK',
    'MOVE_OPPORTUNITY',
    'WEBHOOK',
    'NOTIFICATION',
    'UPDATE_CONTACT',
  ]),
  name: z.string().min(1).max(255),
  order: z.number().int().nonnegative(),
  config: z.record(z.unknown()).default({}),
  nextStepId: z.string().optional(),
  falseStepId: z.string().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(255).trim(),
  description: z.string().max(1000).optional(),
  triggerType: z.enum([
    'FORM_SUBMITTED',
    'CONTACT_CREATED',
    'TAG_ADDED',
    'APPOINTMENT_BOOKED',
    'STAGE_CHANGED',
    'PAYMENT_SUCCEEDED',
    'MESSAGE_RECEIVED',
    'WEBHOOK',
    'MANUAL',
  ]),
  triggerConfig: z.record(z.unknown()).default({}),
  steps: z.array(workflowStepSchema).min(1, 'A workflow must have at least one step'),
  isActive: z.boolean().default(false),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

// ----------------------------------------------------------------------------
// Appointment schemas
// ----------------------------------------------------------------------------

export const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Appointment title is required').max(255).trim(),
  contactId: z.string().cuid('Invalid contact ID'),
  calendarId: z.string().cuid('Invalid calendar ID'),
  assignedToId: z.string().cuid('Invalid user ID').optional(),
  startTime: z.coerce.date({ required_error: 'Start time is required' }),
  endTime: z.coerce.date({ required_error: 'End time is required' }),
  timezone: z.string().min(1, 'Timezone is required').max(100),
  location: z.string().max(500).optional(),
  meetingUrl: urlSchema.optional(),
  notes: z.string().max(5000).optional(),
  reminderMinutes: z.array(z.number().int().min(0)).max(5).optional().default([60, 1440]),
}).refine(
  (data) => data.endTime > data.startTime,
  { message: 'End time must be after start time', path: ['endTime'] },
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// ----------------------------------------------------------------------------
// Auth schemas
// ----------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  tenantName: z.string().min(2, 'Business name is required').max(255).trim().optional(),
  agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms of service' }) }),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] },
);

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] },
);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
