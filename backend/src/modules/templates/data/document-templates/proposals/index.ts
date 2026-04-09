/**
 * Proposal Templates Index
 * Exports all proposal template collections
 */

export { BUSINESS_PROPOSAL_TEMPLATES } from './business-proposals';
export { MARKETING_PROPOSAL_TEMPLATES } from './marketing-proposals';
export { TECHNOLOGY_PROPOSAL_TEMPLATES } from './technology-proposals';
export { CONSULTING_PROPOSAL_TEMPLATES } from './consulting-proposals';
export { INDUSTRY_PROPOSAL_TEMPLATES } from './industry-proposals';

// Combined export of all proposal templates
import { BUSINESS_PROPOSAL_TEMPLATES } from './business-proposals';
import { MARKETING_PROPOSAL_TEMPLATES } from './marketing-proposals';
import { TECHNOLOGY_PROPOSAL_TEMPLATES } from './technology-proposals';
import { CONSULTING_PROPOSAL_TEMPLATES } from './consulting-proposals';
import { INDUSTRY_PROPOSAL_TEMPLATES } from './industry-proposals';

export const ALL_PROPOSAL_TEMPLATES = [
  ...BUSINESS_PROPOSAL_TEMPLATES,
  ...MARKETING_PROPOSAL_TEMPLATES,
  ...TECHNOLOGY_PROPOSAL_TEMPLATES,
  ...CONSULTING_PROPOSAL_TEMPLATES,
  ...INDUSTRY_PROPOSAL_TEMPLATES,
];
