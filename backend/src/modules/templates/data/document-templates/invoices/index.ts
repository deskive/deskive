/**
 * Invoice Templates Index
 * Exports all invoice template collections
 */

export { SERVICE_INVOICE_TEMPLATES } from './service-invoices';

// Combined export of all invoice templates
import { SERVICE_INVOICE_TEMPLATES } from './service-invoices';

export const ALL_INVOICE_TEMPLATES = [...SERVICE_INVOICE_TEMPLATES];
