export const APP_NAME = process.env['NEXT_PUBLIC_APP_NAME'] || 'Omniflow';

export const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:4000/api';

export const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] || 'http://localhost:4000';

export const AUTH_TOKEN_KEY = 'omniflow_access_token';

export const REFRESH_TOKEN_KEY = 'omniflow_refresh_token';

export const ITEMS_PER_PAGE = 25;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export const ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
];

export const PIPELINE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

export const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  LIVE_CHAT: 'Live Chat',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
};

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Contacts', href: '/contacts', icon: 'Users' },
  { label: 'Conversations', href: '/conversations', icon: 'MessageCircle' },
  { label: 'Pipelines', href: '/pipelines', icon: 'Kanban' },
  { label: 'Calendars', href: '/calendars', icon: 'Calendar' },
  { label: 'Workflows', href: '/workflows', icon: 'GitBranch' },
  { label: 'Forms & Surveys', href: '/forms', icon: 'FileText' },
  { label: 'Websites & Funnels', href: '/websites', icon: 'Globe' },
  { label: 'Email Marketing', href: '/email-marketing', icon: 'Mail' },
  { label: 'Social Planner', href: '/social', icon: 'Share2' },
  { label: 'Memberships', href: '/memberships', icon: 'GraduationCap' },
  { label: 'Reputation', href: '/reputation', icon: 'Star' },
  { label: 'Payments', href: '/payments', icon: 'CreditCard' },
  { label: 'Reporting', href: '/reporting', icon: 'BarChart3' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: 'Admin Console', href: '/admin', icon: 'Shield' },
] as const;
