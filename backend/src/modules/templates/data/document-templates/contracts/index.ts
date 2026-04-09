/**
 * Contract Templates Index
 * Exports all contract template collections
 */

export { BUSINESS_CONTRACT_TEMPLATES } from './business-contracts';
export { EMPLOYMENT_CONTRACT_TEMPLATES } from './employment-contracts';

// Combined export of all contract templates
import { BUSINESS_CONTRACT_TEMPLATES } from './business-contracts';
import { EMPLOYMENT_CONTRACT_TEMPLATES } from './employment-contracts';

export const ALL_CONTRACT_TEMPLATES = [
  ...BUSINESS_CONTRACT_TEMPLATES,
  ...EMPLOYMENT_CONTRACT_TEMPLATES,
];
