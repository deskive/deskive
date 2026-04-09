/**
 * HR & Employment Templates Index
 * Exports all HR and employment document template collections
 */

export { HR_RECRUITMENT_TEMPLATES } from './hr-recruitment';
export { HR_EMPLOYEE_TEMPLATES } from './hr-employee';
export { HR_PERFORMANCE_TEMPLATES } from './hr-performance';
export { HR_POLICY_TEMPLATES } from './hr-policy';
export { HR_OFFBOARDING_TEMPLATES } from './hr-offboarding';
export { HR_TRAINING_TEMPLATES } from './hr-training';
export { HR_COMPENSATION_TEMPLATES } from './hr-compensation';
export { HR_COMPLIANCE_TEMPLATES } from './hr-compliance';

// Combined export of all HR templates
import { HR_RECRUITMENT_TEMPLATES } from './hr-recruitment';
import { HR_EMPLOYEE_TEMPLATES } from './hr-employee';
import { HR_PERFORMANCE_TEMPLATES } from './hr-performance';
import { HR_POLICY_TEMPLATES } from './hr-policy';
import { HR_OFFBOARDING_TEMPLATES } from './hr-offboarding';
import { HR_TRAINING_TEMPLATES } from './hr-training';
import { HR_COMPENSATION_TEMPLATES } from './hr-compensation';
import { HR_COMPLIANCE_TEMPLATES } from './hr-compliance';

export const ALL_HR_TEMPLATES = [
  ...HR_RECRUITMENT_TEMPLATES,
  ...HR_EMPLOYEE_TEMPLATES,
  ...HR_PERFORMANCE_TEMPLATES,
  ...HR_POLICY_TEMPLATES,
  ...HR_OFFBOARDING_TEMPLATES,
  ...HR_TRAINING_TEMPLATES,
  ...HR_COMPENSATION_TEMPLATES,
  ...HR_COMPLIANCE_TEMPLATES,
];
