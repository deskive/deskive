import { RE_LEASE_TEMPLATES } from './re-lease';
import { RE_PURCHASE_TEMPLATES } from './re-purchase';
import { RE_MANAGEMENT_TEMPLATES } from './re-management';
import { RE_MISC_TEMPLATES } from './re-misc';

export const ALL_REAL_ESTATE_TEMPLATES = [
  ...RE_LEASE_TEMPLATES,
  ...RE_PURCHASE_TEMPLATES,
  ...RE_MANAGEMENT_TEMPLATES,
  ...RE_MISC_TEMPLATES,
];

export {
  RE_LEASE_TEMPLATES,
  RE_PURCHASE_TEMPLATES,
  RE_MANAGEMENT_TEMPLATES,
  RE_MISC_TEMPLATES,
};
