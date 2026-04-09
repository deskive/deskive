/**
 * Support API Client
 * Handles support ticket submissions and inquiries
 */

import { api } from '@/lib/fetch';

// Support request types
export type SupportType =
  | 'technical_issue'
  | 'billing'
  | 'account'
  | 'feature_request'
  | 'bug_report'
  | 'general';

export type SupportFormData = {
  name: string;
  email: string;
  company?: string;
  supportType: SupportType;
  subject: string;
  message: string;
};

export type SupportResponse = {
  success: boolean;
  message: string;
};

// API Functions
export const supportApi = {
  /**
   * Submit a support request
   * Uses the contact endpoint with subject set to 'support'
   */
  async submitSupportRequest(data: SupportFormData): Promise<SupportResponse> {
    // Map support type to readable label for the message
    const supportTypeLabels: Record<SupportType, string> = {
      technical_issue: 'Technical Issue',
      billing: 'Billing Question',
      account: 'Account Related',
      feature_request: 'Feature Request',
      bug_report: 'Bug Report',
      general: 'General Question',
    };

    // Format the message to include support type
    const formattedMessage = `[Support Type: ${supportTypeLabels[data.supportType]}]\n\nSubject: ${data.subject}\n\n${data.message}`;

    return api.post<SupportResponse>('/contact', {
      name: data.name,
      email: data.email,
      company: data.company,
      subject: 'support',
      message: formattedMessage,
    }, { requireAuth: false });
  },
};
