import { DocumentType, DocumentTemplateCategory } from '../../../dto/document-template.dto';

export const LEGAL_COMPLIANCE_TEMPLATES = [
  {
    name: 'Privacy Policy',
    slug: 'privacy-policy',
    description: 'Website and application privacy policy document',
    documentType: DocumentType.POLICY,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'shield-check',
    color: '#6366F1',
    isFeatured: true,
    content: {
      ops: [
        { insert: 'PRIVACY POLICY\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nLast Updated: ', attributes: { bold: true } },
        { insert: '{{last_updated}}\n\n' },
        { insert: '{{company_name}}', attributes: { bold: true } },
        {
          insert:
            ' ("we," "us," or "our") respects your privacy and is committed to protecting your personal data.\n\n',
        },
        { insert: '1. INFORMATION WE COLLECT\n', attributes: { bold: true } },
        { insert: 'We collect the following types of information:\n' },
        {
          insert:
            '- Personal identification information (name, email, phone)\n- Usage data and analytics\n- Device and browser information\n- Cookies and tracking technologies\n\n',
        },
        { insert: '2. HOW WE USE YOUR INFORMATION\n', attributes: { bold: true } },
        { insert: 'We use your information to:\n' },
        {
          insert:
            '- Provide and maintain our services\n- Process transactions\n- Send communications\n- Improve user experience\n- Comply with legal obligations\n\n',
        },
        { insert: '3. DATA SHARING AND DISCLOSURE\n', attributes: { bold: true } },
        { insert: 'We may share your information with:\n' },
        {
          insert:
            '- Service providers and business partners\n- Legal authorities when required\n- In connection with business transfers\n\n',
        },
        { insert: '4. DATA RETENTION\n', attributes: { bold: true } },
        { insert: 'We retain your data for {{retention_period}} or as required by law.\n\n' },
        { insert: '5. YOUR RIGHTS\n', attributes: { bold: true } },
        { insert: 'You have the right to:\n' },
        {
          insert:
            '- Access your personal data\n- Request correction or deletion\n- Object to processing\n- Data portability\n- Withdraw consent\n\n',
        },
        { insert: '6. SECURITY\n', attributes: { bold: true } },
        { insert: 'We implement appropriate security measures to protect your personal data.\n\n' },
        { insert: '7. COOKIES\n', attributes: { bold: true } },
        {
          insert: 'We use cookies and similar technologies. See our Cookie Policy for details.\n\n',
        },
        { insert: "8. CHILDREN'S PRIVACY\n", attributes: { bold: true } },
        {
          insert:
            'Our services are not intended for children under {{minimum_age}} years of age.\n\n',
        },
        { insert: '9. CHANGES TO THIS POLICY\n', attributes: { bold: true } },
        {
          insert:
            'We may update this policy periodically. Changes will be posted on this page.\n\n',
        },
        { insert: '10. CONTACT US\n', attributes: { bold: true } },
        {
          insert:
            'For questions about this Privacy Policy, contact us at:\n{{contact_email}}\n{{contact_address}}\n',
        },
      ],
    },
    placeholders: [
      { key: 'last_updated', type: 'date', label: 'Last Updated Date', required: true },
      { key: 'company_name', type: 'text', label: 'Company Name', required: true },
      { key: 'retention_period', type: 'text', label: 'Data Retention Period', required: true },
      { key: 'minimum_age', type: 'number', label: 'Minimum Age', required: true },
      { key: 'contact_email', type: 'email', label: 'Contact Email', required: true },
      { key: 'contact_address', type: 'text', label: 'Contact Address', required: true },
    ],
    signatureFields: [],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Terms of Service',
    slug: 'terms-of-service',
    description: 'Terms and conditions for service usage',
    documentType: DocumentType.POLICY,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'file-text',
    color: '#8B5CF6',
    isFeatured: true,
    content: {
      ops: [
        { insert: 'TERMS OF SERVICE\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nEffective Date: ', attributes: { bold: true } },
        { insert: '{{effective_date}}\n\n' },
        {
          insert:
            'Welcome to {{company_name}}. By accessing or using our services, you agree to these Terms of Service.\n\n',
        },
        { insert: '1. ACCEPTANCE OF TERMS\n', attributes: { bold: true } },
        {
          insert:
            'By using our services, you agree to be bound by these Terms. If you do not agree, do not use our services.\n\n',
        },
        { insert: '2. SERVICE DESCRIPTION\n', attributes: { bold: true } },
        { insert: '{{service_description}}\n\n' },
        { insert: '3. USER ACCOUNTS\n', attributes: { bold: true } },
        {
          insert:
            '- You must be {{minimum_age}} years or older to use our services\n- You are responsible for maintaining account security\n- You must provide accurate registration information\n\n',
        },
        { insert: '4. ACCEPTABLE USE\n', attributes: { bold: true } },
        { insert: 'You agree NOT to:\n' },
        {
          insert:
            '- Violate any laws or regulations\n- Infringe intellectual property rights\n- Transmit harmful or malicious content\n- Attempt to gain unauthorized access\n- Interfere with service operations\n\n',
        },
        { insert: '5. PAYMENT TERMS\n', attributes: { bold: true } },
        { insert: '{{payment_terms}}\n\n' },
        { insert: '6. INTELLECTUAL PROPERTY\n', attributes: { bold: true } },
        {
          insert:
            'All content and materials are owned by {{company_name}} and protected by intellectual property laws.\n\n',
        },
        { insert: '7. TERMINATION\n', attributes: { bold: true } },
        {
          insert:
            'We may terminate or suspend your access at our discretion for violation of these Terms.\n\n',
        },
        { insert: '8. DISCLAIMER OF WARRANTIES\n', attributes: { bold: true } },
        { insert: 'Services are provided "AS IS" without warranties of any kind.\n\n' },
        { insert: '9. LIMITATION OF LIABILITY\n', attributes: { bold: true } },
        {
          insert: 'We shall not be liable for indirect, incidental, or consequential damages.\n\n',
        },
        { insert: '10. GOVERNING LAW\n', attributes: { bold: true } },
        { insert: 'These Terms are governed by the laws of {{governing_jurisdiction}}.\n\n' },
        { insert: '11. CONTACT\n', attributes: { bold: true } },
        { insert: 'Contact us at: {{contact_email}}\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'company_name', type: 'text', label: 'Company Name', required: true },
      {
        key: 'service_description',
        type: 'textarea',
        label: 'Service Description',
        required: true,
      },
      { key: 'minimum_age', type: 'number', label: 'Minimum Age', required: true },
      { key: 'payment_terms', type: 'textarea', label: 'Payment Terms', required: false },
      {
        key: 'governing_jurisdiction',
        type: 'text',
        label: 'Governing Jurisdiction',
        required: true,
      },
      { key: 'contact_email', type: 'email', label: 'Contact Email', required: true },
    ],
    signatureFields: [],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'GDPR Data Processing Agreement',
    slug: 'gdpr-data-processing-agreement',
    description: 'Data processing agreement compliant with GDPR requirements',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'shield-lock',
    color: '#EC4899',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'DATA PROCESSING AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\n(GDPR Compliant)\n\n' },
        { insert: 'This Data Processing Agreement ("DPA") is entered into as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'DATA CONTROLLER:\n', attributes: { bold: true } },
        { insert: '{{controller_name}}\n{{controller_address}}\n\n' },
        { insert: 'DATA PROCESSOR:\n', attributes: { bold: true } },
        { insert: '{{processor_name}}\n{{processor_address}}\n\n' },
        { insert: '1. DEFINITIONS\n', attributes: { bold: true } },
        {
          insert:
            'Terms used herein have the meanings set forth in the GDPR (Regulation (EU) 2016/679).\n\n',
        },
        { insert: '2. SUBJECT MATTER AND DURATION\n', attributes: { bold: true } },
        {
          insert:
            'Nature of Processing: {{processing_nature}}\nPurpose: {{processing_purpose}}\nDuration: {{processing_duration}}\n\n',
        },
        { insert: '3. CATEGORIES OF DATA SUBJECTS\n', attributes: { bold: true } },
        { insert: '{{data_subject_categories}}\n\n' },
        { insert: '4. TYPES OF PERSONAL DATA\n', attributes: { bold: true } },
        { insert: '{{personal_data_types}}\n\n' },
        { insert: '5. PROCESSOR OBLIGATIONS\n', attributes: { bold: true } },
        { insert: 'The Processor shall:\n' },
        {
          insert:
            '- Process data only on documented instructions\n- Ensure personnel confidentiality\n- Implement appropriate security measures\n- Assist with data subject requests\n- Maintain processing records\n- Cooperate with supervisory authorities\n\n',
        },
        { insert: '6. SUB-PROCESSORS\n', attributes: { bold: true } },
        { insert: 'Approved Sub-processors: {{subprocessors}}\n\n' },
        { insert: '7. DATA TRANSFERS\n', attributes: { bold: true } },
        { insert: 'International transfers shall comply with GDPR Chapter V requirements.\n\n' },
        { insert: '8. DATA BREACH NOTIFICATION\n', attributes: { bold: true } },
        {
          insert:
            'Processor shall notify Controller within {{breach_notification_hours}} hours of becoming aware of a breach.\n\n',
        },
        { insert: '9. AUDIT RIGHTS\n', attributes: { bold: true } },
        {
          insert:
            'Controller may audit Processor compliance with {{audit_notice}} days prior notice.\n\n',
        },
        { insert: 'SIGNATURES:\n\n', attributes: { bold: true } },
        { insert: 'DATA CONTROLLER: _________________________ Date: _____________\n' },
        { insert: 'DATA PROCESSOR: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'controller_name', type: 'text', label: 'Data Controller Name', required: true },
      { key: 'controller_address', type: 'text', label: 'Controller Address', required: true },
      { key: 'processor_name', type: 'text', label: 'Data Processor Name', required: true },
      { key: 'processor_address', type: 'text', label: 'Processor Address', required: true },
      { key: 'processing_nature', type: 'textarea', label: 'Nature of Processing', required: true },
      {
        key: 'processing_purpose',
        type: 'textarea',
        label: 'Purpose of Processing',
        required: true,
      },
      { key: 'processing_duration', type: 'text', label: 'Processing Duration', required: true },
      {
        key: 'data_subject_categories',
        type: 'textarea',
        label: 'Categories of Data Subjects',
        required: true,
      },
      {
        key: 'personal_data_types',
        type: 'textarea',
        label: 'Types of Personal Data',
        required: true,
      },
      { key: 'subprocessors', type: 'textarea', label: 'Approved Sub-processors', required: false },
      {
        key: 'breach_notification_hours',
        type: 'number',
        label: 'Breach Notification (Hours)',
        required: true,
      },
      { key: 'audit_notice', type: 'number', label: 'Audit Notice (Days)', required: true },
    ],
    signatureFields: [
      {
        id: 'controller_signature',
        label: 'Controller Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'processor_signature',
        label: 'Processor Signature',
        required: true,
        position: { page: 1, x: 100, y: 740 },
      },
    ],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Cookie Policy',
    slug: 'cookie-policy',
    description: 'Website cookie usage policy document',
    documentType: DocumentType.POLICY,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'cookie',
    color: '#F59E0B',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'COOKIE POLICY\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nLast Updated: ', attributes: { bold: true } },
        { insert: '{{last_updated}}\n\n' },
        {
          insert:
            'This Cookie Policy explains how {{company_name}} uses cookies and similar technologies.\n\n',
        },
        { insert: '1. WHAT ARE COOKIES?\n', attributes: { bold: true } },
        {
          insert:
            'Cookies are small text files stored on your device when you visit our website.\n\n',
        },
        { insert: '2. TYPES OF COOKIES WE USE\n', attributes: { bold: true } },
        { insert: '\nEssential Cookies\n', attributes: { bold: true } },
        { insert: 'Required for website functionality. Cannot be disabled.\n\n' },
        { insert: 'Performance Cookies\n', attributes: { bold: true } },
        { insert: 'Help us understand how visitors interact with our website.\n\n' },
        { insert: 'Functional Cookies\n', attributes: { bold: true } },
        { insert: 'Remember your preferences and settings.\n\n' },
        { insert: 'Targeting Cookies\n', attributes: { bold: true } },
        { insert: 'Used for advertising and marketing purposes.\n\n' },
        { insert: '3. THIRD-PARTY COOKIES\n', attributes: { bold: true } },
        { insert: 'We use cookies from the following third parties:\n{{third_party_cookies}}\n\n' },
        { insert: '4. COOKIE DURATION\n', attributes: { bold: true } },
        {
          insert:
            'Session Cookies: Deleted when you close your browser\nPersistent Cookies: Remain for {{cookie_duration}}\n\n',
        },
        { insert: '5. MANAGING COOKIES\n', attributes: { bold: true } },
        {
          insert:
            'You can manage cookies through your browser settings or our cookie consent tool.\n\n',
        },
        { insert: '6. CONTACT US\n', attributes: { bold: true } },
        { insert: 'For questions about cookies, contact us at: {{contact_email}}\n' },
      ],
    },
    placeholders: [
      { key: 'last_updated', type: 'date', label: 'Last Updated Date', required: true },
      { key: 'company_name', type: 'text', label: 'Company Name', required: true },
      {
        key: 'third_party_cookies',
        type: 'textarea',
        label: 'Third-Party Cookie Providers',
        required: false,
      },
      { key: 'cookie_duration', type: 'text', label: 'Persistent Cookie Duration', required: true },
      { key: 'contact_email', type: 'email', label: 'Contact Email', required: true },
    ],
    signatureFields: [],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'HIPAA Business Associate Agreement',
    slug: 'hipaa-business-associate-agreement',
    description: 'HIPAA compliant business associate agreement for healthcare',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'heart-pulse',
    color: '#EF4444',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'BUSINESS ASSOCIATE AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\n(HIPAA Compliant)\n\n' },
        { insert: 'This Business Associate Agreement ("BAA") is entered into as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'COVERED ENTITY:\n', attributes: { bold: true } },
        { insert: '{{covered_entity_name}}\n{{covered_entity_address}}\n\n' },
        { insert: 'BUSINESS ASSOCIATE:\n', attributes: { bold: true } },
        { insert: '{{business_associate_name}}\n{{business_associate_address}}\n\n' },
        { insert: '1. DEFINITIONS\n', attributes: { bold: true } },
        {
          insert: 'Terms used herein have the meanings set forth in HIPAA and the HITECH Act.\n\n',
        },
        { insert: '2. PERMITTED USES AND DISCLOSURES\n', attributes: { bold: true } },
        { insert: 'Business Associate may use or disclose PHI only to:\n{{permitted_uses}}\n\n' },
        { insert: '3. BUSINESS ASSOCIATE OBLIGATIONS\n', attributes: { bold: true } },
        { insert: 'Business Associate agrees to:\n' },
        {
          insert:
            '- Not use or disclose PHI except as permitted\n- Use appropriate safeguards\n- Report any unauthorized use or disclosure\n- Ensure subcontractors agree to same restrictions\n- Make PHI available to individuals\n- Make records available to HHS\n- Return or destroy PHI upon termination\n\n',
        },
        { insert: '4. SECURITY REQUIREMENTS\n', attributes: { bold: true } },
        {
          insert:
            'Business Associate shall implement administrative, physical, and technical safeguards as required by the Security Rule.\n\n',
        },
        { insert: '5. BREACH NOTIFICATION\n', attributes: { bold: true } },
        {
          insert:
            'Business Associate shall notify Covered Entity of any breach within {{breach_notification_days}} days.\n\n',
        },
        { insert: '6. TERM AND TERMINATION\n', attributes: { bold: true } },
        { insert: 'This Agreement shall remain in effect until terminated by either party.\n\n' },
        { insert: '7. MISCELLANEOUS\n', attributes: { bold: true } },
        {
          insert:
            'This Agreement shall be governed by federal law and the laws of {{governing_state}}.\n\n',
        },
        { insert: 'SIGNATURES:\n\n', attributes: { bold: true } },
        { insert: 'COVERED ENTITY: _________________________ Date: _____________\n' },
        { insert: 'BUSINESS ASSOCIATE: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'covered_entity_name', type: 'text', label: 'Covered Entity Name', required: true },
      {
        key: 'covered_entity_address',
        type: 'text',
        label: 'Covered Entity Address',
        required: true,
      },
      {
        key: 'business_associate_name',
        type: 'text',
        label: 'Business Associate Name',
        required: true,
      },
      {
        key: 'business_associate_address',
        type: 'text',
        label: 'Business Associate Address',
        required: true,
      },
      { key: 'permitted_uses', type: 'textarea', label: 'Permitted Uses of PHI', required: true },
      {
        key: 'breach_notification_days',
        type: 'number',
        label: 'Breach Notification (Days)',
        required: true,
      },
      { key: 'governing_state', type: 'text', label: 'Governing State', required: true },
    ],
    signatureFields: [
      {
        id: 'covered_entity_signature',
        label: 'Covered Entity Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'business_associate_signature',
        label: 'Business Associate Signature',
        required: true,
        position: { page: 1, x: 100, y: 740 },
      },
    ],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Acceptable Use Policy',
    slug: 'acceptable-use-policy',
    description: 'Policy governing acceptable use of services and systems',
    documentType: DocumentType.POLICY,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'check-circle',
    color: '#10B981',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'ACCEPTABLE USE POLICY\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nEffective Date: ', attributes: { bold: true } },
        { insert: '{{effective_date}}\n\n' },
        {
          insert:
            'This Acceptable Use Policy ("AUP") governs the use of {{company_name}} services and systems.\n\n',
        },
        { insert: '1. PURPOSE\n', attributes: { bold: true } },
        {
          insert:
            'This policy outlines acceptable and unacceptable uses of our services to ensure security and compliance.\n\n',
        },
        { insert: '2. ACCEPTABLE USE\n', attributes: { bold: true } },
        { insert: 'Users may use our services for:\n{{acceptable_uses}}\n\n' },
        { insert: '3. PROHIBITED ACTIVITIES\n', attributes: { bold: true } },
        { insert: 'The following activities are strictly prohibited:\n' },
        {
          insert:
            '- Illegal activities or promoting illegal actions\n- Harassment, abuse, or threatening behavior\n- Distribution of malware or malicious code\n- Unauthorized access attempts\n- Copyright or trademark infringement\n- Spam or unsolicited communications\n- Data mining without authorization\n- Impersonation of others\n\n',
        },
        { insert: '4. SECURITY REQUIREMENTS\n', attributes: { bold: true } },
        { insert: 'Users must:\n' },
        {
          insert:
            '- Maintain secure passwords\n- Report security vulnerabilities\n- Not share account credentials\n- Use two-factor authentication when available\n\n',
        },
        { insert: '5. MONITORING\n', attributes: { bold: true } },
        { insert: 'We reserve the right to monitor usage for compliance with this policy.\n\n' },
        { insert: '6. ENFORCEMENT\n', attributes: { bold: true } },
        { insert: 'Violations may result in:\n' },
        {
          insert:
            '- Warning notification\n- Temporary suspension\n- Account termination\n- Legal action\n\n',
        },
        { insert: '7. REPORTING VIOLATIONS\n', attributes: { bold: true } },
        { insert: 'Report violations to: {{report_email}}\n\n' },
        { insert: '8. CONTACT\n', attributes: { bold: true } },
        { insert: 'Questions about this policy: {{contact_email}}\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'company_name', type: 'text', label: 'Company Name', required: true },
      { key: 'acceptable_uses', type: 'textarea', label: 'Acceptable Uses', required: true },
      { key: 'report_email', type: 'email', label: 'Violation Report Email', required: true },
      { key: 'contact_email', type: 'email', label: 'Contact Email', required: true },
    ],
    signatureFields: [],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Compliance Certification',
    slug: 'compliance-certification',
    description: 'Certificate confirming regulatory compliance',
    documentType: DocumentType.CERTIFICATE,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'award',
    color: '#0EA5E9',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'COMPLIANCE CERTIFICATION\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nCertificate Number: ', attributes: { bold: true } },
        { insert: '{{certificate_number}}\n\n' },
        { insert: 'This is to certify that:\n\n' },
        { insert: '{{organization_name}}\n', attributes: { bold: true, size: 'large' } },
        { insert: '{{organization_address}}\n\n' },
        {
          insert: 'Has been assessed and found to be in compliance with:\n\n',
          attributes: { bold: true },
        },
        { insert: '{{compliance_standard}}\n', attributes: { bold: true, size: 'large' } },
        { insert: '\nScope of Certification:\n', attributes: { bold: true } },
        { insert: '{{certification_scope}}\n\n' },
        { insert: 'Assessment Date: ', attributes: { bold: true } },
        { insert: '{{assessment_date}}\n' },
        { insert: 'Valid From: ', attributes: { bold: true } },
        { insert: '{{valid_from}}\n' },
        { insert: 'Valid Until: ', attributes: { bold: true } },
        { insert: '{{valid_until}}\n\n' },
        {
          insert:
            'This certification confirms that the organization has demonstrated compliance with all applicable requirements of the standard through documented evidence and assessment procedures.\n\n',
        },
        { insert: 'Certifying Body:\n', attributes: { bold: true } },
        { insert: '{{certifying_body}}\n{{certifier_name}}\n{{certifier_title}}\n\n' },
        { insert: 'Signature: _________________________\nDate: {{issue_date}}\n' },
      ],
    },
    placeholders: [
      { key: 'certificate_number', type: 'text', label: 'Certificate Number', required: true },
      { key: 'organization_name', type: 'text', label: 'Organization Name', required: true },
      { key: 'organization_address', type: 'text', label: 'Organization Address', required: true },
      { key: 'compliance_standard', type: 'text', label: 'Compliance Standard', required: true },
      {
        key: 'certification_scope',
        type: 'textarea',
        label: 'Certification Scope',
        required: true,
      },
      { key: 'assessment_date', type: 'date', label: 'Assessment Date', required: true },
      { key: 'valid_from', type: 'date', label: 'Valid From', required: true },
      { key: 'valid_until', type: 'date', label: 'Valid Until', required: true },
      { key: 'certifying_body', type: 'text', label: 'Certifying Body', required: true },
      { key: 'certifier_name', type: 'text', label: 'Certifier Name', required: true },
      { key: 'certifier_title', type: 'text', label: 'Certifier Title', required: true },
      { key: 'issue_date', type: 'date', label: 'Issue Date', required: true },
    ],
    signatureFields: [
      {
        id: 'certifier_signature',
        label: 'Certifier Signature',
        required: true,
        position: { page: 1, x: 100, y: 680 },
      },
    ],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Regulatory Compliance Report',
    slug: 'regulatory-compliance-report',
    description: 'Report documenting compliance with regulatory requirements',
    documentType: DocumentType.REPORT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'clipboard-check',
    color: '#84CC16',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'REGULATORY COMPLIANCE REPORT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nReport Date: ', attributes: { bold: true } },
        { insert: '{{report_date}}\n' },
        { insert: 'Reporting Period: ', attributes: { bold: true } },
        { insert: '{{reporting_period}}\n\n' },
        { insert: 'Organization: ', attributes: { bold: true } },
        { insert: '{{organization_name}}\n' },
        { insert: 'Prepared By: ', attributes: { bold: true } },
        { insert: '{{preparer_name}}\n\n' },
        { insert: '1. EXECUTIVE SUMMARY\n', attributes: { bold: true } },
        { insert: '{{executive_summary}}\n\n' },
        { insert: '2. REGULATIONS COVERED\n', attributes: { bold: true } },
        { insert: '{{regulations_covered}}\n\n' },
        { insert: '3. COMPLIANCE STATUS\n', attributes: { bold: true } },
        { insert: 'Overall Status: {{overall_status}}\n\n' },
        { insert: '4. KEY FINDINGS\n', attributes: { bold: true } },
        { insert: '{{key_findings}}\n\n' },
        { insert: '5. AREAS OF NON-COMPLIANCE\n', attributes: { bold: true } },
        { insert: '{{non_compliance_areas}}\n\n' },
        { insert: '6. REMEDIATION ACTIONS\n', attributes: { bold: true } },
        { insert: '{{remediation_actions}}\n\n' },
        { insert: '7. RISK ASSESSMENT\n', attributes: { bold: true } },
        { insert: '{{risk_assessment}}\n\n' },
        { insert: '8. RECOMMENDATIONS\n', attributes: { bold: true } },
        { insert: '{{recommendations}}\n\n' },
        { insert: '9. NEXT REVIEW DATE\n', attributes: { bold: true } },
        { insert: '{{next_review_date}}\n\n' },
        { insert: 'Approved By: _________________________\nDate: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'report_date', type: 'date', label: 'Report Date', required: true },
      { key: 'reporting_period', type: 'text', label: 'Reporting Period', required: true },
      { key: 'organization_name', type: 'text', label: 'Organization Name', required: true },
      { key: 'preparer_name', type: 'text', label: 'Preparer Name', required: true },
      { key: 'executive_summary', type: 'textarea', label: 'Executive Summary', required: true },
      {
        key: 'regulations_covered',
        type: 'textarea',
        label: 'Regulations Covered',
        required: true,
      },
      {
        key: 'overall_status',
        type: 'select',
        label: 'Overall Status',
        required: true,
        options: ['Compliant', 'Partially Compliant', 'Non-Compliant'],
      },
      { key: 'key_findings', type: 'textarea', label: 'Key Findings', required: true },
      {
        key: 'non_compliance_areas',
        type: 'textarea',
        label: 'Non-Compliance Areas',
        required: false,
      },
      {
        key: 'remediation_actions',
        type: 'textarea',
        label: 'Remediation Actions',
        required: false,
      },
      { key: 'risk_assessment', type: 'textarea', label: 'Risk Assessment', required: true },
      { key: 'recommendations', type: 'textarea', label: 'Recommendations', required: true },
      { key: 'next_review_date', type: 'date', label: 'Next Review Date', required: true },
    ],
    signatureFields: [
      {
        id: 'approver_signature',
        label: 'Approver Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
    ],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
];
