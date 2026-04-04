// ============================================================================
// Omniflow - Core TypeScript Types & Interfaces
// ============================================================================

// ----------------------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ----------------------------------------------------------------------------
// API Response wrappers
// ----------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// ----------------------------------------------------------------------------
// Tenant / Auth context
// ----------------------------------------------------------------------------

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
}

// ----------------------------------------------------------------------------
// Enums — mirror the Prisma schema exactly
// ----------------------------------------------------------------------------

export enum TenantType {
  AGENCY = 'AGENCY',
  BUSINESS = 'BUSINESS',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  TRIAL = 'TRIAL',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
}

export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  BOUNCED = 'BOUNCED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ActivityType {
  NOTE = 'NOTE',
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  TASK = 'TASK',
  STAGE_CHANGE = 'STAGE_CHANGE',
  TAG_ADDED = 'TAG_ADDED',
  TAG_REMOVED = 'TAG_REMOVED',
  FORM_SUBMITTED = 'FORM_SUBMITTED',
  APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
  PAYMENT = 'PAYMENT',
  CUSTOM = 'CUSTOM',
}

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  CHECKBOX = 'CHECKBOX',
  URL = 'URL',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export enum OpportunityStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST',
  ABANDONED = 'ABANDONED',
}

export enum ConversationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  LIVE_CHAT = 'LIVE_CHAT',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  SNOOZED = 'SNOOZED',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export enum EmailVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum SuppressionReason {
  BOUNCE = 'BOUNCE',
  COMPLAINT = 'COMPLAINT',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  MANUAL = 'MANUAL',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  FAILED = 'FAILED',
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum WorkflowTriggerType {
  FORM_SUBMITTED = 'FORM_SUBMITTED',
  CONTACT_CREATED = 'CONTACT_CREATED',
  TAG_ADDED = 'TAG_ADDED',
  APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
  STAGE_CHANGED = 'STAGE_CHANGED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
}

export enum WorkflowRunStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  WAITING = 'WAITING',
}

export enum WorkflowStepType {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_SMS = 'SEND_SMS',
  WAIT = 'WAIT',
  IF_ELSE = 'IF_ELSE',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  CREATE_TASK = 'CREATE_TASK',
  MOVE_OPPORTUNITY = 'MOVE_OPPORTUNITY',
  WEBHOOK = 'WEBHOOK',
  NOTIFICATION = 'NOTIFICATION',
  UPDATE_CONTACT = 'UPDATE_CONTACT',
}

export enum WorkflowStepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum WorkflowEnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum FormType {
  FORM = 'FORM',
  SURVEY = 'SURVEY',
  QUIZ = 'QUIZ',
}

export enum FormStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CalendarType {
  PERSONAL = 'PERSONAL',
  TEAM = 'TEAM',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

export enum FunnelType {
  SALES = 'SALES',
  LEAD = 'LEAD',
  WEBINAR = 'WEBINAR',
  MEMBERSHIP = 'MEMBERSHIP',
  CUSTOM = 'CUSTOM',
}

export enum FunnelStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum PageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  OTHER = 'OTHER',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseAccessType {
  FREE = 'FREE',
  PAID = 'PAID',
  MEMBERSHIP = 'MEMBERSHIP',
}

export enum ContentType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  PDF = 'PDF',
  QUIZ = 'QUIZ',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum LessonProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ProductType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
  FREE = 'FREE',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum PriceType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
}

export enum PriceInterval {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  TRIALING = 'TRIALING',
  PAUSED = 'PAUSED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

export enum PaymentStatus {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CheckoutStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  ABANDONED = 'ABANDONED',
}
