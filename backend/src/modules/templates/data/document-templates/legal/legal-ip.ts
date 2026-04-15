import { DocumentType, DocumentTemplateCategory } from '../../../dto/document-template.dto';

export const LEGAL_IP_TEMPLATES = [
  {
    name: 'Trademark Assignment Agreement',
    slug: 'trademark-assignment-agreement',
    description: 'Agreement for transferring trademark ownership',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'trademark',
    color: '#6366F1',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'TRADEMARK ASSIGNMENT AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nThis Trademark Assignment Agreement ("Agreement") is made as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'ASSIGNOR:\n', attributes: { bold: true } },
        { insert: '{{assignor_name}}\n{{assignor_address}}\n\n' },
        { insert: 'ASSIGNEE:\n', attributes: { bold: true } },
        { insert: '{{assignee_name}}\n{{assignee_address}}\n\n' },
        { insert: '1. TRADEMARK(S) ASSIGNED\n', attributes: { bold: true } },
        {
          insert:
            'Assignor hereby assigns to Assignee all right, title, and interest in and to the following trademark(s):\n',
        },
        {
          insert:
            'Mark: {{trademark_name}}\nRegistration Number: {{registration_number}}\nRegistration Date: {{registration_date}}\nGoods/Services: {{goods_services}}\n\n',
        },
        { insert: '2. GOODWILL\n', attributes: { bold: true } },
        {
          insert:
            'This assignment includes the goodwill of the business associated with the trademark(s).\n\n',
        },
        { insert: '3. CONSIDERATION\n', attributes: { bold: true } },
        {
          insert:
            'In consideration for this assignment, Assignee shall pay Assignor: {{consideration}}\n\n',
        },
        { insert: '4. REPRESENTATIONS AND WARRANTIES\n', attributes: { bold: true } },
        { insert: 'Assignor represents and warrants that:\n' },
        {
          insert:
            '- Assignor is the sole owner of the trademark(s)\n- The trademark(s) are valid and subsisting\n- There are no liens or encumbrances\n- No litigation is pending regarding the trademark(s)\n\n',
        },
        { insert: '5. FURTHER ASSURANCES\n', attributes: { bold: true } },
        {
          insert:
            'Assignor agrees to execute any additional documents necessary to perfect the assignment.\n\n',
        },
        { insert: '6. RECORDATION\n', attributes: { bold: true } },
        {
          insert: 'Assignee may record this assignment with the appropriate trademark office.\n\n',
        },
        { insert: '7. GOVERNING LAW\n', attributes: { bold: true } },
        {
          insert: 'This Agreement shall be governed by the laws of {{governing_jurisdiction}}.\n\n',
        },
        { insert: 'IN WITNESS WHEREOF:\n\n', attributes: { bold: true } },
        { insert: 'ASSIGNOR: _________________________ Date: _____________\n' },
        { insert: 'ASSIGNEE: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'assignor_name', type: 'text', label: 'Assignor Name', required: true },
      { key: 'assignor_address', type: 'text', label: 'Assignor Address', required: true },
      { key: 'assignee_name', type: 'text', label: 'Assignee Name', required: true },
      { key: 'assignee_address', type: 'text', label: 'Assignee Address', required: true },
      { key: 'trademark_name', type: 'text', label: 'Trademark Name', required: true },
      { key: 'registration_number', type: 'text', label: 'Registration Number', required: true },
      { key: 'registration_date', type: 'date', label: 'Registration Date', required: true },
      { key: 'goods_services', type: 'textarea', label: 'Goods/Services', required: true },
      { key: 'consideration', type: 'currency', label: 'Consideration', required: true },
      {
        key: 'governing_jurisdiction',
        type: 'text',
        label: 'Governing Jurisdiction',
        required: true,
      },
    ],
    signatureFields: [
      {
        id: 'assignor_signature',
        label: 'Assignor Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'assignee_signature',
        label: 'Assignee Signature',
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
    name: 'Copyright Assignment Agreement',
    slug: 'copyright-assignment-agreement',
    description: 'Agreement for transferring copyright ownership',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'copyright',
    color: '#8B5CF6',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'COPYRIGHT ASSIGNMENT AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nThis Copyright Assignment Agreement ("Agreement") is made as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'ASSIGNOR:\n', attributes: { bold: true } },
        { insert: '{{assignor_name}}\n{{assignor_address}}\n\n' },
        { insert: 'ASSIGNEE:\n', attributes: { bold: true } },
        { insert: '{{assignee_name}}\n{{assignee_address}}\n\n' },
        { insert: '1. WORK(S) ASSIGNED\n', attributes: { bold: true } },
        {
          insert:
            'Assignor hereby assigns to Assignee all right, title, and interest in and to the following work(s):\n',
        },
        {
          insert:
            'Title: {{work_title}}\nDescription: {{work_description}}\nCreation Date: {{creation_date}}\nRegistration Number (if any): {{registration_number}}\n\n',
        },
        { insert: '2. SCOPE OF ASSIGNMENT\n', attributes: { bold: true } },
        { insert: 'This assignment includes:\n' },
        {
          insert:
            '- All copyrights in the Work(s)\n- All derivative works and adaptations\n- All rights to reproduce, distribute, display, and perform\n- All rights throughout the world\n- All rights for the full term of copyright\n\n',
        },
        { insert: '3. CONSIDERATION\n', attributes: { bold: true } },
        {
          insert:
            'In consideration for this assignment, Assignee shall pay Assignor: {{consideration}}\n\n',
        },
        { insert: '4. MORAL RIGHTS\n', attributes: { bold: true } },
        {
          insert:
            'To the extent permitted by law, Assignor waives all moral rights in the Work(s).\n\n',
        },
        { insert: '5. REPRESENTATIONS AND WARRANTIES\n', attributes: { bold: true } },
        { insert: 'Assignor represents and warrants that:\n' },
        {
          insert:
            '- Assignor is the sole author and owner of the Work(s)\n- The Work(s) are original\n- The Work(s) do not infringe any third party rights\n- No prior assignments or licenses conflict with this Agreement\n\n',
        },
        { insert: '6. INDEMNIFICATION\n', attributes: { bold: true } },
        {
          insert:
            'Assignor shall indemnify Assignee against any claims arising from breach of the above warranties.\n\n',
        },
        { insert: '7. GOVERNING LAW\n', attributes: { bold: true } },
        {
          insert: 'This Agreement shall be governed by the laws of {{governing_jurisdiction}}.\n\n',
        },
        { insert: 'IN WITNESS WHEREOF:\n\n', attributes: { bold: true } },
        { insert: 'ASSIGNOR: _________________________ Date: _____________\n' },
        { insert: 'ASSIGNEE: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'assignor_name', type: 'text', label: 'Assignor Name', required: true },
      { key: 'assignor_address', type: 'text', label: 'Assignor Address', required: true },
      { key: 'assignee_name', type: 'text', label: 'Assignee Name', required: true },
      { key: 'assignee_address', type: 'text', label: 'Assignee Address', required: true },
      { key: 'work_title', type: 'text', label: 'Work Title', required: true },
      { key: 'work_description', type: 'textarea', label: 'Work Description', required: true },
      { key: 'creation_date', type: 'date', label: 'Creation Date', required: true },
      { key: 'registration_number', type: 'text', label: 'Registration Number', required: false },
      { key: 'consideration', type: 'currency', label: 'Consideration', required: true },
      {
        key: 'governing_jurisdiction',
        type: 'text',
        label: 'Governing Jurisdiction',
        required: true,
      },
    ],
    signatureFields: [
      {
        id: 'assignor_signature',
        label: 'Assignor Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'assignee_signature',
        label: 'Assignee Signature',
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
    name: 'Patent Assignment Agreement',
    slug: 'patent-assignment-agreement',
    description: 'Agreement for transferring patent rights',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'lightbulb',
    color: '#F59E0B',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'PATENT ASSIGNMENT AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nThis Patent Assignment Agreement ("Agreement") is made as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'ASSIGNOR:\n', attributes: { bold: true } },
        { insert: '{{assignor_name}}\n{{assignor_address}}\n\n' },
        { insert: 'ASSIGNEE:\n', attributes: { bold: true } },
        { insert: '{{assignee_name}}\n{{assignee_address}}\n\n' },
        { insert: '1. PATENT(S) ASSIGNED\n', attributes: { bold: true } },
        {
          insert: 'Assignor hereby assigns to Assignee all right, title, and interest in and to:\n',
        },
        {
          insert:
            'Patent Title: {{patent_title}}\nPatent Number: {{patent_number}}\nIssue Date: {{issue_date}}\nApplication Number: {{application_number}}\nInventor(s): {{inventors}}\n\n',
        },
        { insert: '2. SCOPE OF ASSIGNMENT\n', attributes: { bold: true } },
        { insert: 'This assignment includes:\n' },
        {
          insert:
            '- The Patent and all claims\n- All continuations, divisions, and reissues\n- All foreign counterparts\n- All rights to sue for past infringement\n\n',
        },
        { insert: '3. CONSIDERATION\n', attributes: { bold: true } },
        {
          insert:
            'In consideration for this assignment, Assignee shall pay Assignor: {{consideration}}\n\n',
        },
        { insert: '4. REPRESENTATIONS AND WARRANTIES\n', attributes: { bold: true } },
        { insert: 'Assignor represents and warrants that:\n' },
        {
          insert:
            '- Assignor has the right to make this assignment\n- The Patent is valid and enforceable\n- There are no liens or encumbrances\n- All maintenance fees have been paid\n\n',
        },
        { insert: '5. FURTHER ASSURANCES\n', attributes: { bold: true } },
        {
          insert: 'Assignor shall execute any documents necessary to perfect this assignment.\n\n',
        },
        { insert: '6. RECORDATION\n', attributes: { bold: true } },
        { insert: 'Assignee shall record this assignment with the appropriate patent office.\n\n' },
        { insert: '7. GOVERNING LAW\n', attributes: { bold: true } },
        {
          insert: 'This Agreement shall be governed by the laws of {{governing_jurisdiction}}.\n\n',
        },
        { insert: 'IN WITNESS WHEREOF:\n\n', attributes: { bold: true } },
        { insert: 'ASSIGNOR: _________________________ Date: _____________\n' },
        { insert: 'ASSIGNEE: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'assignor_name', type: 'text', label: 'Assignor Name', required: true },
      { key: 'assignor_address', type: 'text', label: 'Assignor Address', required: true },
      { key: 'assignee_name', type: 'text', label: 'Assignee Name', required: true },
      { key: 'assignee_address', type: 'text', label: 'Assignee Address', required: true },
      { key: 'patent_title', type: 'text', label: 'Patent Title', required: true },
      { key: 'patent_number', type: 'text', label: 'Patent Number', required: true },
      { key: 'issue_date', type: 'date', label: 'Issue Date', required: true },
      { key: 'application_number', type: 'text', label: 'Application Number', required: true },
      { key: 'inventors', type: 'text', label: 'Inventor(s)', required: true },
      { key: 'consideration', type: 'currency', label: 'Consideration', required: true },
      {
        key: 'governing_jurisdiction',
        type: 'text',
        label: 'Governing Jurisdiction',
        required: true,
      },
    ],
    signatureFields: [
      {
        id: 'assignor_signature',
        label: 'Assignor Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'assignee_signature',
        label: 'Assignee Signature',
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
    name: 'Work for Hire Agreement',
    slug: 'work-for-hire-agreement',
    description: 'Agreement establishing work created as work for hire',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'briefcase',
    color: '#EC4899',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'WORK FOR HIRE AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nThis Work for Hire Agreement ("Agreement") is made as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'COMMISSIONING PARTY:\n', attributes: { bold: true } },
        { insert: '{{commissioning_party_name}}\n{{commissioning_party_address}}\n\n' },
        { insert: 'CREATOR:\n', attributes: { bold: true } },
        { insert: '{{creator_name}}\n{{creator_address}}\n\n' },
        { insert: '1. WORK TO BE CREATED\n', attributes: { bold: true } },
        {
          insert: 'Creator agrees to create the following work ("Work"):\n{{work_description}}\n\n',
        },
        { insert: '2. WORK FOR HIRE DESIGNATION\n', attributes: { bold: true } },
        {
          insert:
            'The parties agree that the Work shall be considered a "work made for hire" as defined under the Copyright Act. All rights in the Work shall belong to the Commissioning Party from the moment of creation.\n\n',
        },
        { insert: '3. ASSIGNMENT OF RIGHTS\n', attributes: { bold: true } },
        {
          insert:
            'To the extent the Work does not qualify as work for hire, Creator hereby assigns all rights to the Commissioning Party.\n\n',
        },
        { insert: '4. DELIVERABLES\n', attributes: { bold: true } },
        { insert: '{{deliverables}}\n\n' },
        { insert: '5. DEADLINE\n', attributes: { bold: true } },
        { insert: 'The Work shall be delivered by: {{delivery_date}}\n\n' },
        { insert: '6. COMPENSATION\n', attributes: { bold: true } },
        {
          insert:
            'Commissioning Party shall pay Creator: {{compensation}}\nPayment Schedule: {{payment_schedule}}\n\n',
        },
        { insert: '7. MORAL RIGHTS WAIVER\n', attributes: { bold: true } },
        {
          insert: 'Creator waives all moral rights in the Work to the extent permitted by law.\n\n',
        },
        { insert: '8. REPRESENTATIONS\n', attributes: { bold: true } },
        {
          insert:
            'Creator represents that the Work will be original and will not infringe any third party rights.\n\n',
        },
        { insert: '9. CONFIDENTIALITY\n', attributes: { bold: true } },
        {
          insert:
            'Creator agrees to maintain confidentiality of all project-related information.\n\n',
        },
        { insert: 'IN WITNESS WHEREOF:\n\n', attributes: { bold: true } },
        { insert: 'COMMISSIONING PARTY: _________________________ Date: _____________\n' },
        { insert: 'CREATOR: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      {
        key: 'commissioning_party_name',
        type: 'text',
        label: 'Commissioning Party Name',
        required: true,
      },
      {
        key: 'commissioning_party_address',
        type: 'text',
        label: 'Commissioning Party Address',
        required: true,
      },
      { key: 'creator_name', type: 'text', label: 'Creator Name', required: true },
      { key: 'creator_address', type: 'text', label: 'Creator Address', required: true },
      { key: 'work_description', type: 'textarea', label: 'Work Description', required: true },
      { key: 'deliverables', type: 'textarea', label: 'Deliverables', required: true },
      { key: 'delivery_date', type: 'date', label: 'Delivery Date', required: true },
      { key: 'compensation', type: 'currency', label: 'Compensation', required: true },
      { key: 'payment_schedule', type: 'text', label: 'Payment Schedule', required: true },
    ],
    signatureFields: [
      {
        id: 'commissioning_party_signature',
        label: 'Commissioning Party Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'creator_signature',
        label: 'Creator Signature',
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
    name: 'Software License Agreement',
    slug: 'software-license-agreement',
    description: 'End user license agreement for software',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'code',
    color: '#10B981',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'SOFTWARE LICENSE AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nThis Software License Agreement ("Agreement") is entered into as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'LICENSOR:\n', attributes: { bold: true } },
        { insert: '{{licensor_name}}\n{{licensor_address}}\n\n' },
        { insert: 'LICENSEE:\n', attributes: { bold: true } },
        { insert: '{{licensee_name}}\n{{licensee_address}}\n\n' },
        { insert: '1. SOFTWARE\n', attributes: { bold: true } },
        {
          insert:
            'Software Name: {{software_name}}\nVersion: {{software_version}}\nDescription: {{software_description}}\n\n',
        },
        { insert: '2. GRANT OF LICENSE\n', attributes: { bold: true } },
        { insert: 'Licensor grants Licensee a {{license_type}} license to use the Software.\n\n' },
        { insert: '3. PERMITTED USES\n', attributes: { bold: true } },
        {
          insert:
            'Number of Users: {{number_of_users}}\nNumber of Installations: {{number_of_installations}}\nPermitted Uses: {{permitted_uses}}\n\n',
        },
        { insert: '4. RESTRICTIONS\n', attributes: { bold: true } },
        { insert: 'Licensee shall NOT:\n' },
        {
          insert:
            '- Reverse engineer, decompile, or disassemble the Software\n- Sublicense or transfer the Software\n- Modify or create derivative works\n- Remove any proprietary notices\n\n',
        },
        { insert: '5. LICENSE FEE\n', attributes: { bold: true } },
        { insert: 'License Fee: {{license_fee}}\nPayment Terms: {{payment_terms}}\n\n' },
        { insert: '6. TERM\n', attributes: { bold: true } },
        { insert: 'License Term: {{license_term}}\nRenewal: {{renewal_terms}}\n\n' },
        { insert: '7. SUPPORT AND MAINTENANCE\n', attributes: { bold: true } },
        { insert: '{{support_terms}}\n\n' },
        { insert: '8. WARRANTY\n', attributes: { bold: true } },
        { insert: '{{warranty_terms}}\n\n' },
        { insert: '9. LIMITATION OF LIABILITY\n', attributes: { bold: true } },
        { insert: "Licensor's liability shall not exceed the license fees paid.\n\n" },
        { insert: '10. GOVERNING LAW\n', attributes: { bold: true } },
        {
          insert: 'This Agreement shall be governed by the laws of {{governing_jurisdiction}}.\n\n',
        },
        { insert: 'IN WITNESS WHEREOF:\n\n', attributes: { bold: true } },
        { insert: 'LICENSOR: _________________________ Date: _____________\n' },
        { insert: 'LICENSEE: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { key: 'licensor_name', type: 'text', label: 'Licensor Name', required: true },
      { key: 'licensor_address', type: 'text', label: 'Licensor Address', required: true },
      { key: 'licensee_name', type: 'text', label: 'Licensee Name', required: true },
      { key: 'licensee_address', type: 'text', label: 'Licensee Address', required: true },
      { key: 'software_name', type: 'text', label: 'Software Name', required: true },
      { key: 'software_version', type: 'text', label: 'Software Version', required: true },
      {
        key: 'software_description',
        type: 'textarea',
        label: 'Software Description',
        required: true,
      },
      {
        key: 'license_type',
        type: 'select',
        label: 'License Type',
        required: true,
        options: ['Perpetual', 'Subscription', 'Trial', 'Enterprise'],
      },
      { key: 'number_of_users', type: 'number', label: 'Number of Users', required: true },
      {
        key: 'number_of_installations',
        type: 'number',
        label: 'Number of Installations',
        required: true,
      },
      { key: 'permitted_uses', type: 'textarea', label: 'Permitted Uses', required: true },
      { key: 'license_fee', type: 'currency', label: 'License Fee', required: true },
      { key: 'payment_terms', type: 'text', label: 'Payment Terms', required: true },
      { key: 'license_term', type: 'text', label: 'License Term', required: true },
      { key: 'renewal_terms', type: 'text', label: 'Renewal Terms', required: false },
      { key: 'support_terms', type: 'textarea', label: 'Support Terms', required: false },
      { key: 'warranty_terms', type: 'textarea', label: 'Warranty Terms', required: true },
      {
        key: 'governing_jurisdiction',
        type: 'text',
        label: 'Governing Jurisdiction',
        required: true,
      },
    ],
    signatureFields: [
      {
        id: 'licensor_signature',
        label: 'Licensor Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'licensee_signature',
        label: 'Licensee Signature',
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
    name: 'Invention Disclosure Form',
    slug: 'invention-disclosure-form',
    description: 'Form for documenting and disclosing new inventions',
    documentType: DocumentType.FORM,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'rocket',
    color: '#0EA5E9',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'INVENTION DISCLOSURE FORM\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nSubmission Date: ', attributes: { bold: true } },
        { insert: '{{submission_date}}\nDisclosure Number: {{disclosure_number}}\n\n' },
        { insert: '1. INVENTOR INFORMATION\n', attributes: { bold: true } },
        {
          insert:
            'Primary Inventor: {{primary_inventor}}\nDepartment: {{department}}\nEmail: {{inventor_email}}\nPhone: {{inventor_phone}}\n\n',
        },
        { insert: 'Co-Inventors:\n{{co_inventors}}\n\n' },
        { insert: '2. INVENTION TITLE\n', attributes: { bold: true } },
        { insert: '{{invention_title}}\n\n' },
        { insert: '3. DESCRIPTION OF INVENTION\n', attributes: { bold: true } },
        { insert: '{{invention_description}}\n\n' },
        { insert: '4. PROBLEM SOLVED\n', attributes: { bold: true } },
        { insert: 'What problem does this invention solve?\n{{problem_solved}}\n\n' },
        { insert: '5. NOVELTY\n', attributes: { bold: true } },
        { insert: 'What is new or different about this invention?\n{{novelty_description}}\n\n' },
        { insert: '6. PRIOR ART\n', attributes: { bold: true } },
        { insert: 'Known prior art or similar technologies:\n{{prior_art}}\n\n' },
        { insert: '7. DEVELOPMENT STATUS\n', attributes: { bold: true } },
        {
          insert:
            'Current Status: {{development_status}}\nConception Date: {{conception_date}}\nFirst Reduction to Practice: {{reduction_to_practice}}\n\n',
        },
        { insert: '8. PUBLIC DISCLOSURE\n', attributes: { bold: true } },
        {
          insert:
            'Has this invention been publicly disclosed? {{public_disclosure}}\nIf yes, provide details: {{disclosure_details}}\n\n',
        },
        { insert: '9. COMMERCIAL POTENTIAL\n', attributes: { bold: true } },
        { insert: 'Potential applications and markets:\n{{commercial_potential}}\n\n' },
        { insert: '10. FUNDING SOURCES\n', attributes: { bold: true } },
        { insert: '{{funding_sources}}\n\n' },
        { insert: '11. SUPPORTING MATERIALS\n', attributes: { bold: true } },
        { insert: '{{supporting_materials}}\n\n' },
        { insert: 'INVENTOR CERTIFICATION\n', attributes: { bold: true } },
        { insert: 'I certify that the information provided is accurate and complete.\n\n' },
        { insert: 'Inventor Signature: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'submission_date', type: 'date', label: 'Submission Date', required: true },
      { key: 'disclosure_number', type: 'text', label: 'Disclosure Number', required: true },
      { key: 'primary_inventor', type: 'text', label: 'Primary Inventor', required: true },
      { key: 'department', type: 'text', label: 'Department', required: true },
      { key: 'inventor_email', type: 'email', label: 'Inventor Email', required: true },
      { key: 'inventor_phone', type: 'text', label: 'Inventor Phone', required: true },
      { key: 'co_inventors', type: 'textarea', label: 'Co-Inventors', required: false },
      { key: 'invention_title', type: 'text', label: 'Invention Title', required: true },
      {
        key: 'invention_description',
        type: 'textarea',
        label: 'Invention Description',
        required: true,
      },
      { key: 'problem_solved', type: 'textarea', label: 'Problem Solved', required: true },
      {
        key: 'novelty_description',
        type: 'textarea',
        label: 'Novelty Description',
        required: true,
      },
      { key: 'prior_art', type: 'textarea', label: 'Prior Art', required: false },
      {
        key: 'development_status',
        type: 'select',
        label: 'Development Status',
        required: true,
        options: ['Concept', 'Prototype', 'Working Model', 'Production Ready'],
      },
      { key: 'conception_date', type: 'date', label: 'Conception Date', required: true },
      {
        key: 'reduction_to_practice',
        type: 'date',
        label: 'First Reduction to Practice',
        required: false,
      },
      {
        key: 'public_disclosure',
        type: 'select',
        label: 'Public Disclosure',
        required: true,
        options: ['Yes', 'No'],
      },
      { key: 'disclosure_details', type: 'textarea', label: 'Disclosure Details', required: false },
      {
        key: 'commercial_potential',
        type: 'textarea',
        label: 'Commercial Potential',
        required: true,
      },
      { key: 'funding_sources', type: 'textarea', label: 'Funding Sources', required: false },
      {
        key: 'supporting_materials',
        type: 'textarea',
        label: 'Supporting Materials',
        required: false,
      },
    ],
    signatureFields: [
      {
        id: 'inventor_signature',
        label: 'Inventor Signature',
        required: true,
        position: { page: 1, x: 100, y: 720 },
      },
    ],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Intellectual Property Policy',
    slug: 'intellectual-property-policy',
    description: 'Company policy on intellectual property ownership and protection',
    documentType: DocumentType.POLICY,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'shield',
    color: '#84CC16',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'INTELLECTUAL PROPERTY POLICY\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\n{{company_name}}\n' },
        { insert: 'Effective Date: {{effective_date}}\n\n' },
        { insert: '1. PURPOSE\n', attributes: { bold: true } },
        {
          insert:
            'This policy establishes guidelines for the creation, ownership, and protection of intellectual property ("IP") created by or for {{company_name}}.\n\n',
        },
        { insert: '2. SCOPE\n', attributes: { bold: true } },
        {
          insert:
            'This policy applies to all employees, contractors, consultants, and others who create IP in connection with their work for the Company.\n\n',
        },
        { insert: '3. DEFINITIONS\n', attributes: { bold: true } },
        {
          insert:
            '- Patents: Inventions and discoveries\n- Copyrights: Original works of authorship\n- Trademarks: Brand names, logos, slogans\n- Trade Secrets: Confidential business information\n\n',
        },
        { insert: '4. OWNERSHIP\n', attributes: { bold: true } },
        {
          insert:
            '4.1 Company-Owned IP:\nAll IP created by employees within the scope of employment or using Company resources shall be owned by the Company.\n\n',
        },
        {
          insert:
            '4.2 Prior Inventions:\nEmployees must disclose any prior inventions at the time of hiring.\n\n',
        },
        { insert: '5. DISCLOSURE REQUIREMENTS\n', attributes: { bold: true } },
        {
          insert:
            'All potentially patentable inventions must be disclosed using the Invention Disclosure Form within {{disclosure_period}} days of conception.\n\n',
        },
        { insert: '6. PROTECTION PROCEDURES\n', attributes: { bold: true } },
        { insert: '{{protection_procedures}}\n\n' },
        { insert: '7. CONFIDENTIALITY\n', attributes: { bold: true } },
        {
          insert:
            'All IP must be treated as confidential until publicly disclosed through proper channels.\n\n',
        },
        { insert: '8. THIRD PARTY IP\n', attributes: { bold: true } },
        {
          insert:
            'Employees must not use third party IP without proper authorization or licensing.\n\n',
        },
        { insert: '9. INVENTOR RECOGNITION\n', attributes: { bold: true } },
        { insert: '{{inventor_recognition}}\n\n' },
        { insert: '10. ENFORCEMENT\n', attributes: { bold: true } },
        {
          insert:
            'Violations of this policy may result in disciplinary action, up to and including termination.\n\n',
        },
        { insert: '11. QUESTIONS\n', attributes: { bold: true } },
        { insert: 'Contact: {{ip_contact}}\n' },
      ],
    },
    placeholders: [
      { key: 'company_name', type: 'text', label: 'Company Name', required: true },
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      {
        key: 'disclosure_period',
        type: 'number',
        label: 'Disclosure Period (Days)',
        required: true,
      },
      {
        key: 'protection_procedures',
        type: 'textarea',
        label: 'Protection Procedures',
        required: true,
      },
      {
        key: 'inventor_recognition',
        type: 'textarea',
        label: 'Inventor Recognition Program',
        required: false,
      },
      { key: 'ip_contact', type: 'email', label: 'IP Contact Email', required: true },
    ],
    signatureFields: [],
    settings: {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  },
  {
    name: 'Trade Secret Protection Agreement',
    slug: 'trade-secret-protection-agreement',
    description: 'Agreement for protection of trade secrets and confidential information',
    documentType: DocumentType.AGREEMENT,
    category: DocumentTemplateCategory.LEGAL,
    icon: 'lock',
    color: '#EF4444',
    isFeatured: false,
    content: {
      ops: [
        { insert: 'TRADE SECRET PROTECTION AGREEMENT\n', attributes: { bold: true, size: 'huge' } },
        { insert: '\nThis Trade Secret Protection Agreement ("Agreement") is made as of ' },
        { insert: '{{effective_date}}', attributes: { bold: true } },
        { insert: ' between:\n\n' },
        { insert: 'DISCLOSING PARTY:\n', attributes: { bold: true } },
        { insert: '{{disclosing_party_name}}\n{{disclosing_party_address}}\n\n' },
        { insert: 'RECEIVING PARTY:\n', attributes: { bold: true } },
        { insert: '{{receiving_party_name}}\n{{receiving_party_address}}\n\n' },
        { insert: '1. DEFINITION OF TRADE SECRETS\n', attributes: { bold: true } },
        { insert: 'For purposes of this Agreement, "Trade Secrets" means information that:\n' },
        {
          insert:
            '- Derives economic value from being secret\n- Is the subject of reasonable efforts to maintain secrecy\n- Includes, but is not limited to: {{trade_secret_categories}}\n\n',
        },
        { insert: '2. OBLIGATIONS OF RECEIVING PARTY\n', attributes: { bold: true } },
        { insert: 'Receiving Party agrees to:\n' },
        {
          insert:
            '- Hold Trade Secrets in strict confidence\n- Use Trade Secrets only for {{permitted_purpose}}\n- Limit access to need-to-know personnel\n- Implement appropriate security measures\n- Not reverse engineer or analyze Trade Secrets\n\n',
        },
        { insert: '3. MARKING REQUIREMENTS\n', attributes: { bold: true } },
        { insert: 'Written Trade Secrets should be marked "Confidential" or "Trade Secret."\n\n' },
        { insert: '4. TERM\n', attributes: { bold: true } },
        {
          insert:
            'This Agreement shall remain in effect for {{term_years}} years from the Effective Date.\nTrade Secret obligations survive indefinitely while information remains a trade secret.\n\n',
        },
        { insert: '5. EXCLUSIONS\n', attributes: { bold: true } },
        { insert: 'This Agreement does not apply to information that:\n' },
        {
          insert:
            '- Becomes publicly available without breach\n- Was already known to Receiving Party\n- Is independently developed\n- Is rightfully received from a third party\n\n',
        },
        { insert: '6. RETURN OF MATERIALS\n', attributes: { bold: true } },
        {
          insert:
            'Upon request or termination, all Trade Secret materials must be returned or destroyed.\n\n',
        },
        { insert: '7. REMEDIES\n', attributes: { bold: true } },
        { insert: 'Disclosing Party is entitled to injunctive relief and damages for breach.\n\n' },
        { insert: '8. GOVERNING LAW\n', attributes: { bold: true } },
        {
          insert:
            'This Agreement shall be governed by the laws of {{governing_jurisdiction}} and the Defend Trade Secrets Act.\n\n',
        },
        { insert: 'IN WITNESS WHEREOF:\n\n', attributes: { bold: true } },
        { insert: 'DISCLOSING PARTY: _________________________ Date: _____________\n' },
        { insert: 'RECEIVING PARTY: _________________________ Date: _____________\n' },
      ],
    },
    placeholders: [
      { key: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      {
        key: 'disclosing_party_name',
        type: 'text',
        label: 'Disclosing Party Name',
        required: true,
      },
      {
        key: 'disclosing_party_address',
        type: 'text',
        label: 'Disclosing Party Address',
        required: true,
      },
      { key: 'receiving_party_name', type: 'text', label: 'Receiving Party Name', required: true },
      {
        key: 'receiving_party_address',
        type: 'text',
        label: 'Receiving Party Address',
        required: true,
      },
      {
        key: 'trade_secret_categories',
        type: 'textarea',
        label: 'Trade Secret Categories',
        required: true,
      },
      { key: 'permitted_purpose', type: 'text', label: 'Permitted Purpose', required: true },
      { key: 'term_years', type: 'number', label: 'Term (Years)', required: true },
      {
        key: 'governing_jurisdiction',
        type: 'text',
        label: 'Governing Jurisdiction',
        required: true,
      },
    ],
    signatureFields: [
      {
        id: 'disclosing_party_signature',
        label: 'Disclosing Party Signature',
        required: true,
        position: { page: 1, x: 100, y: 700 },
      },
      {
        id: 'receiving_party_signature',
        label: 'Receiving Party Signature',
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
];
