/**
 * Finance & Accounting Templates Index
 * Exports all finance and accounting document template collections
 */

export { FINANCE_INVOICES_TEMPLATES } from './finance-invoices';
export { FINANCE_BUDGETS_TEMPLATES } from './finance-budgets';
export { FINANCE_REPORTS_TEMPLATES } from './finance-reports';
export { FINANCE_FORMS_TEMPLATES } from './finance-forms';
export { FINANCE_PAYROLL_TEMPLATES } from './finance-payroll';
export { FINANCE_ACCOUNTING_TEMPLATES } from './finance-accounting';
export { FINANCE_ANALYSIS_TEMPLATES } from './finance-analysis';

// Combined export of all Finance templates
import { FINANCE_INVOICES_TEMPLATES } from './finance-invoices';
import { FINANCE_BUDGETS_TEMPLATES } from './finance-budgets';
import { FINANCE_REPORTS_TEMPLATES } from './finance-reports';
import { FINANCE_FORMS_TEMPLATES } from './finance-forms';
import { FINANCE_PAYROLL_TEMPLATES } from './finance-payroll';
import { FINANCE_ACCOUNTING_TEMPLATES } from './finance-accounting';
import { FINANCE_ANALYSIS_TEMPLATES } from './finance-analysis';

export const ALL_FINANCE_TEMPLATES = [
  ...FINANCE_INVOICES_TEMPLATES,
  ...FINANCE_BUDGETS_TEMPLATES,
  ...FINANCE_REPORTS_TEMPLATES,
  ...FINANCE_FORMS_TEMPLATES,
  ...FINANCE_PAYROLL_TEMPLATES,
  ...FINANCE_ACCOUNTING_TEMPLATES,
  ...FINANCE_ANALYSIS_TEMPLATES,
];
