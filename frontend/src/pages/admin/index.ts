/**
 * Admin Pages Index
 * Centralized exports for all admin components
 */

// Main Dashboard
export { default as AdminDashboard } from './AdminDashboard';

// Blog Management
export { default as BlogManagement } from './blog/BlogManagement';
export { default as BlogEditor } from './blog/BlogEditor';

// User Management
export { default as UserManagement } from './users/UserManagement';

// Organization Management
export { default as OrganizationManagement } from './organizations/OrganizationManagement';

// System Settings
export { default as SystemSettings } from './settings/SystemSettings';

// Audit Logs
export { default as AuditLogs } from './audit/AuditLogs';

// Feedback Management
export { default as FeedbackManagement } from './feedback/FeedbackManagement';
export { default as DeletionFeedbackManagement } from './feedback/DeletionFeedbackManagement';