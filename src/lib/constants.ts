// ============================================================================
// SalesOS — Application Constants
// ============================================================================

export const APP_NAME = 'SalesOS';
export const APP_DESCRIPTION = 'Sales Management & CRM Platform';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Lead stage colors for Kanban
export const STAGE_COLORS: Record<string, string> = {
  NEW: '#6366f1',         // indigo
  CONTACTED: '#8b5cf6',   // violet
  QUALIFIED: '#0ea5e9',   // sky
  DEMO: '#f59e0b',        // amber
  NEGOTIATION: '#f97316', // orange
  WON: '#22c55e',         // green
  LOST: '#ef4444',        // red
};

export const STAGE_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'NEGOTIATION', 'WON', 'LOST'] as const;

// Payment status colors
export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  PAID: '#22c55e',
  REFUNDED: '#ef4444',
  CANCELLED: '#6b7280',
};

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_REP: 'Sales Rep',
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  INACTIVE: '#6b7280',
  INVITED: '#f59e0b',
  SUSPENDED: '#ef4444',
  DRAFT: '#6b7280',
  ARCHIVED: '#6b7280',
  TRIAL: '#8b5cf6',
};

// Activity type icons (lucide icon names)
export const ACTIVITY_ICONS: Record<string, string> = {
  CALL: 'Phone',
  EMAIL: 'Mail',
  WHATSAPP: 'MessageCircle',
  MEETING: 'Users',
  DEMO: 'Monitor',
  NOTE: 'FileText',
  FOLLOW_UP: 'Clock',
};

// Chart colors
export const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9',
];

// Default currency symbol map
export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
};
