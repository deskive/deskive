/**
 * Sales & Marketing Templates Index
 * Exports all sales and marketing document template collections
 */

export { SALES_PROPOSALS_TEMPLATES } from './sales-proposals';
export { SALES_AGREEMENTS_TEMPLATES } from './sales-agreements';
export { SALES_MARKETING_TEMPLATES } from './sales-marketing';
export { SALES_COMMUNICATIONS_TEMPLATES } from './sales-communications';

// Combined export of all Sales templates
import { SALES_PROPOSALS_TEMPLATES } from './sales-proposals';
import { SALES_AGREEMENTS_TEMPLATES } from './sales-agreements';
import { SALES_MARKETING_TEMPLATES } from './sales-marketing';
import { SALES_COMMUNICATIONS_TEMPLATES } from './sales-communications';

export const ALL_SALES_TEMPLATES = [
  ...SALES_PROPOSALS_TEMPLATES,
  ...SALES_AGREEMENTS_TEMPLATES,
  ...SALES_MARKETING_TEMPLATES,
  ...SALES_COMMUNICATIONS_TEMPLATES,
];
