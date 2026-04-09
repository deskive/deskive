/**
 * Business Documents Templates Index
 * Exports all business document template collections
 */

export { BUSINESS_PLAN_TEMPLATES } from './business-plans';
export { BUSINESS_REPORTS_TEMPLATES } from './business-reports';
export { BUSINESS_MEETING_TEMPLATES } from './business-meetings';
export { BUSINESS_CORPORATE_TEMPLATES } from './business-corporate';
export { BUSINESS_ANALYSIS_TEMPLATES } from './business-analysis';

// Combined export of all business document templates
import { BUSINESS_PLAN_TEMPLATES } from './business-plans';
import { BUSINESS_REPORTS_TEMPLATES } from './business-reports';
import { BUSINESS_MEETING_TEMPLATES } from './business-meetings';
import { BUSINESS_CORPORATE_TEMPLATES } from './business-corporate';
import { BUSINESS_ANALYSIS_TEMPLATES } from './business-analysis';

export const ALL_BUSINESS_TEMPLATES = [
  ...BUSINESS_PLAN_TEMPLATES,
  ...BUSINESS_REPORTS_TEMPLATES,
  ...BUSINESS_MEETING_TEMPLATES,
  ...BUSINESS_CORPORATE_TEMPLATES,
  ...BUSINESS_ANALYSIS_TEMPLATES,
];
