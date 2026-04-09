/**
 * Sales & CRM Project Templates
 * Pre-built templates for sales pipelines, CRM, lead management, and customer relationships
 */

export const SALES_TEMPLATES = [
  // ==================== 1. SALES PIPELINE ====================
  {
    name: 'Sales Pipeline',
    slug: 'sales-pipeline',
    description:
      'Track deals from prospecting to closing with a structured sales pipeline. Perfect for sales teams managing multiple opportunities.',
    category: 'sales',
    icon: 'TrendingUp',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'prospecting', name: 'Prospecting', order: 0, color: '#6B7280' },
      { id: 'qualification', name: 'Qualification', order: 1, color: '#3B82F6' },
      { id: 'proposal', name: 'Proposal', order: 2, color: '#F59E0B' },
      { id: 'negotiation', name: 'Negotiation', order: 3, color: '#8B5CF6' },
      { id: 'closed_won', name: 'Closed Won', order: 4, color: '#10B981' },
      { id: 'closed_lost', name: 'Closed Lost', order: 5, color: '#EF4444' },
    ],
    customFields: [
      {
        name: 'Deal Value',
        type: 'number',
        description: 'Expected deal value',
        isRequired: true,
      },
      {
        name: 'Company',
        type: 'text',
        description: 'Company name',
        isRequired: true,
      },
      {
        name: 'Contact',
        type: 'text',
        description: 'Primary contact name',
        isRequired: false,
      },
      {
        name: 'Source',
        type: 'select',
        description: 'Lead source',
        options: ['Inbound', 'Outbound', 'Referral', 'Event', 'Partner', 'Website'],
        isRequired: false,
      },
      {
        name: 'Close Date',
        type: 'date',
        description: 'Expected close date',
        isRequired: true,
      },
      {
        name: 'Probability',
        type: 'select',
        description: 'Win probability',
        options: ['10%', '25%', '50%', '75%', '90%'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Pipeline Setup',
          description: 'Initial pipeline configuration tasks',
          tasks: [
            {
              title: 'Define qualification criteria',
              description: 'Set clear criteria for moving deals between stages.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup', 'process'],
              subtasks: [
                { title: 'Define MQL criteria' },
                { title: 'Define SQL criteria' },
                { title: 'Document stage requirements' },
              ],
            },
            {
              title: 'Set up deal stages',
              description: 'Configure pipeline stages based on your sales process.',
              assigneeRole: 'lead',
              dueOffset: 1,
              priority: 'high',
              labels: ['setup'],
            },
            {
              title: 'Create deal templates',
              description: 'Prepare templates for proposals and quotes.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'medium',
              labels: ['templates'],
            },
          ],
        },
        {
          name: 'Sample Deals',
          description: 'Example deals to track',
          tasks: [
            {
              title: '[Company Name] - Enterprise Deal',
              description: 'Track this deal through your pipeline stages.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'high',
              labels: ['enterprise', 'demo'],
              subtasks: [
                { title: 'Initial discovery call' },
                { title: 'Send company overview' },
                { title: 'Schedule product demo' },
                { title: 'Send proposal' },
                { title: 'Contract negotiation' },
              ],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 2. CRM CONTACT MANAGEMENT ====================
  {
    name: 'CRM Contact Management',
    slug: 'crm-contact-management',
    description:
      'Organize and manage all customer contacts, track interactions, and maintain relationship history. Essential for customer success teams.',
    category: 'sales',
    icon: 'Users',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'new_contact', name: 'New Contact', order: 0, color: '#6B7280' },
      { id: 'engaged', name: 'Engaged', order: 1, color: '#3B82F6' },
      { id: 'active_customer', name: 'Active Customer', order: 2, color: '#10B981' },
      { id: 'at_risk', name: 'At Risk', order: 3, color: '#F59E0B' },
      { id: 'churned', name: 'Churned', order: 4, color: '#EF4444' },
    ],
    customFields: [
      {
        name: 'Email',
        type: 'text',
        description: 'Contact email address',
        isRequired: true,
      },
      {
        name: 'Phone',
        type: 'text',
        description: 'Phone number',
        isRequired: false,
      },
      {
        name: 'Company',
        type: 'text',
        description: 'Company name',
        isRequired: false,
      },
      {
        name: 'Role',
        type: 'text',
        description: 'Job title/role',
        isRequired: false,
      },
      {
        name: 'Last Contact',
        type: 'date',
        description: 'Date of last interaction',
        isRequired: false,
      },
      {
        name: 'Contact Type',
        type: 'select',
        description: 'Type of contact',
        options: ['Prospect', 'Customer', 'Partner', 'Vendor', 'Influencer'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'CRM Setup',
          description: 'Configure your CRM system',
          tasks: [
            {
              title: 'Import existing contacts',
              description: 'Import contacts from existing systems or spreadsheets.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup', 'data'],
              subtasks: [
                { title: 'Export contacts from old system' },
                { title: 'Clean and dedupe data' },
                { title: 'Map fields to new structure' },
                { title: 'Import and verify' },
              ],
            },
            {
              title: 'Define contact segments',
              description: 'Create segments for better organization.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'medium',
              labels: ['setup', 'segmentation'],
            },
            {
              title: 'Set up contact workflows',
              description: 'Create automated workflows for contact management.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'medium',
              labels: ['automation'],
            },
          ],
        },
        {
          name: 'Ongoing Activities',
          description: 'Regular CRM maintenance tasks',
          tasks: [
            {
              title: 'Weekly contact review',
              description: 'Review and update contact information weekly.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'medium',
              labels: ['maintenance', 'recurring'],
            },
            {
              title: 'Follow up with at-risk contacts',
              description: 'Reach out to contacts showing signs of disengagement.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['retention'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'table',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 3. LEAD GENERATION ====================
  {
    name: 'Lead Generation Campaign',
    slug: 'lead-generation-campaign',
    description:
      'Plan and execute lead generation campaigns across multiple channels. Track leads from initial capture to qualification.',
    category: 'sales',
    icon: 'Target',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'active', name: 'Active', order: 1, color: '#3B82F6' },
      { id: 'captured', name: 'Leads Captured', order: 2, color: '#F59E0B' },
      { id: 'qualified', name: 'Qualified', order: 3, color: '#8B5CF6' },
      { id: 'converted', name: 'Converted', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Campaign Type',
        type: 'select',
        description: 'Type of lead gen campaign',
        options: ['Content Marketing', 'Paid Ads', 'Event', 'Webinar', 'Email', 'Social'],
        isRequired: true,
      },
      {
        name: 'Target Leads',
        type: 'number',
        description: 'Target number of leads',
        isRequired: true,
      },
      {
        name: 'Budget',
        type: 'number',
        description: 'Campaign budget',
        isRequired: false,
      },
      {
        name: 'Cost Per Lead',
        type: 'number',
        description: 'Target cost per lead',
        isRequired: false,
      },
      {
        name: 'Campaign Start',
        type: 'date',
        description: 'Campaign start date',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Campaign Planning',
          description: 'Plan your lead generation campaign',
          tasks: [
            {
              title: 'Define target audience',
              description: 'Create detailed buyer personas and targeting criteria.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'targeting'],
              subtasks: [
                { title: 'Create buyer personas' },
                { title: 'Define demographic criteria' },
                { title: 'Identify pain points' },
              ],
            },
            {
              title: 'Create lead magnet',
              description: 'Develop valuable content to attract leads.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content'],
              subtasks: [
                { title: 'Choose lead magnet format' },
                { title: 'Write/create content' },
                { title: 'Design visuals' },
                { title: 'Set up delivery mechanism' },
              ],
            },
            {
              title: 'Build landing page',
              description: 'Create a high-converting landing page.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['web', 'conversion'],
            },
            {
              title: 'Set up lead capture forms',
              description: 'Create forms and integrate with CRM.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['setup', 'integration'],
            },
          ],
        },
        {
          name: 'Campaign Execution',
          description: 'Launch and manage the campaign',
          tasks: [
            {
              title: 'Launch campaign',
              description: 'Go live with all campaign elements.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['launch'],
            },
            {
              title: 'Monitor performance daily',
              description: 'Track key metrics and adjust as needed.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'medium',
              labels: ['monitoring', 'recurring'],
            },
            {
              title: 'Lead scoring and qualification',
              description: 'Score and qualify incoming leads.',
              assigneeRole: 'member',
              dueOffset: 16,
              priority: 'high',
              labels: ['qualification'],
            },
          ],
        },
        {
          name: 'Analysis & Optimization',
          description: 'Review results and optimize',
          tasks: [
            {
              title: 'Weekly performance review',
              description: 'Analyze campaign performance and ROI.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'medium',
              labels: ['analysis', 'recurring'],
            },
            {
              title: 'A/B test optimization',
              description: 'Test and optimize campaign elements.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['optimization', 'testing'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 4. CUSTOMER ONBOARDING ====================
  {
    name: 'Customer Onboarding',
    slug: 'customer-onboarding-sales',
    description:
      'Structured onboarding process for new customers. Ensure successful implementation and adoption from day one.',
    category: 'sales',
    icon: 'UserPlus',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'kickoff', name: 'Kickoff', order: 0, color: '#6B7280' },
      { id: 'setup', name: 'Setup', order: 1, color: '#3B82F6' },
      { id: 'training', name: 'Training', order: 2, color: '#F59E0B' },
      { id: 'go_live', name: 'Go Live', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Customer Name',
        type: 'text',
        description: 'Customer/company name',
        isRequired: true,
      },
      {
        name: 'Plan Type',
        type: 'select',
        description: 'Subscription plan',
        options: ['Starter', 'Professional', 'Enterprise', 'Custom'],
        isRequired: true,
      },
      {
        name: 'Onboarding Manager',
        type: 'text',
        description: 'Assigned onboarding manager',
        isRequired: false,
      },
      {
        name: 'Start Date',
        type: 'date',
        description: 'Onboarding start date',
        isRequired: true,
      },
      {
        name: 'Target Go-Live',
        type: 'date',
        description: 'Target go-live date',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Week 1: Kickoff',
          description: 'Initial kickoff and discovery',
          tasks: [
            {
              title: 'Send welcome email',
              description: 'Send welcome email with onboarding overview.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['communication'],
            },
            {
              title: 'Schedule kickoff call',
              description: 'Schedule and conduct kickoff meeting.',
              assigneeRole: 'owner',
              dueOffset: 1,
              priority: 'high',
              labels: ['meeting'],
              subtasks: [
                { title: 'Send calendar invite' },
                { title: 'Prepare kickoff deck' },
                { title: 'Conduct kickoff call' },
                { title: 'Send meeting notes' },
              ],
            },
            {
              title: 'Gather requirements',
              description: 'Document customer requirements and use cases.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['discovery'],
            },
            {
              title: 'Create onboarding plan',
              description: 'Develop customized onboarding timeline.',
              assigneeRole: 'owner',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning'],
            },
          ],
        },
        {
          name: 'Week 2-3: Setup & Configuration',
          description: 'Technical setup and configuration',
          tasks: [
            {
              title: 'Account setup',
              description: 'Configure customer account and settings.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['setup'],
              subtasks: [
                { title: 'Create user accounts' },
                { title: 'Configure permissions' },
                { title: 'Set up integrations' },
              ],
            },
            {
              title: 'Data migration',
              description: 'Migrate customer data from existing systems.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['data', 'migration'],
            },
            {
              title: 'Custom configuration',
              description: 'Configure custom settings per requirements.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'medium',
              labels: ['configuration'],
            },
          ],
        },
        {
          name: 'Week 3-4: Training',
          description: 'User training and enablement',
          tasks: [
            {
              title: 'Admin training session',
              description: 'Train customer admins on system management.',
              assigneeRole: 'owner',
              dueOffset: 17,
              priority: 'high',
              labels: ['training'],
            },
            {
              title: 'End user training',
              description: 'Train end users on daily operations.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'high',
              labels: ['training'],
            },
            {
              title: 'Provide documentation',
              description: 'Share relevant guides and documentation.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['documentation'],
            },
          ],
        },
        {
          name: 'Go Live & Handoff',
          description: 'Launch and transition to support',
          tasks: [
            {
              title: 'Go-live readiness check',
              description: 'Verify all systems are ready for launch.',
              assigneeRole: 'lead',
              dueOffset: 25,
              priority: 'high',
              labels: ['review'],
            },
            {
              title: 'Go live',
              description: 'Launch customer into production.',
              assigneeRole: 'owner',
              dueOffset: 28,
              priority: 'high',
              labels: ['launch'],
            },
            {
              title: 'Handoff to customer success',
              description: 'Transition customer to ongoing support team.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'high',
              labels: ['handoff'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: true,
      enableStoryPoints: false,
    },
  },

  // ==================== 5. ACCOUNT MANAGEMENT ====================
  {
    name: 'Account Management',
    slug: 'account-management',
    description:
      'Manage key accounts with structured touchpoints, health tracking, and renewal planning. Perfect for customer success teams.',
    category: 'sales',
    icon: 'Briefcase',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'healthy', name: 'Healthy', order: 0, color: '#10B981' },
      { id: 'needs_attention', name: 'Needs Attention', order: 1, color: '#F59E0B' },
      { id: 'at_risk', name: 'At Risk', order: 2, color: '#EF4444' },
      { id: 'renewal_upcoming', name: 'Renewal Upcoming', order: 3, color: '#8B5CF6' },
      { id: 'renewed', name: 'Renewed', order: 4, color: '#3B82F6' },
    ],
    customFields: [
      {
        name: 'Account Name',
        type: 'text',
        description: 'Customer account name',
        isRequired: true,
      },
      {
        name: 'ARR',
        type: 'number',
        description: 'Annual recurring revenue',
        isRequired: true,
      },
      {
        name: 'Renewal Date',
        type: 'date',
        description: 'Contract renewal date',
        isRequired: true,
      },
      {
        name: 'Health Score',
        type: 'select',
        description: 'Account health score',
        options: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'],
        isRequired: true,
      },
      {
        name: 'CSM',
        type: 'text',
        description: 'Customer Success Manager',
        isRequired: false,
      },
      {
        name: 'Last QBR',
        type: 'date',
        description: 'Last quarterly business review date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Regular Touchpoints',
          description: 'Scheduled customer interactions',
          tasks: [
            {
              title: 'Monthly check-in call',
              description: 'Regular touchpoint to assess satisfaction and needs.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'medium',
              labels: ['meeting', 'recurring'],
            },
            {
              title: 'Quarterly business review',
              description: 'Strategic review of account performance and goals.',
              assigneeRole: 'owner',
              dueOffset: 90,
              priority: 'high',
              labels: ['qbr', 'strategy'],
              subtasks: [
                { title: 'Prepare QBR deck' },
                { title: 'Gather usage metrics' },
                { title: 'Identify expansion opportunities' },
                { title: 'Conduct QBR meeting' },
              ],
            },
          ],
        },
        {
          name: 'Health Monitoring',
          description: 'Track and improve account health',
          tasks: [
            {
              title: 'Review usage metrics',
              description: 'Analyze product usage and engagement.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'medium',
              labels: ['analysis', 'recurring'],
            },
            {
              title: 'Update health score',
              description: 'Calculate and update account health score.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'medium',
              labels: ['health', 'recurring'],
            },
            {
              title: 'Address at-risk indicators',
              description: 'Take action on any red flags identified.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['risk', 'action'],
            },
          ],
        },
        {
          name: 'Renewal Management',
          description: 'Prepare for contract renewal',
          tasks: [
            {
              title: 'Renewal kickoff (90 days out)',
              description: 'Begin renewal process and planning.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['renewal'],
            },
            {
              title: 'Send renewal proposal',
              description: 'Prepare and send renewal proposal.',
              assigneeRole: 'owner',
              dueOffset: 60,
              priority: 'high',
              labels: ['renewal', 'proposal'],
            },
            {
              title: 'Negotiation and close',
              description: 'Complete renewal negotiation.',
              assigneeRole: 'lead',
              dueOffset: 80,
              priority: 'high',
              labels: ['renewal', 'negotiation'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'table',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 6. SALES PROPOSAL ====================
  {
    name: 'Sales Proposal Process',
    slug: 'sales-proposal-process',
    description:
      'Streamline proposal creation from discovery to delivery. Ensure consistent, high-quality proposals for every opportunity.',
    category: 'sales',
    icon: 'FileText',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'discovery', name: 'Discovery', order: 0, color: '#6B7280' },
      { id: 'drafting', name: 'Drafting', order: 1, color: '#3B82F6' },
      { id: 'internal_review', name: 'Internal Review', order: 2, color: '#F59E0B' },
      { id: 'sent', name: 'Sent to Client', order: 3, color: '#8B5CF6' },
      { id: 'accepted', name: 'Accepted', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Deal Name',
        type: 'text',
        description: 'Name of the opportunity',
        isRequired: true,
      },
      {
        name: 'Proposal Value',
        type: 'number',
        description: 'Total proposal value',
        isRequired: true,
      },
      {
        name: 'Due Date',
        type: 'date',
        description: 'Proposal due date',
        isRequired: true,
      },
      {
        name: 'Proposal Type',
        type: 'select',
        description: 'Type of proposal',
        options: ['Standard', 'Custom', 'Enterprise', 'RFP Response'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Discovery & Planning',
          description: 'Gather requirements for the proposal',
          tasks: [
            {
              title: 'Discovery call',
              description: 'Conduct discovery to understand client needs.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['discovery', 'meeting'],
            },
            {
              title: 'Document requirements',
              description: 'Capture all client requirements and constraints.',
              assigneeRole: 'owner',
              dueOffset: 1,
              priority: 'high',
              labels: ['documentation'],
            },
            {
              title: 'Scope the solution',
              description: 'Define the proposed solution scope.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'high',
              labels: ['scoping'],
            },
          ],
        },
        {
          name: 'Proposal Creation',
          description: 'Draft the proposal document',
          tasks: [
            {
              title: 'Create proposal outline',
              description: 'Structure the proposal document.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'medium',
              labels: ['writing'],
            },
            {
              title: 'Write executive summary',
              description: 'Draft compelling executive summary.',
              assigneeRole: 'owner',
              dueOffset: 4,
              priority: 'high',
              labels: ['writing'],
            },
            {
              title: 'Detail solution approach',
              description: 'Write detailed solution description.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['writing'],
            },
            {
              title: 'Create pricing section',
              description: 'Develop pricing and terms.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['pricing'],
            },
          ],
        },
        {
          name: 'Review & Delivery',
          description: 'Review and send the proposal',
          tasks: [
            {
              title: 'Internal review',
              description: 'Get proposal reviewed by stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 6,
              priority: 'high',
              labels: ['review'],
            },
            {
              title: 'Final revisions',
              description: 'Make final edits based on feedback.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'medium',
              labels: ['revision'],
            },
            {
              title: 'Send proposal',
              description: 'Deliver proposal to client.',
              assigneeRole: 'owner',
              dueOffset: 8,
              priority: 'high',
              labels: ['delivery'],
            },
            {
              title: 'Follow up',
              description: 'Schedule follow-up to discuss proposal.',
              assigneeRole: 'owner',
              dueOffset: 10,
              priority: 'high',
              labels: ['follow-up'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: true,
      enableStoryPoints: false,
    },
  },

  // ==================== 7. PARTNER PROGRAM ====================
  {
    name: 'Partner Program Management',
    slug: 'partner-program-management',
    description:
      'Manage partner relationships, track performance, and coordinate joint activities. Ideal for partnership and channel teams.',
    category: 'sales',
    icon: 'Handshake',
    color: '#14B8A6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'prospecting', name: 'Prospecting', order: 0, color: '#6B7280' },
      { id: 'onboarding', name: 'Onboarding', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#10B981' },
      { id: 'top_performer', name: 'Top Performer', order: 3, color: '#F59E0B' },
      { id: 'inactive', name: 'Inactive', order: 4, color: '#EF4444' },
    ],
    customFields: [
      {
        name: 'Partner Name',
        type: 'text',
        description: 'Partner company name',
        isRequired: true,
      },
      {
        name: 'Partner Type',
        type: 'select',
        description: 'Type of partnership',
        options: ['Reseller', 'Referral', 'Technology', 'Strategic', 'Affiliate'],
        isRequired: true,
      },
      {
        name: 'Partner Tier',
        type: 'select',
        description: 'Partnership tier level',
        options: ['Bronze', 'Silver', 'Gold', 'Platinum'],
        isRequired: false,
      },
      {
        name: 'Revenue Generated',
        type: 'number',
        description: 'Total revenue from partner',
        isRequired: false,
      },
      {
        name: 'Contract Start',
        type: 'date',
        description: 'Partnership start date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Partner Acquisition',
          description: 'Recruit new partners',
          tasks: [
            {
              title: 'Identify potential partners',
              description: 'Research and identify partnership opportunities.',
              assigneeRole: 'member',
              dueOffset: 0,
              priority: 'medium',
              labels: ['research'],
            },
            {
              title: 'Initial outreach',
              description: 'Reach out to potential partners.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['outreach'],
            },
            {
              title: 'Partnership proposal',
              description: 'Present partnership opportunity.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'high',
              labels: ['proposal'],
            },
          ],
        },
        {
          name: 'Partner Onboarding',
          description: 'Onboard new partners',
          tasks: [
            {
              title: 'Sign partnership agreement',
              description: 'Execute partnership contract.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['legal'],
            },
            {
              title: 'Partner portal access',
              description: 'Set up partner portal credentials.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['setup'],
            },
            {
              title: 'Partner training',
              description: 'Train partner on products and processes.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'high',
              labels: ['training'],
            },
          ],
        },
        {
          name: 'Ongoing Management',
          description: 'Manage active partnerships',
          tasks: [
            {
              title: 'Monthly partner review',
              description: 'Review partner performance monthly.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'medium',
              labels: ['review', 'recurring'],
            },
            {
              title: 'Quarterly business review',
              description: 'Strategic review with key partners.',
              assigneeRole: 'lead',
              dueOffset: 90,
              priority: 'high',
              labels: ['qbr', 'strategy'],
            },
            {
              title: 'Joint marketing activities',
              description: 'Plan and execute co-marketing.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'medium',
              labels: ['marketing'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'table',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 8. SALES PIPELINE MANAGEMENT ====================
  {
    name: 'Sales Pipeline Management',
    slug: 'sales-pipeline-management',
    description:
      'Comprehensive pipeline management system to track, analyze, and optimize your sales funnel from lead to close.',
    category: 'sales',
    icon: 'GitBranch',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'new_lead', name: 'New Lead', order: 0, color: '#6B7280' },
      { id: 'contacted', name: 'Contacted', order: 1, color: '#3B82F6' },
      { id: 'meeting_scheduled', name: 'Meeting Scheduled', order: 2, color: '#F59E0B' },
      { id: 'proposal_sent', name: 'Proposal Sent', order: 3, color: '#8B5CF6' },
      { id: 'negotiation', name: 'Negotiation', order: 4, color: '#EC4899' },
      { id: 'closed', name: 'Closed', order: 5, color: '#10B981' },
    ],
    customFields: [
      { name: 'Deal Size', type: 'number', description: 'Expected deal value', isRequired: true },
      { name: 'Lead Source', type: 'select', description: 'Origin of the lead', options: ['Website', 'Referral', 'Cold Call', 'Event', 'Social Media'], isRequired: true },
      { name: 'Decision Maker', type: 'text', description: 'Key decision maker name', isRequired: false },
      { name: 'Expected Close', type: 'date', description: 'Expected closing date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Pipeline Setup',
          description: 'Configure your pipeline stages and metrics',
          tasks: [
            { title: 'Define pipeline stages', description: 'Map out each stage of your sales process.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['setup'], subtasks: [{ title: 'Document entry criteria' }, { title: 'Define exit criteria' }, { title: 'Set stage probabilities' }] },
            { title: 'Set conversion targets', description: 'Establish conversion rate targets between stages.', assigneeRole: 'lead', dueOffset: 2, priority: 'high', labels: ['metrics'] },
            { title: 'Configure pipeline reports', description: 'Set up dashboards and reporting.', assigneeRole: 'member', dueOffset: 3, priority: 'medium', labels: ['reporting'] },
          ],
        },
        {
          name: 'Pipeline Hygiene',
          description: 'Maintain clean and accurate pipeline data',
          tasks: [
            { title: 'Weekly pipeline review', description: 'Review all deals and update stages.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['review', 'recurring'] },
            { title: 'Stale deal cleanup', description: 'Address deals with no activity in 30+ days.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['maintenance'] },
            { title: 'Data accuracy audit', description: 'Verify deal information is current and accurate.', assigneeRole: 'member', dueOffset: 30, priority: 'medium', labels: ['audit'] },
          ],
        },
        {
          name: 'Pipeline Analytics',
          description: 'Analyze pipeline performance',
          tasks: [
            { title: 'Calculate pipeline velocity', description: 'Measure average time deals spend in each stage.', assigneeRole: 'lead', dueOffset: 14, priority: 'medium', labels: ['analytics'] },
            { title: 'Identify bottlenecks', description: 'Find stages where deals are getting stuck.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['optimization'] },
            { title: 'Generate pipeline forecast', description: 'Create revenue forecast based on pipeline.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['forecasting'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 9. LEAD QUALIFICATION PROCESS ====================
  {
    name: 'Lead Qualification Process',
    slug: 'lead-qualification-process',
    description:
      'Systematic approach to qualifying leads using BANT, MEDDIC, or custom frameworks to focus on high-value opportunities.',
    category: 'sales',
    icon: 'Filter',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'unqualified', name: 'Unqualified', order: 0, color: '#6B7280' },
      { id: 'initial_contact', name: 'Initial Contact', order: 1, color: '#3B82F6' },
      { id: 'discovery', name: 'Discovery', order: 2, color: '#F59E0B' },
      { id: 'qualified', name: 'Qualified (SQL)', order: 3, color: '#10B981' },
      { id: 'disqualified', name: 'Disqualified', order: 4, color: '#EF4444' },
    ],
    customFields: [
      { name: 'Budget Confirmed', type: 'select', description: 'Budget availability', options: ['Yes', 'No', 'Unknown'], isRequired: true },
      { name: 'Authority Level', type: 'select', description: 'Decision-making authority', options: ['Decision Maker', 'Influencer', 'User', 'Unknown'], isRequired: true },
      { name: 'Need Identified', type: 'select', description: 'Clear need established', options: ['Yes', 'No', 'Partial'], isRequired: true },
      { name: 'Timeline', type: 'select', description: 'Purchase timeline', options: ['Immediate', '1-3 Months', '3-6 Months', '6+ Months', 'No Timeline'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Qualification Framework Setup',
          description: 'Establish your qualification methodology',
          tasks: [
            { title: 'Define qualification criteria', description: 'Document what makes a qualified lead.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['setup'], subtasks: [{ title: 'Define ideal customer profile' }, { title: 'Set minimum requirements' }, { title: 'Create scoring model' }] },
            { title: 'Create qualification questions', description: 'Develop discovery questions for each criterion.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['content'] },
            { title: 'Train team on framework', description: 'Ensure consistent application of qualification.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Lead Scoring',
          description: 'Score and prioritize incoming leads',
          tasks: [
            { title: 'Set up lead scoring model', description: 'Configure automated lead scoring rules.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['automation'] },
            { title: 'Define MQL threshold', description: 'Set score threshold for marketing qualified leads.', assigneeRole: 'lead', dueOffset: 6, priority: 'medium', labels: ['metrics'] },
            { title: 'Define SQL threshold', description: 'Set score threshold for sales qualified leads.', assigneeRole: 'lead', dueOffset: 6, priority: 'medium', labels: ['metrics'] },
          ],
        },
        {
          name: 'Qualification Execution',
          description: 'Execute qualification process',
          tasks: [
            { title: 'Initial lead assessment', description: 'Quick assessment of new leads.', assigneeRole: 'member', dueOffset: 1, priority: 'high', labels: ['process'] },
            { title: 'Discovery call', description: 'Conduct discovery to gather qualification data.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['meeting'] },
            { title: 'Document findings', description: 'Record qualification results and next steps.', assigneeRole: 'owner', dueOffset: 4, priority: 'medium', labels: ['documentation'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 10. PROSPECTING CAMPAIGN ====================
  {
    name: 'Prospecting Campaign',
    slug: 'prospecting-campaign',
    description:
      'Structured outbound prospecting campaign to identify and engage potential customers through multiple channels.',
    category: 'sales',
    icon: 'Search',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'outreach', name: 'Outreach', order: 1, color: '#3B82F6' },
      { id: 'follow_up', name: 'Follow Up', order: 2, color: '#F59E0B' },
      { id: 'engaged', name: 'Engaged', order: 3, color: '#8B5CF6' },
      { id: 'converted', name: 'Converted', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Industry', type: 'text', description: 'Target industry segment', isRequired: true },
      { name: 'Company Size', type: 'select', description: 'Target company size', options: ['1-10', '11-50', '51-200', '201-500', '500+'], isRequired: false },
      { name: 'Outreach Channel', type: 'select', description: 'Primary outreach method', options: ['Email', 'Phone', 'LinkedIn', 'Multi-channel'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Campaign Planning',
          description: 'Plan your prospecting campaign',
          tasks: [
            { title: 'Define target persona', description: 'Create detailed ideal prospect profile.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'], subtasks: [{ title: 'Define job titles' }, { title: 'Identify pain points' }, { title: 'Map buying triggers' }] },
            { title: 'Build prospect list', description: 'Compile list of target prospects.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['research'] },
            { title: 'Create outreach sequences', description: 'Design multi-touch outreach cadence.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['content'] },
          ],
        },
        {
          name: 'Outreach Execution',
          description: 'Execute prospecting activities',
          tasks: [
            { title: 'Launch email sequence', description: 'Start automated email outreach.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['execution'] },
            { title: 'Execute call blocks', description: 'Schedule and complete prospecting calls.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['calls'] },
            { title: 'LinkedIn engagement', description: 'Connect and engage on LinkedIn.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['social'] },
            { title: 'Track responses', description: 'Monitor and log prospect responses.', assigneeRole: 'member', dueOffset: 8, priority: 'medium', labels: ['tracking'] },
          ],
        },
        {
          name: 'Campaign Analysis',
          description: 'Analyze and optimize results',
          tasks: [
            { title: 'Weekly metrics review', description: 'Review open rates, response rates, and conversions.', assigneeRole: 'lead', dueOffset: 14, priority: 'medium', labels: ['analytics'] },
            { title: 'A/B test messaging', description: 'Test different subject lines and content.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['optimization'] },
            { title: 'Campaign retrospective', description: 'Review overall campaign performance.', assigneeRole: 'lead', dueOffset: 30, priority: 'medium', labels: ['review'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 11. COLD OUTREACH CAMPAIGN ====================
  {
    name: 'Cold Outreach Campaign',
    slug: 'cold-outreach-campaign',
    description:
      'Execute effective cold outreach campaigns with personalized messaging, follow-up sequences, and response tracking.',
    category: 'sales',
    icon: 'Mail',
    color: '#F43F5E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'list_building', name: 'List Building', order: 0, color: '#6B7280' },
      { id: 'personalization', name: 'Personalization', order: 1, color: '#3B82F6' },
      { id: 'sending', name: 'Sending', order: 2, color: '#F59E0B' },
      { id: 'replied', name: 'Replied', order: 3, color: '#8B5CF6' },
      { id: 'meeting_booked', name: 'Meeting Booked', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Email Template', type: 'text', description: 'Template name being used', isRequired: false },
      { name: 'Sequence Length', type: 'number', description: 'Number of touchpoints', isRequired: true },
      { name: 'Target Response Rate', type: 'number', description: 'Target response percentage', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Campaign Setup',
          description: 'Prepare cold outreach campaign',
          tasks: [
            { title: 'Research target accounts', description: 'Identify and research target companies.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'], subtasks: [{ title: 'Define target criteria' }, { title: 'Build account list' }, { title: 'Find contact information' }] },
            { title: 'Write email templates', description: 'Create personalized email templates.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['content'] },
            { title: 'Set up email sequences', description: 'Configure automated follow-up sequence.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['automation'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Run the outreach campaign',
          tasks: [
            { title: 'Personalize first batch', description: 'Add personalization to initial emails.', assigneeRole: 'member', dueOffset: 6, priority: 'high', labels: ['execution'] },
            { title: 'Launch sequence', description: 'Start the email sequence.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['launch'] },
            { title: 'Monitor deliverability', description: 'Check bounce rates and spam issues.', assigneeRole: 'member', dueOffset: 8, priority: 'medium', labels: ['monitoring'] },
            { title: 'Respond to replies', description: 'Handle incoming responses promptly.', assigneeRole: 'owner', dueOffset: 8, priority: 'high', labels: ['response'] },
          ],
        },
        {
          name: 'Optimization',
          description: 'Improve campaign performance',
          tasks: [
            { title: 'Analyze open rates', description: 'Review and optimize subject lines.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['analytics'] },
            { title: 'Test different CTAs', description: 'A/B test call-to-action variations.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['testing'] },
            { title: 'Refine targeting', description: 'Adjust target criteria based on results.', assigneeRole: 'lead', dueOffset: 21, priority: 'medium', labels: ['optimization'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 12. WARM LEAD FOLLOW-UP ====================
  {
    name: 'Warm Lead Follow-up',
    slug: 'warm-lead-follow-up',
    description:
      'Structured follow-up process for warm leads who have shown interest but not yet converted.',
    category: 'sales',
    icon: 'PhoneCall',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'new_warm_lead', name: 'New Warm Lead', order: 0, color: '#6B7280' },
      { id: 'first_follow_up', name: 'First Follow-up', order: 1, color: '#3B82F6' },
      { id: 'nurturing', name: 'Nurturing', order: 2, color: '#F59E0B' },
      { id: 'ready_to_buy', name: 'Ready to Buy', order: 3, color: '#8B5CF6' },
      { id: 'converted', name: 'Converted', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Lead Source', type: 'select', description: 'How the lead came in', options: ['Website Form', 'Content Download', 'Webinar', 'Demo Request', 'Referral'], isRequired: true },
      { name: 'Interest Level', type: 'select', description: 'Current interest level', options: ['High', 'Medium', 'Low'], isRequired: true },
      { name: 'Last Contact Date', type: 'date', description: 'Date of last interaction', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Initial Follow-up',
          description: 'First response to warm leads',
          tasks: [
            { title: 'Review lead information', description: 'Understand lead source and context.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] },
            { title: 'Send personalized follow-up', description: 'Reach out with relevant information.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['outreach'] },
            { title: 'Attempt phone connection', description: 'Call to establish personal connection.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['calls'] },
          ],
        },
        {
          name: 'Nurture Sequence',
          description: 'Keep leads engaged over time',
          tasks: [
            { title: 'Add to nurture campaign', description: 'Enroll in appropriate drip campaign.', assigneeRole: 'member', dueOffset: 3, priority: 'medium', labels: ['automation'] },
            { title: 'Share relevant content', description: 'Send helpful resources based on interest.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['content'] },
            { title: 'Schedule check-in', description: 'Set reminder for next personal touchpoint.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['follow-up'] },
          ],
        },
        {
          name: 'Conversion Push',
          description: 'Move ready leads to close',
          tasks: [
            { title: 'Identify buying signals', description: 'Look for indicators of purchase readiness.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['analysis'] },
            { title: 'Offer consultation', description: 'Invite to discovery call or demo.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['conversion'] },
            { title: 'Create urgency', description: 'Present time-sensitive offer if appropriate.', assigneeRole: 'lead', dueOffset: 21, priority: 'medium', labels: ['closing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 13. ENTERPRISE DEAL CYCLE ====================
  {
    name: 'Enterprise Deal Cycle',
    slug: 'enterprise-deal-cycle',
    description:
      'Manage complex enterprise sales cycles with multiple stakeholders, long timelines, and detailed requirements.',
    category: 'sales',
    icon: 'Building',
    color: '#1E40AF',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'discovery', name: 'Discovery', order: 0, color: '#6B7280' },
      { id: 'stakeholder_mapping', name: 'Stakeholder Mapping', order: 1, color: '#3B82F6' },
      { id: 'solution_design', name: 'Solution Design', order: 2, color: '#F59E0B' },
      { id: 'poc', name: 'POC/Pilot', order: 3, color: '#8B5CF6' },
      { id: 'procurement', name: 'Procurement', order: 4, color: '#EC4899' },
      { id: 'closed', name: 'Closed', order: 5, color: '#10B981' },
    ],
    customFields: [
      { name: 'Deal Value', type: 'number', description: 'Total contract value', isRequired: true },
      { name: 'Contract Length', type: 'select', description: 'Contract duration', options: ['1 Year', '2 Years', '3 Years', 'Multi-year'], isRequired: true },
      { name: 'Champion', type: 'text', description: 'Internal champion name', isRequired: false },
      { name: 'Economic Buyer', type: 'text', description: 'Final decision maker', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Discovery & Qualification',
          description: 'Understand enterprise requirements',
          tasks: [
            { title: 'Initial discovery meeting', description: 'Understand business challenges and goals.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['discovery'], subtasks: [{ title: 'Research company' }, { title: 'Prepare questions' }, { title: 'Conduct meeting' }, { title: 'Document findings' }] },
            { title: 'Stakeholder identification', description: 'Map all decision makers and influencers.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['stakeholders'] },
            { title: 'Technical discovery', description: 'Understand technical requirements and constraints.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['technical'] },
          ],
        },
        {
          name: 'Solution Development',
          description: 'Design and propose solution',
          tasks: [
            { title: 'Create solution architecture', description: 'Design custom solution for enterprise needs.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['solution'] },
            { title: 'Build business case', description: 'Develop ROI and business justification.', assigneeRole: 'owner', dueOffset: 28, priority: 'high', labels: ['business-case'] },
            { title: 'Executive presentation', description: 'Present solution to executive stakeholders.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['presentation'] },
            { title: 'Security review', description: 'Complete security questionnaire and review.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['security'] },
          ],
        },
        {
          name: 'POC & Validation',
          description: 'Prove solution value',
          tasks: [
            { title: 'Define POC scope', description: 'Agree on proof of concept parameters.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['poc'] },
            { title: 'Execute POC', description: 'Run proof of concept with customer.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['poc'] },
            { title: 'POC review meeting', description: 'Present POC results and recommendations.', assigneeRole: 'owner', dueOffset: 75, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Contract & Close',
          description: 'Navigate procurement and close',
          tasks: [
            { title: 'Submit proposal', description: 'Send formal enterprise proposal.', assigneeRole: 'owner', dueOffset: 80, priority: 'high', labels: ['proposal'] },
            { title: 'Legal review', description: 'Work through contract negotiations.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['legal'] },
            { title: 'Procurement process', description: 'Navigate procurement requirements.', assigneeRole: 'owner', dueOffset: 100, priority: 'high', labels: ['procurement'] },
            { title: 'Contract execution', description: 'Finalize and sign contract.', assigneeRole: 'lead', dueOffset: 110, priority: 'high', labels: ['closing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 14. SMB SALES PROCESS ====================
  {
    name: 'SMB Sales Process',
    slug: 'smb-sales-process',
    description:
      'Streamlined sales process for small and medium businesses with shorter sales cycles and faster decisions.',
    category: 'sales',
    icon: 'Store',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'inquiry', name: 'Inquiry', order: 0, color: '#6B7280' },
      { id: 'demo', name: 'Demo', order: 1, color: '#3B82F6' },
      { id: 'proposal', name: 'Proposal', order: 2, color: '#F59E0B' },
      { id: 'decision', name: 'Decision', order: 3, color: '#8B5CF6' },
      { id: 'won', name: 'Won', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Company Size', type: 'select', description: 'Employee count', options: ['1-10', '11-50', '51-200'], isRequired: true },
      { name: 'Monthly Budget', type: 'number', description: 'Available monthly budget', isRequired: false },
      { name: 'Decision Timeline', type: 'select', description: 'Expected decision date', options: ['This Week', 'This Month', 'This Quarter'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Initial Engagement',
          description: 'Quick qualification and demo',
          tasks: [
            { title: 'Qualify lead', description: 'Quick qualification call to assess fit.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['qualification'] },
            { title: 'Schedule demo', description: 'Book product demonstration.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['demo'] },
            { title: 'Conduct demo', description: 'Deliver focused product demonstration.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['demo'] },
          ],
        },
        {
          name: 'Proposal & Close',
          description: 'Move quickly to close',
          tasks: [
            { title: 'Send proposal', description: 'Deliver pricing and proposal.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['proposal'] },
            { title: 'Handle objections', description: 'Address questions and concerns.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['objections'] },
            { title: 'Close deal', description: 'Get commitment and process order.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['closing'] },
            { title: 'Process payment', description: 'Collect payment and activate account.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['payment'] },
          ],
        },
        {
          name: 'Quick Onboarding',
          description: 'Get customer started fast',
          tasks: [
            { title: 'Welcome email', description: 'Send welcome and getting started guide.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['onboarding'] },
            { title: 'Setup call', description: 'Quick setup and orientation call.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['onboarding'] },
            { title: 'Check-in', description: 'Follow up on initial experience.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['follow-up'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 15. STARTUP SALES PROCESS ====================
  {
    name: 'Startup Sales Process',
    slug: 'startup-sales-process',
    description:
      'Agile sales process designed for startup customers with unique needs, limited budgets, and growth potential.',
    category: 'sales',
    icon: 'Rocket',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'discovery', name: 'Discovery', order: 0, color: '#6B7280' },
      { id: 'trial', name: 'Trial', order: 1, color: '#3B82F6' },
      { id: 'evaluation', name: 'Evaluation', order: 2, color: '#F59E0B' },
      { id: 'negotiation', name: 'Negotiation', order: 3, color: '#8B5CF6' },
      { id: 'closed', name: 'Closed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Funding Stage', type: 'select', description: 'Startup funding stage', options: ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Bootstrapped'], isRequired: true },
      { name: 'Growth Rate', type: 'select', description: 'Company growth trajectory', options: ['Hyper-growth', 'Fast', 'Steady', 'Early Stage'], isRequired: false },
      { name: 'Team Size', type: 'number', description: 'Current team size', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Discovery',
          description: 'Understand startup needs',
          tasks: [
            { title: 'Initial call', description: 'Understand startup stage and challenges.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['discovery'] },
            { title: 'Assess growth potential', description: 'Evaluate long-term partnership potential.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['evaluation'] },
            { title: 'Identify use case', description: 'Define specific use case and success criteria.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Trial & Evaluation',
          description: 'Let startup experience the product',
          tasks: [
            { title: 'Set up trial', description: 'Configure trial environment.', assigneeRole: 'member', dueOffset: 4, priority: 'high', labels: ['trial'] },
            { title: 'Trial kickoff', description: 'Guide through initial setup and use.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['trial'] },
            { title: 'Mid-trial check-in', description: 'Assess progress and address issues.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['follow-up'] },
            { title: 'Trial review', description: 'Review results and discuss next steps.', assigneeRole: 'owner', dueOffset: 19, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Conversion',
          description: 'Convert trial to paid',
          tasks: [
            { title: 'Present startup pricing', description: 'Offer startup-friendly pricing options.', assigneeRole: 'owner', dueOffset: 20, priority: 'high', labels: ['pricing'] },
            { title: 'Address budget concerns', description: 'Work through budget constraints.', assigneeRole: 'owner', dueOffset: 22, priority: 'medium', labels: ['negotiation'] },
            { title: 'Close deal', description: 'Finalize agreement and onboard.', assigneeRole: 'owner', dueOffset: 25, priority: 'high', labels: ['closing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 16. INBOUND SALES PROCESS ====================
  {
    name: 'Inbound Sales Process',
    slug: 'inbound-sales-process',
    description:
      'Process for handling inbound leads from marketing channels, website, and content with rapid response.',
    category: 'sales',
    icon: 'Inbox',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'new_inquiry', name: 'New Inquiry', order: 0, color: '#6B7280' },
      { id: 'contacted', name: 'Contacted', order: 1, color: '#3B82F6' },
      { id: 'qualified', name: 'Qualified', order: 2, color: '#F59E0B' },
      { id: 'opportunity', name: 'Opportunity', order: 3, color: '#8B5CF6' },
      { id: 'won', name: 'Won', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Lead Source', type: 'select', description: 'How lead found us', options: ['Organic Search', 'Paid Ads', 'Social Media', 'Referral', 'Content', 'Event'], isRequired: true },
      { name: 'Content Downloaded', type: 'text', description: 'Lead magnet or content', isRequired: false },
      { name: 'Response Time', type: 'number', description: 'Minutes to first response', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Rapid Response',
          description: 'Respond quickly to inbound leads',
          tasks: [
            { title: 'Review lead details', description: 'Check lead source and information submitted.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['triage'] },
            { title: 'First response', description: 'Respond within 5 minutes during business hours.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['response'] },
            { title: 'Schedule conversation', description: 'Book discovery call or demo.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['scheduling'] },
          ],
        },
        {
          name: 'Discovery',
          description: 'Understand needs and qualify',
          tasks: [
            { title: 'Discovery call', description: 'Conduct needs assessment.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['discovery'] },
            { title: 'Document requirements', description: 'Record needs and next steps.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['documentation'] },
            { title: 'Qualify opportunity', description: 'Determine if qualified opportunity.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['qualification'] },
          ],
        },
        {
          name: 'Conversion',
          description: 'Move to close',
          tasks: [
            { title: 'Demo or presentation', description: 'Show relevant solution.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['demo'] },
            { title: 'Send proposal', description: 'Deliver customized proposal.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['proposal'] },
            { title: 'Follow up and close', description: 'Address questions and close.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['closing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 17. OUTBOUND SALES PROCESS ====================
  {
    name: 'Outbound Sales Process',
    slug: 'outbound-sales-process',
    description:
      'Systematic outbound sales methodology for proactive prospecting and deal creation.',
    category: 'sales',
    icon: 'Send',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'targeting', name: 'Targeting', order: 0, color: '#6B7280' },
      { id: 'outreach', name: 'Outreach', order: 1, color: '#3B82F6' },
      { id: 'connected', name: 'Connected', order: 2, color: '#F59E0B' },
      { id: 'meeting_set', name: 'Meeting Set', order: 3, color: '#8B5CF6' },
      { id: 'opportunity', name: 'Opportunity', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Account', type: 'text', description: 'Target company name', isRequired: true },
      { name: 'Outreach Method', type: 'select', description: 'Primary contact method', options: ['Email', 'Phone', 'LinkedIn', 'Multi-touch'], isRequired: true },
      { name: 'Touches', type: 'number', description: 'Number of outreach attempts', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Account Research',
          description: 'Research and prepare',
          tasks: [
            { title: 'Research target account', description: 'Gather company and contact intelligence.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'], subtasks: [{ title: 'Company background' }, { title: 'Recent news/triggers' }, { title: 'Key contacts' }] },
            { title: 'Identify entry points', description: 'Find best contacts and approach angles.', assigneeRole: 'member', dueOffset: 1, priority: 'high', labels: ['planning'] },
            { title: 'Craft personalized message', description: 'Create compelling outreach.', assigneeRole: 'member', dueOffset: 2, priority: 'high', labels: ['content'] },
          ],
        },
        {
          name: 'Outreach Execution',
          description: 'Execute multi-touch outreach',
          tasks: [
            { title: 'Send initial email', description: 'First personalized email.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['email'] },
            { title: 'LinkedIn connection', description: 'Connect on LinkedIn with note.', assigneeRole: 'owner', dueOffset: 4, priority: 'medium', labels: ['social'] },
            { title: 'First call attempt', description: 'Phone call to prospect.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['phone'] },
            { title: 'Follow-up sequence', description: 'Continue multi-touch sequence.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['follow-up'] },
          ],
        },
        {
          name: 'Opportunity Creation',
          description: 'Convert to opportunity',
          tasks: [
            { title: 'Discovery meeting', description: 'Conduct initial meeting.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['meeting'] },
            { title: 'Qualify opportunity', description: 'Determine deal viability.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['qualification'] },
            { title: 'Create opportunity', description: 'Add to pipeline.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['pipeline'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 18. CHANNEL SALES PROGRAM ====================
  {
    name: 'Channel Sales Program',
    slug: 'channel-sales-program',
    description:
      'Build and manage a channel sales program with partners, resellers, and distributors.',
    category: 'sales',
    icon: 'Network',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'program_design', name: 'Program Design', order: 0, color: '#6B7280' },
      { id: 'recruitment', name: 'Recruitment', order: 1, color: '#3B82F6' },
      { id: 'onboarding', name: 'Onboarding', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
      { id: 'review', name: 'Review', order: 4, color: '#8B5CF6' },
    ],
    customFields: [
      { name: 'Channel Type', type: 'select', description: 'Type of channel partner', options: ['Reseller', 'VAR', 'Distributor', 'MSP', 'SI', 'ISV'], isRequired: true },
      { name: 'Revenue Target', type: 'number', description: 'Annual revenue target', isRequired: false },
      { name: 'Commission Rate', type: 'number', description: 'Partner commission percentage', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Program Development',
          description: 'Design the channel program',
          tasks: [
            { title: 'Define program structure', description: 'Create partner tiers and benefits.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'], subtasks: [{ title: 'Define partner tiers' }, { title: 'Set commission structure' }, { title: 'Create partner benefits' }] },
            { title: 'Create partner materials', description: 'Develop sales and marketing resources.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content'] },
            { title: 'Build partner portal', description: 'Set up partner management system.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['technology'] },
          ],
        },
        {
          name: 'Partner Recruitment',
          description: 'Recruit channel partners',
          tasks: [
            { title: 'Identify target partners', description: 'Research potential partners.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['research'] },
            { title: 'Partner outreach', description: 'Reach out to potential partners.', assigneeRole: 'owner', dueOffset: 35, priority: 'high', labels: ['outreach'] },
            { title: 'Partner evaluation', description: 'Assess partner fit and capability.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['evaluation'] },
            { title: 'Contract negotiation', description: 'Finalize partner agreements.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['legal'] },
          ],
        },
        {
          name: 'Partner Enablement',
          description: 'Enable partners for success',
          tasks: [
            { title: 'Partner training', description: 'Train partners on products and sales.', assigneeRole: 'owner', dueOffset: 56, priority: 'high', labels: ['training'] },
            { title: 'Certification program', description: 'Certify partner sales teams.', assigneeRole: 'member', dueOffset: 70, priority: 'medium', labels: ['certification'] },
            { title: 'Launch support', description: 'Support partners in first deals.', assigneeRole: 'owner', dueOffset: 84, priority: 'high', labels: ['support'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 19. PARTNER SALES ENABLEMENT ====================
  {
    name: 'Partner Sales Enablement',
    slug: 'partner-sales-enablement',
    description:
      'Enable channel partners with training, tools, and resources to effectively sell your products.',
    category: 'sales',
    icon: 'GraduationCap',
    color: '#0D9488',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'content_creation', name: 'Content Creation', order: 1, color: '#3B82F6' },
      { id: 'training', name: 'Training', order: 2, color: '#F59E0B' },
      { id: 'certification', name: 'Certification', order: 3, color: '#8B5CF6' },
      { id: 'active', name: 'Active', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Partner Name', type: 'text', description: 'Partner company', isRequired: true },
      { name: 'Enablement Level', type: 'select', description: 'Training level', options: ['Basic', 'Advanced', 'Expert'], isRequired: true },
      { name: 'Certification Status', type: 'select', description: 'Certification progress', options: ['Not Started', 'In Progress', 'Certified'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Enablement Planning',
          description: 'Plan partner enablement',
          tasks: [
            { title: 'Assess partner needs', description: 'Identify knowledge gaps and priorities.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Create enablement plan', description: 'Design customized training path.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['planning'] },
            { title: 'Schedule training sessions', description: 'Book training calendar.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['scheduling'] },
          ],
        },
        {
          name: 'Training Delivery',
          description: 'Deliver partner training',
          tasks: [
            { title: 'Product training', description: 'Train on product features and benefits.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['training'] },
            { title: 'Sales methodology training', description: 'Train on sales process and techniques.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['training'] },
            { title: 'Demo training', description: 'Train on product demonstrations.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['training'] },
            { title: 'Objection handling', description: 'Train on common objections.', assigneeRole: 'owner', dueOffset: 28, priority: 'medium', labels: ['training'] },
          ],
        },
        {
          name: 'Certification',
          description: 'Certify partner teams',
          tasks: [
            { title: 'Knowledge assessment', description: 'Test product and sales knowledge.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['assessment'] },
            { title: 'Role play evaluation', description: 'Evaluate sales role plays.', assigneeRole: 'owner', dueOffset: 42, priority: 'high', labels: ['evaluation'] },
            { title: 'Issue certifications', description: 'Award partner certifications.', assigneeRole: 'lead', dueOffset: 45, priority: 'medium', labels: ['certification'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 20. RESELLER PROGRAM ====================
  {
    name: 'Reseller Program',
    slug: 'reseller-program',
    description:
      'Establish and manage a reseller program with authorized partners who sell your products.',
    category: 'sales',
    icon: 'ShoppingBag',
    color: '#EA580C',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'application', name: 'Application', order: 0, color: '#6B7280' },
      { id: 'review', name: 'Review', order: 1, color: '#3B82F6' },
      { id: 'approved', name: 'Approved', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
      { id: 'inactive', name: 'Inactive', order: 4, color: '#EF4444' },
    ],
    customFields: [
      { name: 'Reseller Tier', type: 'select', description: 'Partner tier level', options: ['Authorized', 'Silver', 'Gold', 'Platinum'], isRequired: true },
      { name: 'Territory', type: 'text', description: 'Sales territory', isRequired: false },
      { name: 'Quarterly Target', type: 'number', description: 'Quarterly sales target', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Reseller Application',
          description: 'Process new reseller applications',
          tasks: [
            { title: 'Review application', description: 'Evaluate reseller application.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['review'] },
            { title: 'Background check', description: 'Verify business credentials.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['verification'] },
            { title: 'Interview applicant', description: 'Conduct partner interview.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['interview'] },
            { title: 'Approve or reject', description: 'Make final decision.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['decision'] },
          ],
        },
        {
          name: 'Reseller Onboarding',
          description: 'Onboard approved resellers',
          tasks: [
            { title: 'Send welcome kit', description: 'Provide onboarding materials.', assigneeRole: 'member', dueOffset: 11, priority: 'high', labels: ['onboarding'] },
            { title: 'Portal setup', description: 'Create reseller portal access.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['setup'] },
            { title: 'Initial training', description: 'Conduct product training.', assigneeRole: 'owner', dueOffset: 17, priority: 'high', labels: ['training'] },
            { title: 'First order support', description: 'Support first customer orders.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['support'] },
          ],
        },
        {
          name: 'Ongoing Management',
          description: 'Manage active resellers',
          tasks: [
            { title: 'Monthly performance review', description: 'Review sales performance.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['review'] },
            { title: 'Quarterly business planning', description: 'Plan upcoming quarter targets.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['planning'] },
            { title: 'Annual program review', description: 'Comprehensive partnership review.', assigneeRole: 'lead', dueOffset: 365, priority: 'high', labels: ['review'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'table', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 21. DISTRIBUTOR MANAGEMENT ====================
  {
    name: 'Distributor Management',
    slug: 'distributor-management',
    description:
      'Manage distributor relationships including inventory, pricing, and market coverage.',
    category: 'sales',
    icon: 'Truck',
    color: '#4338CA',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'prospecting', name: 'Prospecting', order: 0, color: '#6B7280' },
      { id: 'negotiation', name: 'Negotiation', order: 1, color: '#3B82F6' },
      { id: 'contracted', name: 'Contracted', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
      { id: 'review', name: 'Under Review', order: 4, color: '#8B5CF6' },
    ],
    customFields: [
      { name: 'Region', type: 'text', description: 'Distribution region', isRequired: true },
      { name: 'Annual Volume', type: 'number', description: 'Expected annual units', isRequired: false },
      { name: 'Exclusivity', type: 'select', description: 'Exclusivity status', options: ['Exclusive', 'Non-Exclusive', 'Preferred'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Distributor Selection',
          description: 'Identify and select distributors',
          tasks: [
            { title: 'Market analysis', description: 'Analyze distribution needs by region.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['research'] },
            { title: 'Identify candidates', description: 'Research potential distributors.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['research'] },
            { title: 'Initial meetings', description: 'Meet with potential distributors.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['meeting'] },
            { title: 'Due diligence', description: 'Verify distributor capabilities.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['verification'] },
          ],
        },
        {
          name: 'Contract Setup',
          description: 'Negotiate and finalize agreements',
          tasks: [
            { title: 'Negotiate terms', description: 'Negotiate pricing and terms.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['negotiation'] },
            { title: 'Legal review', description: 'Review distribution agreement.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['legal'] },
            { title: 'Execute contract', description: 'Sign distribution agreement.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['contract'] },
          ],
        },
        {
          name: 'Operational Setup',
          description: 'Set up operations',
          tasks: [
            { title: 'System integration', description: 'Connect ordering systems.', assigneeRole: 'member', dueOffset: 49, priority: 'high', labels: ['technology'] },
            { title: 'Inventory planning', description: 'Plan initial inventory levels.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['inventory'] },
            { title: 'Launch partnership', description: 'Official partnership launch.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['launch'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'table', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 22. SALES TERRITORY PLANNING ====================
  {
    name: 'Sales Territory Planning',
    slug: 'sales-territory-planning',
    description:
      'Plan and optimize sales territories for maximum coverage and efficiency.',
    category: 'sales',
    icon: 'Map',
    color: '#0F766E',
    projectType: 'list',
    isFeatured: false,
    kanbanStages: [
      { id: 'analysis', name: 'Analysis', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'implementation', name: 'Implementation', order: 3, color: '#8B5CF6' },
      { id: 'monitoring', name: 'Monitoring', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Territory Name', type: 'text', description: 'Territory identifier', isRequired: true },
      { name: 'Assigned Rep', type: 'text', description: 'Sales representative', isRequired: false },
      { name: 'Account Count', type: 'number', description: 'Number of accounts', isRequired: false },
      { name: 'Revenue Potential', type: 'number', description: 'Territory revenue potential', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Territory Analysis',
          description: 'Analyze current state',
          tasks: [
            { title: 'Map current territories', description: 'Document existing territory structure.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['analysis'] },
            { title: 'Analyze account distribution', description: 'Review account distribution and potential.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['analysis'] },
            { title: 'Identify coverage gaps', description: 'Find underserved areas.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['analysis'] },
            { title: 'Review rep performance by territory', description: 'Analyze performance data.', assigneeRole: 'lead', dueOffset: 7, priority: 'medium', labels: ['analysis'] },
          ],
        },
        {
          name: 'Territory Design',
          description: 'Design optimal territories',
          tasks: [
            { title: 'Define territory criteria', description: 'Set criteria for territory boundaries.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['planning'] },
            { title: 'Create territory proposals', description: 'Design new territory structure.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['design'] },
            { title: 'Calculate quotas', description: 'Set territory quotas based on potential.', assigneeRole: 'lead', dueOffset: 17, priority: 'high', labels: ['quotas'] },
            { title: 'Review with leadership', description: 'Present and refine proposals.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Roll out new territories',
          tasks: [
            { title: 'Communicate changes', description: 'Announce territory changes to team.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['communication'] },
            { title: 'Update CRM', description: 'Implement changes in systems.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['systems'] },
            { title: 'Account transition', description: 'Transition accounts between reps.', assigneeRole: 'owner', dueOffset: 35, priority: 'high', labels: ['transition'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'table', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 23. ACCOUNT PLANNING ====================
  {
    name: 'Account Planning',
    slug: 'account-planning',
    description:
      'Strategic planning for key accounts to maximize growth and retention opportunities.',
    category: 'sales',
    icon: 'ClipboardList',
    color: '#B45309',
    projectType: 'list',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'strategy', name: 'Strategy Development', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'review', name: 'Review', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Account Name', type: 'text', description: 'Account/company name', isRequired: true },
      { name: 'Current ARR', type: 'number', description: 'Current annual revenue', isRequired: true },
      { name: 'Growth Target', type: 'number', description: 'Revenue growth target', isRequired: false },
      { name: 'Account Tier', type: 'select', description: 'Account priority', options: ['Tier 1', 'Tier 2', 'Tier 3'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Account Research',
          description: 'Deep dive into account',
          tasks: [
            { title: 'Company research', description: 'Research company strategy and priorities.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['research'], subtasks: [{ title: 'Review financials' }, { title: 'Identify initiatives' }, { title: 'Map organization' }] },
            { title: 'Stakeholder mapping', description: 'Identify and map all stakeholders.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['stakeholders'] },
            { title: 'Competitive analysis', description: 'Understand competitive landscape.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['competitive'] },
          ],
        },
        {
          name: 'Strategy Development',
          description: 'Create account strategy',
          tasks: [
            { title: 'Identify opportunities', description: 'Find expansion and upsell opportunities.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['opportunities'] },
            { title: 'Define objectives', description: 'Set specific account objectives.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['planning'] },
            { title: 'Create action plan', description: 'Develop detailed action plan.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['planning'] },
            { title: 'Review with manager', description: 'Get alignment on account strategy.', assigneeRole: 'lead', dueOffset: 17, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Execution Tracking',
          description: 'Execute and track progress',
          tasks: [
            { title: 'Schedule strategic meetings', description: 'Book meetings with key stakeholders.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['meetings'] },
            { title: 'Execute initiatives', description: 'Work through action plan.', assigneeRole: 'owner', dueOffset: 28, priority: 'high', labels: ['execution'] },
            { title: 'Monthly progress review', description: 'Review progress against plan.', assigneeRole: 'lead', dueOffset: 30, priority: 'medium', labels: ['review'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'list', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 24. KEY ACCOUNT MANAGEMENT ====================
  {
    name: 'Key Account Management',
    slug: 'key-account-management',
    description:
      'Dedicated management framework for your most strategic and valuable accounts.',
    category: 'sales',
    icon: 'Star',
    color: '#D97706',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'healthy', name: 'Healthy', order: 0, color: '#10B981' },
      { id: 'growth', name: 'Growth Focus', order: 1, color: '#3B82F6' },
      { id: 'at_risk', name: 'At Risk', order: 2, color: '#F59E0B' },
      { id: 'critical', name: 'Critical', order: 3, color: '#EF4444' },
    ],
    customFields: [
      { name: 'Account Executive', type: 'text', description: 'Assigned AE', isRequired: true },
      { name: 'Executive Sponsor', type: 'text', description: 'Internal executive sponsor', isRequired: false },
      { name: 'Contract Value', type: 'number', description: 'Total contract value', isRequired: true },
      { name: 'NPS Score', type: 'number', description: 'Net promoter score', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Relationship Building',
          description: 'Build executive relationships',
          tasks: [
            { title: 'Executive mapping', description: 'Map C-suite and key executives.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['relationships'] },
            { title: 'Executive sponsorship', description: 'Assign internal executive sponsor.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['sponsorship'] },
            { title: 'Executive business review', description: 'Schedule EBR meeting.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['meeting'] },
            { title: 'Relationship health check', description: 'Assess relationship strength.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['assessment'] },
          ],
        },
        {
          name: 'Value Delivery',
          description: 'Ensure continuous value',
          tasks: [
            { title: 'Value assessment', description: 'Measure value delivered to date.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['value'] },
            { title: 'Success metrics review', description: 'Review KPIs and outcomes.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['metrics'] },
            { title: 'Create case study', description: 'Document success for reference.', assigneeRole: 'member', dueOffset: 45, priority: 'medium', labels: ['marketing'] },
          ],
        },
        {
          name: 'Growth Planning',
          description: 'Identify and pursue growth',
          tasks: [
            { title: 'Whitespace analysis', description: 'Identify additional opportunities.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['analysis'] },
            { title: 'Create expansion proposal', description: 'Develop growth proposal.', assigneeRole: 'owner', dueOffset: 35, priority: 'high', labels: ['proposal'] },
            { title: 'Cross-sell initiatives', description: 'Pursue additional products/services.', assigneeRole: 'owner', dueOffset: 42, priority: 'medium', labels: ['cross-sell'] },
            { title: 'Multi-year planning', description: 'Develop long-term account vision.', assigneeRole: 'lead', dueOffset: 60, priority: 'medium', labels: ['strategy'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 25. STRATEGIC ACCOUNT REVIEW ====================
  {
    name: 'Strategic Account Review',
    slug: 'strategic-account-review',
    description:
      'Comprehensive review process for strategic accounts to assess health, opportunities, and risks.',
    category: 'sales',
    icon: 'BarChart',
    color: '#9333EA',
    projectType: 'list',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' },
      { id: 'review_meeting', name: 'Review Meeting', order: 2, color: '#F59E0B' },
      { id: 'action_items', name: 'Action Items', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Review Type', type: 'select', description: 'Type of review', options: ['Monthly', 'Quarterly', 'Annual', 'Ad-hoc'], isRequired: true },
      { name: 'Health Score', type: 'select', description: 'Account health', options: ['Green', 'Yellow', 'Red'], isRequired: true },
      { name: 'Risk Level', type: 'select', description: 'Risk assessment', options: ['Low', 'Medium', 'High'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Review Preparation',
          description: 'Gather data for review',
          tasks: [
            { title: 'Pull usage data', description: 'Gather product usage metrics.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['data'] },
            { title: 'Review support tickets', description: 'Analyze support history.', assigneeRole: 'member', dueOffset: 1, priority: 'medium', labels: ['support'] },
            { title: 'Gather financial data', description: 'Pull revenue and billing info.', assigneeRole: 'member', dueOffset: 1, priority: 'high', labels: ['finance'] },
            { title: 'Prepare review deck', description: 'Create presentation for review.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['presentation'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze account status',
          tasks: [
            { title: 'Health score analysis', description: 'Calculate overall health score.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['analysis'] },
            { title: 'Risk assessment', description: 'Identify and assess risks.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['risk'] },
            { title: 'Opportunity identification', description: 'Find growth opportunities.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['opportunities'] },
          ],
        },
        {
          name: 'Review Execution',
          description: 'Conduct review and follow up',
          tasks: [
            { title: 'Conduct review meeting', description: 'Present and discuss findings.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['meeting'] },
            { title: 'Document decisions', description: 'Record decisions and action items.', assigneeRole: 'owner', dueOffset: 8, priority: 'high', labels: ['documentation'] },
            { title: 'Assign action items', description: 'Distribute follow-up tasks.', assigneeRole: 'lead', dueOffset: 8, priority: 'high', labels: ['actions'] },
            { title: 'Schedule next review', description: 'Book next review meeting.', assigneeRole: 'member', dueOffset: 10, priority: 'medium', labels: ['scheduling'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'list', enableTimeTracking: false, enableStoryPoints: false },
  },
];
