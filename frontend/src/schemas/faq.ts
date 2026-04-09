/**
 * FAQ Schema Generator
 * For FAQ sections on pages
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQPageSchema {
  '@context': string;
  '@type': string;
  mainEntity: Array<{
    '@type': string;
    name: string;
    acceptedAnswer: {
      '@type': string;
      text: string;
    };
  }>;
}

/**
 * Generate FAQ schema from array of questions and answers
 */
export function generateFAQSchema(faqItems: FAQItem[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Common FAQs for Deskive platform
 */
export const deskivePricingFAQs: FAQItem[] = [
  {
    question: 'What is included in the free plan?',
    answer: 'The free plan includes up to 10 team members, 5GB storage, basic chat and project management features, and access to our mobile apps.',
  },
  {
    question: 'Can I upgrade or downgrade my plan at any time?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle, and we provide prorated refunds for downgrades.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'Yes, we offer a 14-day free trial for all paid plans. No credit card required to start your trial.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and wire transfers for annual enterprise plans.',
  },
  {
    question: 'How secure is my data?',
    answer: 'We use enterprise-grade encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We are SOC 2 Type II certified and GDPR compliant.',
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer: 'Yes, you can cancel your subscription at any time. You will continue to have access to paid features until the end of your current billing period.',
  },
];

/**
 * Generate pricing FAQ schema
 */
export function generatePricingFAQSchema(): FAQPageSchema {
  return generateFAQSchema(deskivePricingFAQs);
}
