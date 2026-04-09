/**
 * Freelance Project Templates
 * Pre-built templates for freelancers managing clients, projects, and business operations
 */

export const FREELANCE_TEMPLATES = [
  // ==================== 1. FREELANCE CLIENT PROJECT ====================
  {
    name: 'Freelance Client Project',
    slug: 'freelance-client-project',
    description:
      'Manage freelance projects from proposal to delivery. Track milestones, communication, and deliverables.',
    category: 'freelance',
    icon: 'Briefcase',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'discovery', name: 'Discovery', order: 0, color: '#6B7280' },
      { id: 'proposal', name: 'Proposal', order: 1, color: '#3B82F6' },
      { id: 'in_progress', name: 'In Progress', order: 2, color: '#F59E0B' },
      { id: 'review', name: 'Client Review', order: 3, color: '#8B5CF6' },
      { id: 'delivered', name: 'Delivered', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Client',
        type: 'text',
        description: 'Client name',
        isRequired: true,
      },
      {
        name: 'Project Value',
        type: 'number',
        description: 'Total project value',
        isRequired: true,
      },
      {
        name: 'Payment Type',
        type: 'select',
        description: 'Payment structure',
        options: ['Fixed Price', 'Hourly', 'Retainer', 'Milestone-based'],
        isRequired: true,
      },
      {
        name: 'Start Date',
        type: 'date',
        description: 'Project start date',
        isRequired: true,
      },
      {
        name: 'Deadline',
        type: 'date',
        description: 'Final delivery deadline',
        isRequired: true,
      },
      {
        name: 'Hours Estimated',
        type: 'number',
        description: 'Estimated hours for project',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Project Setup',
          description: 'Initiate the project',
          tasks: [
            {
              title: 'Initial client call',
              description: 'Discuss project requirements and scope.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['discovery', 'meeting'],
            },
            {
              title: 'Document requirements',
              description: 'Create detailed requirements document.',
              assigneeRole: 'owner',
              dueOffset: 1,
              priority: 'high',
              labels: ['documentation'],
              subtasks: [
                { title: 'List project deliverables' },
                { title: 'Define success criteria' },
                { title: 'Note client preferences' },
              ],
            },
            {
              title: 'Create proposal/estimate',
              description: 'Prepare project proposal with pricing.',
              assigneeRole: 'owner',
              dueOffset: 2,
              priority: 'high',
              labels: ['proposal'],
            },
            {
              title: 'Send contract',
              description: 'Send contract for client signature.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['contract'],
            },
            {
              title: 'Collect deposit',
              description: 'Receive initial payment/deposit.',
              assigneeRole: 'owner',
              dueOffset: 5,
              priority: 'high',
              labels: ['payment'],
            },
          ],
        },
        {
          name: 'Project Work',
          description: 'Execute the project',
          tasks: [
            {
              title: 'Project kickoff',
              description: 'Start project and set expectations.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'high',
              labels: ['kickoff'],
            },
            {
              title: 'Milestone 1 delivery',
              description: 'Complete and deliver first milestone.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'high',
              labels: ['milestone'],
            },
            {
              title: 'Client feedback - Milestone 1',
              description: 'Gather and address client feedback.',
              assigneeRole: 'owner',
              dueOffset: 16,
              priority: 'high',
              labels: ['feedback'],
            },
            {
              title: 'Milestone 2 delivery',
              description: 'Complete and deliver second milestone.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'high',
              labels: ['milestone'],
            },
            {
              title: 'Final revisions',
              description: 'Make final adjustments based on feedback.',
              assigneeRole: 'owner',
              dueOffset: 25,
              priority: 'high',
              labels: ['revision'],
            },
          ],
        },
        {
          name: 'Project Completion',
          description: 'Deliver and close the project',
          tasks: [
            {
              title: 'Final delivery',
              description: 'Deliver all project files and assets.',
              assigneeRole: 'owner',
              dueOffset: 28,
              priority: 'high',
              labels: ['delivery'],
            },
            {
              title: 'Client approval',
              description: 'Get sign-off on deliverables.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'high',
              labels: ['approval'],
            },
            {
              title: 'Final invoice',
              description: 'Send final invoice.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'high',
              labels: ['payment'],
            },
            {
              title: 'Request testimonial',
              description: 'Ask for review or testimonial.',
              assigneeRole: 'owner',
              dueOffset: 35,
              priority: 'medium',
              labels: ['follow-up'],
            },
            {
              title: 'Archive project',
              description: 'Archive all project files and notes.',
              assigneeRole: 'owner',
              dueOffset: 37,
              priority: 'low',
              labels: ['admin'],
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

  // ==================== 2. FREELANCE BUSINESS SETUP ====================
  {
    name: 'Freelance Business Setup',
    slug: 'freelance-business-setup',
    description:
      'Start your freelance business right. Set up legal, financial, and operational foundations.',
    category: 'freelance',
    icon: 'Building',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'todo', name: 'To Do', order: 0, color: '#6B7280' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { id: 'waiting', name: 'Waiting', order: 2, color: '#F59E0B' },
      { id: 'done', name: 'Done', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Category',
        type: 'select',
        description: 'Task category',
        options: ['Legal', 'Financial', 'Marketing', 'Operations', 'Portfolio'],
        isRequired: false,
      },
      {
        name: 'Cost',
        type: 'number',
        description: 'Associated cost',
        isRequired: false,
      },
      {
        name: 'Due Date',
        type: 'date',
        description: 'Target completion date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Legal & Admin',
          description: 'Set up legal foundations',
          tasks: [
            {
              title: 'Choose business structure',
              description: 'Decide on sole proprietor, LLC, etc.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['legal'],
            },
            {
              title: 'Register business name',
              description: 'Register your business/DBA name.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'high',
              labels: ['legal'],
            },
            {
              title: 'Get business license',
              description: 'Apply for required licenses.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'high',
              labels: ['legal'],
            },
            {
              title: 'Create contract templates',
              description: 'Prepare standard client contracts.',
              assigneeRole: 'owner',
              dueOffset: 10,
              priority: 'high',
              labels: ['legal', 'templates'],
              subtasks: [
                { title: 'Service agreement' },
                { title: 'NDA template' },
                { title: 'Scope of work template' },
              ],
            },
            {
              title: 'Set up business insurance',
              description: 'Get professional liability insurance.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'medium',
              labels: ['legal'],
            },
          ],
        },
        {
          name: 'Financial Setup',
          description: 'Set up financial systems',
          tasks: [
            {
              title: 'Open business bank account',
              description: 'Separate business and personal finances.',
              assigneeRole: 'owner',
              dueOffset: 5,
              priority: 'high',
              labels: ['financial'],
            },
            {
              title: 'Set up accounting system',
              description: 'Choose and set up invoicing/accounting software.',
              assigneeRole: 'owner',
              dueOffset: 10,
              priority: 'high',
              labels: ['financial'],
            },
            {
              title: 'Create invoice template',
              description: 'Design professional invoice template.',
              assigneeRole: 'owner',
              dueOffset: 12,
              priority: 'medium',
              labels: ['financial', 'templates'],
            },
            {
              title: 'Set up payment processing',
              description: 'Enable card and bank transfers.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'high',
              labels: ['financial'],
            },
            {
              title: 'Plan for taxes',
              description: 'Understand tax obligations and set aside funds.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'high',
              labels: ['financial'],
            },
          ],
        },
        {
          name: 'Online Presence',
          description: 'Establish your online presence',
          tasks: [
            {
              title: 'Create portfolio website',
              description: 'Build website to showcase work.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'high',
              labels: ['marketing'],
              subtasks: [
                { title: 'Choose domain name' },
                { title: 'Design website' },
                { title: 'Write copy' },
                { title: 'Add portfolio pieces' },
              ],
            },
            {
              title: 'Set up professional email',
              description: 'Create business email address.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'high',
              labels: ['marketing'],
            },
            {
              title: 'Update LinkedIn profile',
              description: 'Optimize LinkedIn for freelance work.',
              assigneeRole: 'owner',
              dueOffset: 10,
              priority: 'medium',
              labels: ['marketing'],
            },
            {
              title: 'Create profiles on freelance platforms',
              description: 'Set up profiles on relevant platforms.',
              assigneeRole: 'owner',
              dueOffset: 17,
              priority: 'medium',
              labels: ['marketing'],
            },
            {
              title: 'Prepare case studies',
              description: 'Document past work as case studies.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'medium',
              labels: ['portfolio'],
            },
          ],
        },
        {
          name: 'Operations',
          description: 'Set up operational processes',
          tasks: [
            {
              title: 'Set up project management tool',
              description: 'Choose and configure PM software.',
              assigneeRole: 'owner',
              dueOffset: 5,
              priority: 'medium',
              labels: ['operations'],
            },
            {
              title: 'Create client onboarding process',
              description: 'Document how you onboard new clients.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'medium',
              labels: ['operations'],
            },
            {
              title: 'Set up file storage system',
              description: 'Organize cloud storage for projects.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'medium',
              labels: ['operations'],
            },
            {
              title: 'Create service packages',
              description: 'Define your service offerings and pricing.',
              assigneeRole: 'owner',
              dueOffset: 10,
              priority: 'high',
              labels: ['operations'],
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

  // ==================== 3. CLIENT PIPELINE ====================
  {
    name: 'Client Pipeline',
    slug: 'client-pipeline',
    description:
      'Track potential clients from initial contact to signed contract. Manage your freelance sales funnel.',
    category: 'freelance',
    icon: 'Filter',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'lead', name: 'Lead', order: 0, color: '#6B7280' },
      { id: 'contacted', name: 'Contacted', order: 1, color: '#3B82F6' },
      { id: 'meeting', name: 'Meeting Scheduled', order: 2, color: '#F59E0B' },
      { id: 'proposal', name: 'Proposal Sent', order: 3, color: '#8B5CF6' },
      { id: 'negotiation', name: 'Negotiation', order: 4, color: '#EC4899' },
      { id: 'won', name: 'Won', order: 5, color: '#10B981' },
      { id: 'lost', name: 'Lost', order: 6, color: '#EF4444' },
    ],
    customFields: [
      {
        name: 'Contact Name',
        type: 'text',
        description: 'Client contact name',
        isRequired: true,
      },
      {
        name: 'Company',
        type: 'text',
        description: 'Company name',
        isRequired: false,
      },
      {
        name: 'Email',
        type: 'text',
        description: 'Contact email',
        isRequired: true,
      },
      {
        name: 'Potential Value',
        type: 'number',
        description: 'Estimated project value',
        isRequired: false,
      },
      {
        name: 'Source',
        type: 'select',
        description: 'How they found you',
        options: ['Referral', 'Website', 'Social Media', 'Freelance Platform', 'Networking', 'Cold Outreach'],
        isRequired: false,
      },
      {
        name: 'Next Action',
        type: 'date',
        description: 'Next follow-up date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Lead Management',
          description: 'Track and manage leads',
          tasks: [
            {
              title: 'Define ideal client profile',
              description: 'Document your target client characteristics.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy'],
            },
            {
              title: 'Set up lead capture',
              description: 'Create contact form and lead magnet.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'medium',
              labels: ['setup'],
            },
            {
              title: 'Create outreach templates',
              description: 'Write email templates for outreach.',
              assigneeRole: 'owner',
              dueOffset: 5,
              priority: 'medium',
              labels: ['templates'],
              subtasks: [
                { title: 'Initial outreach email' },
                { title: 'Follow-up email' },
                { title: 'Meeting request email' },
              ],
            },
          ],
        },
        {
          name: 'Sample Leads',
          description: 'Example client leads',
          tasks: [
            {
              title: '[Lead] - Potential Website Project',
              description: 'Lead interested in website redesign.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'high',
              labels: ['lead', 'sample'],
              subtasks: [
                { title: 'Send initial email' },
                { title: 'Schedule discovery call' },
                { title: 'Prepare proposal' },
              ],
            },
            {
              title: '[Lead] - Referral from Past Client',
              description: 'Warm lead referred by satisfied client.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['lead', 'referral', 'sample'],
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

  // ==================== 4. RETAINER CLIENT MANAGEMENT ====================
  {
    name: 'Retainer Client Management',
    slug: 'retainer-client-management',
    description:
      'Manage ongoing retainer clients. Track hours, deliverables, and monthly recurring work.',
    category: 'freelance',
    icon: 'RefreshCw',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'backlog', name: 'Backlog', order: 0, color: '#6B7280' },
      { id: 'this_month', name: 'This Month', order: 1, color: '#3B82F6' },
      { id: 'in_progress', name: 'In Progress', order: 2, color: '#F59E0B' },
      { id: 'review', name: 'Review', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Client',
        type: 'text',
        description: 'Client name',
        isRequired: true,
      },
      {
        name: 'Monthly Hours',
        type: 'number',
        description: 'Hours included in retainer',
        isRequired: true,
      },
      {
        name: 'Hours Used',
        type: 'number',
        description: 'Hours used this month',
        isRequired: false,
      },
      {
        name: 'Retainer Value',
        type: 'number',
        description: 'Monthly retainer amount',
        isRequired: true,
      },
      {
        name: 'Renewal Date',
        type: 'date',
        description: 'Contract renewal date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Monthly Setup',
          description: 'Start of month tasks',
          tasks: [
            {
              title: 'Reset monthly hours tracking',
              description: 'Start fresh hour tracking for new month.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'medium',
              labels: ['admin', 'monthly'],
            },
            {
              title: 'Review last month deliverables',
              description: 'Summarize work completed last month.',
              assigneeRole: 'owner',
              dueOffset: 1,
              priority: 'medium',
              labels: ['review'],
            },
            {
              title: 'Send monthly report',
              description: 'Share progress report with client.',
              assigneeRole: 'owner',
              dueOffset: 2,
              priority: 'high',
              labels: ['reporting'],
            },
            {
              title: 'Plan this month priorities',
              description: 'Identify key tasks for the month.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning'],
            },
          ],
        },
        {
          name: 'Recurring Tasks',
          description: 'Regular retainer work',
          tasks: [
            {
              title: 'Weekly status update',
              description: 'Send weekly progress update to client.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'medium',
              labels: ['communication', 'recurring'],
            },
            {
              title: 'Monthly strategy call',
              description: 'Monthly check-in call with client.',
              assigneeRole: 'owner',
              dueOffset: 15,
              priority: 'high',
              labels: ['meeting', 'recurring'],
            },
            {
              title: 'Log hours',
              description: 'Update time tracking for the week.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'medium',
              labels: ['admin', 'recurring'],
            },
          ],
        },
        {
          name: 'End of Month',
          description: 'Month-end tasks',
          tasks: [
            {
              title: 'Review hours utilization',
              description: 'Check hours used vs. retainer allocation.',
              assigneeRole: 'owner',
              dueOffset: 28,
              priority: 'high',
              labels: ['review'],
            },
            {
              title: 'Send invoice',
              description: 'Invoice for monthly retainer.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'high',
              labels: ['billing'],
            },
            {
              title: 'Roll over or address unused hours',
              description: 'Handle unused hours per contract.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'medium',
              labels: ['admin'],
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

  // ==================== 5. PORTFOLIO PROJECT ====================
  {
    name: 'Portfolio Project',
    slug: 'portfolio-project',
    description:
      'Create a portfolio piece to showcase your skills. Perfect for building your portfolio with spec or personal work.',
    category: 'freelance',
    icon: 'Image',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'concept', name: 'Concept', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'polish', name: 'Polish', order: 3, color: '#8B5CF6' },
      { id: 'published', name: 'Published', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Project Type',
        type: 'select',
        description: 'Type of portfolio piece',
        options: ['Case Study', 'Concept Project', 'Personal Project', 'Pro Bono', 'Redesign'],
        isRequired: true,
      },
      {
        name: 'Skills Showcased',
        type: 'text',
        description: 'Key skills demonstrated',
        isRequired: false,
      },
      {
        name: 'Target Date',
        type: 'date',
        description: 'Target completion date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Concept & Planning',
          description: 'Plan the portfolio piece',
          tasks: [
            {
              title: 'Choose project concept',
              description: 'Decide what to create for portfolio.',
              assigneeRole: 'owner',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning'],
            },
            {
              title: 'Define objectives',
              description: 'Set goals for what to showcase.',
              assigneeRole: 'owner',
              dueOffset: 1,
              priority: 'high',
              labels: ['planning'],
              subtasks: [
                { title: 'Identify target audience' },
                { title: 'Define skills to demonstrate' },
                { title: 'Set project scope' },
              ],
            },
            {
              title: 'Research and inspiration',
              description: 'Gather inspiration and references.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'medium',
              labels: ['research'],
            },
          ],
        },
        {
          name: 'Creation',
          description: 'Create the portfolio piece',
          tasks: [
            {
              title: 'Create initial designs/drafts',
              description: 'Develop first version of work.',
              assigneeRole: 'owner',
              dueOffset: 7,
              priority: 'high',
              labels: ['creation'],
            },
            {
              title: 'Get feedback',
              description: 'Share with peers for feedback.',
              assigneeRole: 'owner',
              dueOffset: 10,
              priority: 'medium',
              labels: ['feedback'],
            },
            {
              title: 'Iterate and refine',
              description: 'Improve based on feedback.',
              assigneeRole: 'owner',
              dueOffset: 14,
              priority: 'high',
              labels: ['creation'],
            },
            {
              title: 'Final polish',
              description: 'Add finishing touches.',
              assigneeRole: 'owner',
              dueOffset: 17,
              priority: 'medium',
              labels: ['polish'],
            },
          ],
        },
        {
          name: 'Documentation & Publishing',
          description: 'Document and share your work',
          tasks: [
            {
              title: 'Write case study',
              description: 'Document process and results.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'high',
              labels: ['documentation'],
              subtasks: [
                { title: 'Describe the challenge' },
                { title: 'Document the process' },
                { title: 'Highlight the solution' },
                { title: 'Add mockups/screenshots' },
              ],
            },
            {
              title: 'Prepare presentation assets',
              description: 'Create images and materials for portfolio.',
              assigneeRole: 'owner',
              dueOffset: 24,
              priority: 'medium',
              labels: ['assets'],
            },
            {
              title: 'Add to portfolio website',
              description: 'Publish on your portfolio site.',
              assigneeRole: 'owner',
              dueOffset: 28,
              priority: 'high',
              labels: ['publishing'],
            },
            {
              title: 'Share on social media',
              description: 'Promote on LinkedIn, Dribbble, etc.',
              assigneeRole: 'owner',
              dueOffset: 30,
              priority: 'medium',
              labels: ['marketing'],
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

  // ==================== 6. CLIENT ONBOARDING ====================
  {
    name: 'Client Onboarding',
    slug: 'client-onboarding',
    description:
      'Streamline new client onboarding with a structured process for gathering information, setting expectations, and starting projects smoothly.',
    category: 'freelance',
    icon: 'UserPlus',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'pending', name: 'Pending', order: 0, color: '#6B7280' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { id: 'awaiting_client', name: 'Awaiting Client', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client Name', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Company', type: 'text', description: 'Company name', isRequired: false },
      { name: 'Project Type', type: 'select', description: 'Type of project', options: ['Website', 'App', 'Branding', 'Marketing', 'Consulting', 'Other'], isRequired: true },
      { name: 'Start Date', type: 'date', description: 'Project start date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Initial Setup',
          description: 'Gather client information',
          tasks: [
            { title: 'Send welcome email', description: 'Welcome the client and outline next steps.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['communication'] },
            { title: 'Collect client questionnaire', description: 'Send and collect detailed project questionnaire.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['discovery'] },
            { title: 'Request brand assets', description: 'Gather logos, colors, fonts, and guidelines.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['assets'] },
            { title: 'Set up client folder', description: 'Create organized folder structure for client files.', assigneeRole: 'owner', dueOffset: 1, priority: 'medium', labels: ['admin'] },
          ],
        },
        {
          name: 'Contracts & Payments',
          description: 'Handle legal and financial setup',
          tasks: [
            { title: 'Send contract for signature', description: 'Prepare and send service agreement.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['legal'] },
            { title: 'Receive signed contract', description: 'Confirm contract is signed and filed.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['legal'] },
            { title: 'Send initial invoice', description: 'Invoice for deposit or first payment.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['billing'] },
            { title: 'Confirm payment received', description: 'Verify deposit has been received.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['billing'] },
          ],
        },
        {
          name: 'Project Kickoff',
          description: 'Launch the project',
          tasks: [
            { title: 'Schedule kickoff call', description: 'Set up initial project meeting.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['meeting'] },
            { title: 'Create project timeline', description: 'Build detailed schedule with milestones.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['planning'] },
            { title: 'Set up communication channels', description: 'Establish Slack, email, or project tool access.', assigneeRole: 'owner', dueOffset: 5, priority: 'medium', labels: ['setup'] },
            { title: 'Share project access', description: 'Give client access to relevant tools and documents.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['setup'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 7. PROJECT PROPOSAL ====================
  {
    name: 'Project Proposal',
    slug: 'project-proposal',
    description:
      'Create winning project proposals. Structure your discovery, pricing, and presentation to close more deals.',
    category: 'freelance',
    icon: 'FileText',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'drafting', name: 'Drafting', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'sent', name: 'Sent', order: 3, color: '#8B5CF6' },
      { id: 'accepted', name: 'Accepted', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client Name', type: 'text', description: 'Prospective client', isRequired: true },
      { name: 'Project Value', type: 'number', description: 'Proposed project value', isRequired: true },
      { name: 'Deadline', type: 'date', description: 'Proposal due date', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Discovery',
          description: 'Understand client needs',
          tasks: [
            { title: 'Review client inquiry', description: 'Analyze initial request and requirements.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['research'] },
            { title: 'Conduct discovery call', description: 'Deep dive into project requirements.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['meeting'] },
            { title: 'Research client business', description: 'Understand their industry and competitors.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['research'] },
            { title: 'Identify pain points', description: 'Document key challenges to address.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['discovery'] },
          ],
        },
        {
          name: 'Proposal Creation',
          description: 'Build the proposal',
          tasks: [
            { title: 'Define project scope', description: 'Outline deliverables and boundaries.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['scope'] },
            { title: 'Calculate pricing', description: 'Determine costs and profit margin.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['pricing'] },
            { title: 'Write proposal document', description: 'Create professional proposal.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['writing'] },
            { title: 'Add case studies', description: 'Include relevant portfolio examples.', assigneeRole: 'owner', dueOffset: 4, priority: 'medium', labels: ['portfolio'] },
            { title: 'Review and polish', description: 'Proofread and finalize proposal.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Submission & Follow-up',
          description: 'Send and follow up',
          tasks: [
            { title: 'Send proposal', description: 'Deliver proposal to client.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['delivery'] },
            { title: 'Schedule follow-up', description: 'Set reminder to follow up.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['follow-up'] },
            { title: 'Address questions', description: 'Respond to client inquiries.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['communication'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 8. CONTRACT NEGOTIATION ====================
  {
    name: 'Contract Negotiation',
    slug: 'contract-negotiation',
    description:
      'Navigate contract negotiations professionally. Track terms, revisions, and ensure mutually beneficial agreements.',
    category: 'freelance',
    icon: 'Scale',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'drafting', name: 'Drafting', order: 0, color: '#6B7280' },
      { id: 'sent', name: 'Sent to Client', order: 1, color: '#3B82F6' },
      { id: 'negotiating', name: 'Negotiating', order: 2, color: '#F59E0B' },
      { id: 'final_review', name: 'Final Review', order: 3, color: '#8B5CF6' },
      { id: 'signed', name: 'Signed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Contract Type', type: 'select', description: 'Type of contract', options: ['Service Agreement', 'Retainer', 'NDA', 'SOW', 'Master Agreement'], isRequired: true },
      { name: 'Contract Value', type: 'number', description: 'Total contract value', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Contract Preparation',
          description: 'Prepare initial contract',
          tasks: [
            { title: 'Select contract template', description: 'Choose appropriate template for project type.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['preparation'] },
            { title: 'Customize terms', description: 'Adjust terms for specific project.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['legal'] },
            { title: 'Define payment terms', description: 'Specify payment schedule and methods.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['billing'] },
            { title: 'Include scope of work', description: 'Attach detailed deliverables.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['scope'] },
          ],
        },
        {
          name: 'Negotiation',
          description: 'Handle back and forth',
          tasks: [
            { title: 'Send initial contract', description: 'Deliver contract for client review.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['delivery'] },
            { title: 'Review client feedback', description: 'Analyze requested changes.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['review'] },
            { title: 'Assess revision requests', description: 'Evaluate impact of proposed changes.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['negotiation'] },
            { title: 'Prepare counter-proposal', description: 'Draft response to change requests.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['negotiation'] },
          ],
        },
        {
          name: 'Finalization',
          description: 'Close the contract',
          tasks: [
            { title: 'Finalize contract terms', description: 'Agree on final version.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['legal'] },
            { title: 'Send for signature', description: 'Use DocuSign or similar for signing.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['signature'] },
            { title: 'Countersign contract', description: 'Add your signature.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['signature'] },
            { title: 'Archive signed contract', description: 'Store executed contract safely.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['admin'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 9. PROJECT KICKOFF ====================
  {
    name: 'Project Kickoff',
    slug: 'project-kickoff',
    description:
      'Launch projects successfully with structured kickoff meetings, clear expectations, and aligned goals.',
    category: 'freelance',
    icon: 'Rocket',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'kickoff', name: 'Kickoff', order: 1, color: '#3B82F6' },
      { id: 'follow_up', name: 'Follow Up', order: 2, color: '#F59E0B' },
      { id: 'done', name: 'Done', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Project', type: 'text', description: 'Project name', isRequired: true },
      { name: 'Kickoff Date', type: 'date', description: 'Scheduled kickoff date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Kickoff Prep',
          description: 'Prepare for kickoff meeting',
          tasks: [
            { title: 'Review project scope', description: 'Revisit agreed scope and deliverables.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['preparation'] },
            { title: 'Prepare kickoff agenda', description: 'Create structured meeting agenda.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['planning'] },
            { title: 'Set up project workspace', description: 'Configure tools and shared spaces.', assigneeRole: 'owner', dueOffset: 1, priority: 'medium', labels: ['setup'] },
            { title: 'Send kickoff invite', description: 'Schedule meeting with all stakeholders.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['meeting'] },
          ],
        },
        {
          name: 'Kickoff Meeting',
          description: 'Conduct the kickoff',
          tasks: [
            { title: 'Introductions and roles', description: 'Clarify team members and responsibilities.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['meeting'] },
            { title: 'Review project goals', description: 'Align on objectives and success metrics.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['meeting'] },
            { title: 'Walk through timeline', description: 'Present project schedule and milestones.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['meeting'] },
            { title: 'Discuss communication plan', description: 'Agree on update frequency and channels.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['meeting'] },
            { title: 'Address questions', description: 'Handle any client concerns.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['meeting'] },
          ],
        },
        {
          name: 'Post-Kickoff',
          description: 'Follow up after kickoff',
          tasks: [
            { title: 'Send meeting summary', description: 'Document key decisions and action items.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['documentation'] },
            { title: 'Share project timeline', description: 'Distribute finalized schedule.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['planning'] },
            { title: 'Assign initial tasks', description: 'Begin project work.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['execution'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 10. CLIENT COMMUNICATION ====================
  {
    name: 'Client Communication',
    slug: 'client-communication',
    description:
      'Maintain excellent client relationships through structured communication, regular updates, and proactive outreach.',
    category: 'freelance',
    icon: 'MessageSquare',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'scheduled', name: 'Scheduled', order: 0, color: '#6B7280' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { id: 'awaiting_response', name: 'Awaiting Response', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Communication Type', type: 'select', description: 'Type of communication', options: ['Email', 'Call', 'Video Meeting', 'Slack/Chat', 'In Person'], isRequired: false },
      { name: 'Next Contact', type: 'date', description: 'Next scheduled contact', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Regular Updates',
          description: 'Scheduled communications',
          tasks: [
            { title: 'Send weekly progress update', description: 'Share what was accomplished this week.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['update', 'recurring'] },
            { title: 'Schedule bi-weekly call', description: 'Regular check-in meeting.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['meeting', 'recurring'] },
            { title: 'Share milestone completion', description: 'Notify client of completed milestones.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['milestone'] },
          ],
        },
        {
          name: 'Proactive Communication',
          description: 'Stay ahead of issues',
          tasks: [
            { title: 'Flag potential delays', description: 'Communicate risks before they become problems.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['proactive'] },
            { title: 'Share relevant insights', description: 'Provide value-added recommendations.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['value-add'] },
            { title: 'Request feedback proactively', description: 'Check in on client satisfaction.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['feedback'] },
          ],
        },
        {
          name: 'Communication Templates',
          description: 'Standard messages',
          tasks: [
            { title: 'Create status update template', description: 'Standardize weekly updates.', assigneeRole: 'owner', dueOffset: 1, priority: 'medium', labels: ['template'] },
            { title: 'Prepare delay notification template', description: 'Ready-to-use delay communication.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['template'] },
            { title: 'Draft completion announcement template', description: 'Professional project completion message.', assigneeRole: 'owner', dueOffset: 3, priority: 'low', labels: ['template'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 11. MILESTONE DELIVERY ====================
  {
    name: 'Milestone Delivery',
    slug: 'milestone-delivery',
    description:
      'Deliver project milestones professionally with proper documentation, client review, and approval processes.',
    category: 'freelance',
    icon: 'Flag',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'internal_review', name: 'Internal Review', order: 1, color: '#3B82F6' },
      { id: 'delivered', name: 'Delivered', order: 2, color: '#F59E0B' },
      { id: 'client_review', name: 'Client Review', order: 3, color: '#8B5CF6' },
      { id: 'approved', name: 'Approved', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Milestone Name', type: 'text', description: 'Name of milestone', isRequired: true },
      { name: 'Milestone Number', type: 'number', description: 'Milestone sequence', isRequired: false },
      { name: 'Delivery Date', type: 'date', description: 'Target delivery date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Delivery',
          description: 'Prepare for delivery',
          tasks: [
            { title: 'Complete all deliverables', description: 'Finish all items included in milestone.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['execution'] },
            { title: 'Quality check', description: 'Review work for errors and quality.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['review'] },
            { title: 'Prepare delivery package', description: 'Organize files and documentation.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['preparation'] },
            { title: 'Write delivery notes', description: 'Document what is included.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['documentation'] },
          ],
        },
        {
          name: 'Delivery',
          description: 'Deliver to client',
          tasks: [
            { title: 'Send delivery notification', description: 'Notify client of milestone completion.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['communication'] },
            { title: 'Share deliverables', description: 'Transfer files and access.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['delivery'] },
            { title: 'Schedule review meeting', description: 'Set up walkthrough if needed.', assigneeRole: 'owner', dueOffset: 4, priority: 'medium', labels: ['meeting'] },
          ],
        },
        {
          name: 'Approval',
          description: 'Get client sign-off',
          tasks: [
            { title: 'Collect client feedback', description: 'Gather input on deliverables.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['feedback'] },
            { title: 'Address revisions', description: 'Make requested changes.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['revision'] },
            { title: 'Get formal approval', description: 'Obtain sign-off on milestone.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['approval'] },
            { title: 'Send milestone invoice', description: 'Bill for completed milestone.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['billing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 12. PROJECT HANDOFF ====================
  {
    name: 'Project Handoff',
    slug: 'project-handoff',
    description:
      'Complete projects professionally with thorough handoff documentation, training, and transition support.',
    category: 'freelance',
    icon: 'ArrowRightLeft',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'documentation', name: 'Documentation', order: 1, color: '#3B82F6' },
      { id: 'handoff', name: 'Handoff', order: 2, color: '#F59E0B' },
      { id: 'complete', name: 'Complete', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Project', type: 'text', description: 'Project name', isRequired: true },
      { name: 'Handoff Date', type: 'date', description: 'Target handoff date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Documentation',
          description: 'Prepare handoff materials',
          tasks: [
            { title: 'Create user documentation', description: 'Write guides for using deliverables.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['documentation'] },
            { title: 'Document technical specs', description: 'Record technical details and configurations.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['documentation'] },
            { title: 'List all credentials', description: 'Compile logins and access information.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['security'] },
            { title: 'Prepare maintenance guide', description: 'Instructions for ongoing maintenance.', assigneeRole: 'owner', dueOffset: 4, priority: 'medium', labels: ['documentation'] },
          ],
        },
        {
          name: 'Asset Transfer',
          description: 'Transfer all assets',
          tasks: [
            { title: 'Organize project files', description: 'Structure all files logically.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['organization'] },
            { title: 'Transfer source files', description: 'Share editable source files.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['transfer'] },
            { title: 'Transfer domain/hosting access', description: 'Hand over infrastructure access.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['transfer'] },
            { title: 'Share third-party accounts', description: 'Transfer relevant service accounts.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['transfer'] },
          ],
        },
        {
          name: 'Training & Closure',
          description: 'Train and close project',
          tasks: [
            { title: 'Conduct training session', description: 'Walk client through deliverables.', assigneeRole: 'owner', dueOffset: 8, priority: 'high', labels: ['training'] },
            { title: 'Answer questions', description: 'Address any client concerns.', assigneeRole: 'owner', dueOffset: 9, priority: 'medium', labels: ['support'] },
            { title: 'Define support period', description: 'Clarify post-handoff support terms.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['support'] },
            { title: 'Send final invoice', description: 'Bill for remaining balance.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['billing'] },
            { title: 'Archive project', description: 'Store project files for future reference.', assigneeRole: 'owner', dueOffset: 12, priority: 'low', labels: ['admin'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 13. INVOICE MANAGEMENT ====================
  {
    name: 'Invoice Management',
    slug: 'invoice-management',
    description:
      'Track and manage invoices efficiently. Monitor payments, follow up on overdue invoices, and maintain cash flow.',
    category: 'freelance',
    icon: 'Receipt',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'draft', name: 'Draft', order: 0, color: '#6B7280' },
      { id: 'sent', name: 'Sent', order: 1, color: '#3B82F6' },
      { id: 'overdue', name: 'Overdue', order: 2, color: '#EF4444' },
      { id: 'paid', name: 'Paid', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Invoice Number', type: 'text', description: 'Invoice reference number', isRequired: true },
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Amount', type: 'number', description: 'Invoice amount', isRequired: true },
      { name: 'Due Date', type: 'date', description: 'Payment due date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Invoice Creation',
          description: 'Create and send invoices',
          tasks: [
            { title: 'Gather billable items', description: 'Compile all work to be invoiced.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['preparation'] },
            { title: 'Create invoice', description: 'Generate invoice in accounting software.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['creation'] },
            { title: 'Review for accuracy', description: 'Double-check amounts and details.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['review'] },
            { title: 'Send invoice to client', description: 'Deliver invoice via email.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['delivery'] },
          ],
        },
        {
          name: 'Payment Tracking',
          description: 'Monitor payment status',
          tasks: [
            { title: 'Log invoice in tracker', description: 'Record in payment tracking system.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['tracking'] },
            { title: 'Set payment reminder', description: 'Calendar reminder for due date.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['reminder'] },
            { title: 'Monitor payment receipt', description: 'Check for incoming payment.', assigneeRole: 'owner', dueOffset: 15, priority: 'high', labels: ['tracking'] },
            { title: 'Record payment received', description: 'Mark invoice as paid when received.', assigneeRole: 'owner', dueOffset: 30, priority: 'high', labels: ['reconciliation'] },
          ],
        },
        {
          name: 'Follow-up',
          description: 'Handle overdue invoices',
          tasks: [
            { title: 'Send payment reminder', description: 'Friendly reminder for upcoming due date.', assigneeRole: 'owner', dueOffset: 25, priority: 'medium', labels: ['reminder'] },
            { title: 'Send overdue notice', description: 'Formal notice for past-due invoice.', assigneeRole: 'owner', dueOffset: 35, priority: 'high', labels: ['collection'] },
            { title: 'Follow up by phone', description: 'Call client about overdue payment.', assigneeRole: 'owner', dueOffset: 40, priority: 'high', labels: ['collection'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 14. PAYMENT FOLLOW-UP ====================
  {
    name: 'Payment Follow-up',
    slug: 'payment-follow-up',
    description:
      'Systematic approach to collecting overdue payments while maintaining professional client relationships.',
    category: 'freelance',
    icon: 'DollarSign',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'pending', name: 'Pending', order: 0, color: '#6B7280' },
      { id: 'reminded', name: 'Reminded', order: 1, color: '#F59E0B' },
      { id: 'escalated', name: 'Escalated', order: 2, color: '#EF4444' },
      { id: 'resolved', name: 'Resolved', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Invoice Number', type: 'text', description: 'Related invoice', isRequired: true },
      { name: 'Amount Due', type: 'number', description: 'Outstanding amount', isRequired: true },
      { name: 'Days Overdue', type: 'number', description: 'Days past due date', isRequired: false },
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Initial Follow-up',
          description: 'First contact attempts',
          tasks: [
            { title: 'Send friendly reminder email', description: 'Polite reminder about overdue payment.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['communication'] },
            { title: 'Check spam/delivery', description: 'Confirm email was received.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['verification'] },
            { title: 'Send second reminder', description: 'Follow-up if no response.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['communication'] },
          ],
        },
        {
          name: 'Escalation',
          description: 'Increase urgency',
          tasks: [
            { title: 'Call the client', description: 'Phone call to discuss payment.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['call'] },
            { title: 'Send formal demand letter', description: 'Official written demand.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['formal'] },
            { title: 'Offer payment plan', description: 'Propose installment option if needed.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['negotiation'] },
            { title: 'Pause ongoing work', description: 'Stop work if contract permits.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['action'] },
          ],
        },
        {
          name: 'Resolution',
          description: 'Finalize collection',
          tasks: [
            { title: 'Document all communication', description: 'Keep records of all attempts.', assigneeRole: 'owner', dueOffset: 0, priority: 'medium', labels: ['documentation'] },
            { title: 'Consider collection agency', description: 'Evaluate third-party collection.', assigneeRole: 'owner', dueOffset: 30, priority: 'low', labels: ['escalation'] },
            { title: 'Record final outcome', description: 'Document resolution.', assigneeRole: 'owner', dueOffset: 45, priority: 'medium', labels: ['closure'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 15. CLIENT FEEDBACK ====================
  {
    name: 'Client Feedback',
    slug: 'client-feedback',
    description:
      'Collect, organize, and act on client feedback to improve services and build stronger relationships.',
    category: 'freelance',
    icon: 'MessageCircle',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'requested', name: 'Requested', order: 0, color: '#6B7280' },
      { id: 'received', name: 'Received', order: 1, color: '#3B82F6' },
      { id: 'analyzing', name: 'Analyzing', order: 2, color: '#F59E0B' },
      { id: 'actioned', name: 'Actioned', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Project', type: 'text', description: 'Related project', isRequired: false },
      { name: 'Feedback Type', type: 'select', description: 'Type of feedback', options: ['Project Feedback', 'Service Review', 'NPS', 'Testimonial Request', 'Exit Interview'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Feedback Collection',
          description: 'Gather client feedback',
          tasks: [
            { title: 'Prepare feedback request', description: 'Draft personalized feedback request.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['preparation'] },
            { title: 'Send feedback survey', description: 'Share survey or questionnaire.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['outreach'] },
            { title: 'Follow up if no response', description: 'Send gentle reminder.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['follow-up'] },
            { title: 'Schedule feedback call', description: 'Offer live discussion option.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['meeting'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Review and analyze',
          tasks: [
            { title: 'Review feedback received', description: 'Read and understand responses.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['analysis'] },
            { title: 'Identify patterns', description: 'Look for common themes.', assigneeRole: 'owner', dueOffset: 11, priority: 'medium', labels: ['analysis'] },
            { title: 'Document key insights', description: 'Record important learnings.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['documentation'] },
          ],
        },
        {
          name: 'Action',
          description: 'Act on feedback',
          tasks: [
            { title: 'Create improvement plan', description: 'Plan how to address feedback.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['planning'] },
            { title: 'Thank client for feedback', description: 'Send appreciation message.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['communication'] },
            { title: 'Implement changes', description: 'Make improvements based on feedback.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['execution'] },
            { title: 'Update processes', description: 'Modify workflows as needed.', assigneeRole: 'owner', dueOffset: 28, priority: 'medium', labels: ['improvement'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 16. PORTFOLIO UPDATE ====================
  {
    name: 'Portfolio Update',
    slug: 'portfolio-update',
    description:
      'Keep your portfolio fresh and compelling. Regular updates to showcase your best and most recent work.',
    category: 'freelance',
    icon: 'Palette',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creating', name: 'Creating', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Update Type', type: 'select', description: 'Type of update', options: ['New Project', 'Case Study', 'Redesign', 'Skills Update', 'Full Refresh'], isRequired: true },
      { name: 'Target Date', type: 'date', description: 'Planned publish date', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Content Planning',
          description: 'Plan portfolio updates',
          tasks: [
            { title: 'Audit current portfolio', description: 'Review existing content for relevance.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['audit'] },
            { title: 'Identify projects to add', description: 'Select recent work to showcase.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['planning'] },
            { title: 'Decide what to remove', description: 'Remove outdated or weaker pieces.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['planning'] },
            { title: 'Plan case study format', description: 'Outline structure for new pieces.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['planning'] },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create new portfolio pieces',
          tasks: [
            { title: 'Write project descriptions', description: 'Craft compelling copy.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['writing'] },
            { title: 'Create visuals and mockups', description: 'Prepare images and presentations.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['design'] },
            { title: 'Document process', description: 'Show your approach and thinking.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['documentation'] },
            { title: 'Add results and metrics', description: 'Include measurable outcomes.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['content'] },
          ],
        },
        {
          name: 'Publishing',
          description: 'Publish and promote',
          tasks: [
            { title: 'Update website', description: 'Add new content to portfolio site.', assigneeRole: 'owner', dueOffset: 17, priority: 'high', labels: ['website'] },
            { title: 'Update LinkedIn projects', description: 'Sync with LinkedIn profile.', assigneeRole: 'owner', dueOffset: 18, priority: 'medium', labels: ['linkedin'] },
            { title: 'Share on social media', description: 'Announce portfolio updates.', assigneeRole: 'owner', dueOffset: 19, priority: 'medium', labels: ['promotion'] },
            { title: 'Update platform profiles', description: 'Refresh Upwork, Fiverr, etc.', assigneeRole: 'owner', dueOffset: 20, priority: 'medium', labels: ['platforms'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 17. CASE STUDY CREATION ====================
  {
    name: 'Case Study Creation',
    slug: 'case-study-creation',
    description:
      'Create compelling case studies that showcase your expertise and win new clients.',
    category: 'freelance',
    icon: 'BookOpen',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'writing', name: 'Writing', order: 1, color: '#3B82F6' },
      { id: 'design', name: 'Design', order: 2, color: '#F59E0B' },
      { id: 'review', name: 'Review', order: 3, color: '#8B5CF6' },
      { id: 'published', name: 'Published', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Project Name', type: 'text', description: 'Featured project', isRequired: true },
      { name: 'Client', type: 'text', description: 'Client name', isRequired: false },
      { name: 'Industry', type: 'text', description: 'Client industry', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Research & Planning',
          description: 'Gather information',
          tasks: [
            { title: 'Get client permission', description: 'Confirm client allows case study.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['permission'] },
            { title: 'Collect project data', description: 'Gather metrics, feedback, and results.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['research'] },
            { title: 'Interview stakeholders', description: 'Get quotes and insights.', assigneeRole: 'owner', dueOffset: 5, priority: 'medium', labels: ['research'] },
            { title: 'Outline case study', description: 'Plan structure and key points.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Write and design',
          tasks: [
            { title: 'Write the challenge section', description: 'Describe the problem.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['writing'] },
            { title: 'Write the solution section', description: 'Explain your approach.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['writing'] },
            { title: 'Write the results section', description: 'Highlight outcomes and ROI.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['writing'] },
            { title: 'Create visual assets', description: 'Design graphics and screenshots.', assigneeRole: 'owner', dueOffset: 16, priority: 'high', labels: ['design'] },
            { title: 'Add client testimonial', description: 'Include quote from client.', assigneeRole: 'owner', dueOffset: 17, priority: 'medium', labels: ['content'] },
          ],
        },
        {
          name: 'Review & Publish',
          description: 'Finalize and share',
          tasks: [
            { title: 'Send for client approval', description: 'Get client sign-off on content.', assigneeRole: 'owner', dueOffset: 19, priority: 'high', labels: ['approval'] },
            { title: 'Revise based on feedback', description: 'Make requested changes.', assigneeRole: 'owner', dueOffset: 22, priority: 'medium', labels: ['revision'] },
            { title: 'Publish case study', description: 'Add to website and portfolio.', assigneeRole: 'owner', dueOffset: 25, priority: 'high', labels: ['publishing'] },
            { title: 'Promote case study', description: 'Share on social and newsletter.', assigneeRole: 'owner', dueOffset: 27, priority: 'medium', labels: ['promotion'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 18. TESTIMONIAL REQUEST ====================
  {
    name: 'Testimonial Request',
    slug: 'testimonial-request',
    description:
      'Systematically collect testimonials and reviews from satisfied clients to build social proof.',
    category: 'freelance',
    icon: 'Quote',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'identified', name: 'Identified', order: 0, color: '#6B7280' },
      { id: 'requested', name: 'Requested', order: 1, color: '#3B82F6' },
      { id: 'received', name: 'Received', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Project', type: 'text', description: 'Related project', isRequired: false },
      { name: 'Platform', type: 'select', description: 'Where to publish', options: ['Website', 'LinkedIn', 'Google', 'Clutch', 'Upwork', 'Multiple'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Preparation',
          description: 'Prepare for request',
          tasks: [
            { title: 'Identify ideal clients', description: 'Select satisfied clients to approach.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Choose optimal timing', description: 'Request after positive milestone.', assigneeRole: 'owner', dueOffset: 1, priority: 'medium', labels: ['timing'] },
            { title: 'Draft request message', description: 'Write personalized request.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['writing'] },
            { title: 'Prepare guidance questions', description: 'Help clients know what to write.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['preparation'] },
          ],
        },
        {
          name: 'Outreach',
          description: 'Request testimonials',
          tasks: [
            { title: 'Send testimonial request', description: 'Reach out to client.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['outreach'] },
            { title: 'Follow up if needed', description: 'Gentle reminder after a week.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['follow-up'] },
            { title: 'Offer to write draft', description: 'Make it easy for busy clients.', assigneeRole: 'owner', dueOffset: 7, priority: 'low', labels: ['assistance'] },
          ],
        },
        {
          name: 'Publishing',
          description: 'Use testimonials',
          tasks: [
            { title: 'Edit and format', description: 'Polish received testimonial.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['editing'] },
            { title: 'Get approval on edits', description: 'Confirm changes with client.', assigneeRole: 'owner', dueOffset: 15, priority: 'high', labels: ['approval'] },
            { title: 'Add to website', description: 'Publish on portfolio site.', assigneeRole: 'owner', dueOffset: 17, priority: 'high', labels: ['publishing'] },
            { title: 'Request LinkedIn recommendation', description: 'Ask for LinkedIn endorsement.', assigneeRole: 'owner', dueOffset: 18, priority: 'medium', labels: ['linkedin'] },
            { title: 'Thank the client', description: 'Show appreciation.', assigneeRole: 'owner', dueOffset: 19, priority: 'medium', labels: ['communication'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 19. RATE NEGOTIATION ====================
  {
    name: 'Rate Negotiation',
    slug: 'rate-negotiation',
    description:
      'Prepare and execute rate negotiations with clients. Know your worth and communicate value effectively.',
    category: 'freelance',
    icon: 'TrendingUp',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'negotiation', name: 'Negotiation', order: 1, color: '#F59E0B' },
      { id: 'agreement', name: 'Agreement', order: 2, color: '#10B981' },
    ],
    customFields: [
      { name: 'Client', type: 'text', description: 'Client name', isRequired: true },
      { name: 'Current Rate', type: 'number', description: 'Current rate', isRequired: false },
      { name: 'Target Rate', type: 'number', description: 'Desired rate', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Research',
          description: 'Gather market data',
          tasks: [
            { title: 'Research market rates', description: 'Survey industry standard rates.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['research'] },
            { title: 'Document your value', description: 'List accomplishments and ROI delivered.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['preparation'] },
            { title: 'Calculate minimum acceptable rate', description: 'Know your walkaway number.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['planning'] },
            { title: 'Prepare negotiation talking points', description: 'Script key arguments.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['preparation'] },
          ],
        },
        {
          name: 'Negotiation',
          description: 'Conduct the negotiation',
          tasks: [
            { title: 'Request rate discussion meeting', description: 'Schedule time to discuss.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['meeting'] },
            { title: 'Present value proposition', description: 'Share your case for increase.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['presentation'] },
            { title: 'Handle objections', description: 'Address client concerns.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['negotiation'] },
            { title: 'Propose alternatives', description: 'Offer scope or value options.', assigneeRole: 'owner', dueOffset: 8, priority: 'medium', labels: ['negotiation'] },
          ],
        },
        {
          name: 'Finalization',
          description: 'Close the deal',
          tasks: [
            { title: 'Get agreement in writing', description: 'Document new terms.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['documentation'] },
            { title: 'Update contract', description: 'Amend existing agreement.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['legal'] },
            { title: 'Set next review date', description: 'Schedule future rate review.', assigneeRole: 'owner', dueOffset: 14, priority: 'low', labels: ['planning'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 20. SCOPE MANAGEMENT ====================
  {
    name: 'Scope Management',
    slug: 'scope-management',
    description:
      'Prevent scope creep and manage project boundaries effectively. Handle change requests professionally.',
    category: 'freelance',
    icon: 'Target',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'defined', name: 'Defined', order: 0, color: '#6B7280' },
      { id: 'change_requested', name: 'Change Requested', order: 1, color: '#F59E0B' },
      { id: 'evaluated', name: 'Evaluated', order: 2, color: '#3B82F6' },
      { id: 'resolved', name: 'Resolved', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Project', type: 'text', description: 'Project name', isRequired: true },
      { name: 'Original Scope', type: 'text', description: 'Initial scope summary', isRequired: false },
      { name: 'Change Impact', type: 'select', description: 'Impact level', options: ['Minor', 'Moderate', 'Major', 'Critical'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Scope Definition',
          description: 'Establish clear boundaries',
          tasks: [
            { title: 'Document project scope', description: 'Write detailed scope document.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['documentation'] },
            { title: 'Define what is NOT included', description: 'Explicitly list exclusions.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['boundaries'] },
            { title: 'Get client sign-off on scope', description: 'Formal agreement on boundaries.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['approval'] },
            { title: 'Create change request process', description: 'Define how to handle changes.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['process'] },
          ],
        },
        {
          name: 'Change Management',
          description: 'Handle scope changes',
          tasks: [
            { title: 'Document change request', description: 'Record what client wants changed.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['documentation'] },
            { title: 'Assess impact', description: 'Evaluate time and cost impact.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['analysis'] },
            { title: 'Prepare change order', description: 'Create formal change request.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['documentation'] },
            { title: 'Communicate cost implications', description: 'Discuss additional costs.', assigneeRole: 'owner', dueOffset: 8, priority: 'high', labels: ['communication'] },
          ],
        },
        {
          name: 'Resolution',
          description: 'Resolve scope issues',
          tasks: [
            { title: 'Get change order approval', description: 'Client agrees to changes.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['approval'] },
            { title: 'Update project timeline', description: 'Adjust schedule for changes.', assigneeRole: 'owner', dueOffset: 11, priority: 'medium', labels: ['planning'] },
            { title: 'Invoice for additional work', description: 'Bill for scope additions.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['billing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 21. TIME TRACKING ====================
  {
    name: 'Time Tracking',
    slug: 'time-tracking',
    description:
      'Implement effective time tracking systems. Monitor productivity, bill accurately, and improve estimates.',
    category: 'freelance',
    icon: 'Clock',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'tracking', name: 'Tracking', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'billed', name: 'Billed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Time Period', type: 'select', description: 'Tracking period', options: ['Daily', 'Weekly', 'Monthly', 'Project-based'], isRequired: true },
      { name: 'Tool', type: 'text', description: 'Time tracking tool used', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'System Setup',
          description: 'Set up time tracking',
          tasks: [
            { title: 'Choose time tracking tool', description: 'Select appropriate software.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['setup'] },
            { title: 'Configure projects and clients', description: 'Set up tracking categories.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['setup'] },
            { title: 'Set up integrations', description: 'Connect with calendar and tools.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['integration'] },
            { title: 'Define tracking habits', description: 'Establish when and how to track.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['process'] },
          ],
        },
        {
          name: 'Daily Tracking',
          description: 'Track time consistently',
          tasks: [
            { title: 'Start timer for each task', description: 'Track time in real-time.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['tracking', 'recurring'] },
            { title: 'Add descriptions', description: 'Note what you worked on.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['documentation'] },
            { title: 'Review daily entries', description: 'Check accuracy at day end.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['review', 'recurring'] },
          ],
        },
        {
          name: 'Reporting',
          description: 'Analyze and bill time',
          tasks: [
            { title: 'Generate weekly report', description: 'Review weekly time summary.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['reporting'] },
            { title: 'Compare to estimates', description: 'Analyze accuracy of estimates.', assigneeRole: 'owner', dueOffset: 8, priority: 'medium', labels: ['analysis'] },
            { title: 'Create client time reports', description: 'Prepare billable time summary.', assigneeRole: 'owner', dueOffset: 30, priority: 'high', labels: ['billing'] },
            { title: 'Improve future estimates', description: 'Use data to estimate better.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['improvement'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 22. EXPENSE TRACKING ====================
  {
    name: 'Expense Tracking',
    slug: 'expense-tracking',
    description:
      'Track business expenses systematically. Categorize spending, prepare for taxes, and manage cash flow.',
    category: 'freelance',
    icon: 'CreditCard',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'incurred', name: 'Incurred', order: 0, color: '#6B7280' },
      { id: 'logged', name: 'Logged', order: 1, color: '#3B82F6' },
      { id: 'categorized', name: 'Categorized', order: 2, color: '#F59E0B' },
      { id: 'reconciled', name: 'Reconciled', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Amount', type: 'number', description: 'Expense amount', isRequired: true },
      { name: 'Category', type: 'select', description: 'Expense category', options: ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Professional Services', 'Other'], isRequired: true },
      { name: 'Receipt', type: 'text', description: 'Receipt reference', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'System Setup',
          description: 'Set up expense tracking',
          tasks: [
            { title: 'Choose expense tracking method', description: 'Select app or spreadsheet.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['setup'] },
            { title: 'Define expense categories', description: 'Create relevant categories.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['setup'] },
            { title: 'Set up receipt storage', description: 'Cloud storage for receipts.', assigneeRole: 'owner', dueOffset: 2, priority: 'medium', labels: ['setup'] },
            { title: 'Link business accounts', description: 'Connect bank and cards.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['integration'] },
          ],
        },
        {
          name: 'Regular Tracking',
          description: 'Track expenses consistently',
          tasks: [
            { title: 'Log expenses immediately', description: 'Record expenses when incurred.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['tracking', 'recurring'] },
            { title: 'Capture receipts', description: 'Photo or save digital receipts.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['documentation', 'recurring'] },
            { title: 'Categorize expenses', description: 'Assign proper categories.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['organization', 'recurring'] },
          ],
        },
        {
          name: 'Monthly Review',
          description: 'Review and reconcile',
          tasks: [
            { title: 'Reconcile with bank statement', description: 'Match expenses to transactions.', assigneeRole: 'owner', dueOffset: 30, priority: 'high', labels: ['reconciliation'] },
            { title: 'Review spending by category', description: 'Analyze where money goes.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['analysis'] },
            { title: 'Identify tax-deductible expenses', description: 'Flag for tax purposes.', assigneeRole: 'owner', dueOffset: 30, priority: 'high', labels: ['tax'] },
            { title: 'Adjust budget if needed', description: 'Update spending plans.', assigneeRole: 'owner', dueOffset: 30, priority: 'low', labels: ['planning'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 23. TAX PREPARATION ====================
  {
    name: 'Tax Preparation',
    slug: 'tax-preparation',
    description:
      'Stay organized for tax season. Track deductions, prepare documents, and file on time.',
    category: 'freelance',
    icon: 'Calculator',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'gathering', name: 'Gathering', order: 0, color: '#6B7280' },
      { id: 'organizing', name: 'Organizing', order: 1, color: '#3B82F6' },
      { id: 'preparing', name: 'Preparing', order: 2, color: '#F59E0B' },
      { id: 'filed', name: 'Filed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Tax Year', type: 'text', description: 'Tax year', isRequired: true },
      { name: 'Filing Deadline', type: 'date', description: 'Due date', isRequired: true },
      { name: 'Accountant', type: 'text', description: 'Tax professional', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Document Collection',
          description: 'Gather all documents',
          tasks: [
            { title: 'Collect all 1099 forms', description: 'Gather income documents from clients.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['documents'] },
            { title: 'Compile expense records', description: 'Organize all business expenses.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['expenses'] },
            { title: 'Gather receipt documentation', description: 'Collect all expense receipts.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['receipts'] },
            { title: 'Collect bank statements', description: 'Get annual bank statements.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['documents'] },
          ],
        },
        {
          name: 'Organization',
          description: 'Organize for filing',
          tasks: [
            { title: 'Calculate total income', description: 'Sum all freelance income.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['calculation'] },
            { title: 'Categorize deductions', description: 'Organize by deduction type.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['deductions'] },
            { title: 'Calculate home office deduction', description: 'Figure home office expenses.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['deductions'] },
            { title: 'Document mileage', description: 'Calculate business mileage.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['deductions'] },
            { title: 'Review quarterly payments', description: 'Confirm estimated payments made.', assigneeRole: 'owner', dueOffset: 15, priority: 'high', labels: ['payments'] },
          ],
        },
        {
          name: 'Filing',
          description: 'Prepare and file',
          tasks: [
            { title: 'Meet with accountant', description: 'Review with tax professional.', assigneeRole: 'owner', dueOffset: 20, priority: 'high', labels: ['meeting'] },
            { title: 'Review tax return', description: 'Check accuracy before filing.', assigneeRole: 'owner', dueOffset: 25, priority: 'high', labels: ['review'] },
            { title: 'Sign and file return', description: 'Submit tax return.', assigneeRole: 'owner', dueOffset: 28, priority: 'high', labels: ['filing'] },
            { title: 'Pay any taxes owed', description: 'Submit payment if applicable.', assigneeRole: 'owner', dueOffset: 28, priority: 'high', labels: ['payment'] },
            { title: 'Archive tax documents', description: 'Store for future reference.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['archive'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 24. BUSINESS REGISTRATION ====================
  {
    name: 'Business Registration',
    slug: 'business-registration',
    description:
      'Register your freelance business properly. Handle legal requirements and establish your business entity.',
    category: 'freelance',
    icon: 'ClipboardList',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'application', name: 'Application', order: 1, color: '#3B82F6' },
      { id: 'pending', name: 'Pending', order: 2, color: '#F59E0B' },
      { id: 'complete', name: 'Complete', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Business Name', type: 'text', description: 'Registered business name', isRequired: true },
      { name: 'Entity Type', type: 'select', description: 'Business structure', options: ['Sole Proprietor', 'LLC', 'S-Corp', 'C-Corp', 'Partnership'], isRequired: true },
      { name: 'State', type: 'text', description: 'Registration state', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Research & Planning',
          description: 'Research requirements',
          tasks: [
            { title: 'Research business structures', description: 'Compare sole prop, LLC, etc.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['research'] },
            { title: 'Consult with accountant', description: 'Get tax implications advice.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['consultation'] },
            { title: 'Check name availability', description: 'Verify business name is available.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['research'] },
            { title: 'Understand state requirements', description: 'Learn local registration needs.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['research'] },
          ],
        },
        {
          name: 'Registration',
          description: 'Complete registration',
          tasks: [
            { title: 'File articles of organization', description: 'Submit LLC or corp paperwork.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['filing'] },
            { title: 'Apply for EIN', description: 'Get Employer Identification Number.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['tax'] },
            { title: 'Register for state taxes', description: 'Set up state tax accounts.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['tax'] },
            { title: 'Get business licenses', description: 'Apply for required licenses.', assigneeRole: 'owner', dueOffset: 17, priority: 'medium', labels: ['licensing'] },
          ],
        },
        {
          name: 'Post-Registration',
          description: 'Complete setup',
          tasks: [
            { title: 'Open business bank account', description: 'Set up dedicated banking.', assigneeRole: 'owner', dueOffset: 20, priority: 'high', labels: ['banking'] },
            { title: 'Set up accounting system', description: 'Configure bookkeeping.', assigneeRole: 'owner', dueOffset: 22, priority: 'high', labels: ['accounting'] },
            { title: 'Create operating agreement', description: 'Draft LLC operating agreement.', assigneeRole: 'owner', dueOffset: 25, priority: 'medium', labels: ['legal'] },
            { title: 'Get business insurance', description: 'Set up liability insurance.', assigneeRole: 'owner', dueOffset: 28, priority: 'medium', labels: ['insurance'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 25. BRAND BUILDING ====================
  {
    name: 'Brand Building',
    slug: 'brand-building',
    description:
      'Build a strong personal brand as a freelancer. Define your positioning, messaging, and visual identity.',
    category: 'freelance',
    icon: 'Star',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'discovery', name: 'Discovery', order: 0, color: '#6B7280' },
      { id: 'development', name: 'Development', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'launched', name: 'Launched', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Brand Name', type: 'text', description: 'Your brand name', isRequired: true },
      { name: 'Target Audience', type: 'text', description: 'Who you serve', isRequired: false },
      { name: 'Unique Value', type: 'text', description: 'What makes you different', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Brand Strategy',
          description: 'Define your brand',
          tasks: [
            { title: 'Define target audience', description: 'Identify ideal clients.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['strategy'] },
            { title: 'Identify unique value proposition', description: 'What makes you different.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['strategy'] },
            { title: 'Develop brand personality', description: 'Define voice and tone.', assigneeRole: 'owner', dueOffset: 5, priority: 'medium', labels: ['strategy'] },
            { title: 'Create positioning statement', description: 'Craft your brand message.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['messaging'] },
          ],
        },
        {
          name: 'Visual Identity',
          description: 'Create visual elements',
          tasks: [
            { title: 'Design logo', description: 'Create or commission a logo.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['design'] },
            { title: 'Choose brand colors', description: 'Select color palette.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['design'] },
            { title: 'Select typography', description: 'Choose brand fonts.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['design'] },
            { title: 'Create brand guidelines', description: 'Document visual standards.', assigneeRole: 'owner', dueOffset: 15, priority: 'medium', labels: ['documentation'] },
          ],
        },
        {
          name: 'Brand Launch',
          description: 'Deploy your brand',
          tasks: [
            { title: 'Update all platforms', description: 'Apply brand across channels.', assigneeRole: 'owner', dueOffset: 18, priority: 'high', labels: ['implementation'] },
            { title: 'Create branded templates', description: 'Proposals, invoices, emails.', assigneeRole: 'owner', dueOffset: 20, priority: 'medium', labels: ['templates'] },
            { title: 'Order business cards', description: 'Print marketing materials.', assigneeRole: 'owner', dueOffset: 22, priority: 'low', labels: ['materials'] },
            { title: 'Announce rebrand', description: 'Share your new brand.', assigneeRole: 'owner', dueOffset: 25, priority: 'medium', labels: ['promotion'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 26. WEBSITE LAUNCH ====================
  {
    name: 'Website Launch',
    slug: 'website-launch',
    description:
      'Launch your freelance portfolio website. Plan, build, and launch a professional web presence.',
    category: 'freelance',
    icon: 'Globe',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'testing', name: 'Testing', order: 3, color: '#8B5CF6' },
      { id: 'live', name: 'Live', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Domain', type: 'text', description: 'Website domain', isRequired: true },
      { name: 'Platform', type: 'select', description: 'Website platform', options: ['WordPress', 'Webflow', 'Squarespace', 'Custom', 'Framer', 'Other'], isRequired: false },
      { name: 'Launch Date', type: 'date', description: 'Target launch date', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan your website',
          tasks: [
            { title: 'Define website goals', description: 'What should the site achieve.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Plan site structure', description: 'Map out pages and navigation.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['planning'] },
            { title: 'Choose domain name', description: 'Register your domain.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['setup'] },
            { title: 'Select hosting platform', description: 'Choose where to host.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['setup'] },
          ],
        },
        {
          name: 'Design & Build',
          description: 'Create your website',
          tasks: [
            { title: 'Design homepage', description: 'Create main page layout.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['design'] },
            { title: 'Design inner pages', description: 'About, Services, Contact, etc.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['design'] },
            { title: 'Write website copy', description: 'Craft compelling content.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['content'] },
            { title: 'Add portfolio pieces', description: 'Showcase your work.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['portfolio'] },
            { title: 'Set up contact form', description: 'Enable client inquiries.', assigneeRole: 'owner', dueOffset: 15, priority: 'medium', labels: ['functionality'] },
          ],
        },
        {
          name: 'Launch',
          description: 'Test and go live',
          tasks: [
            { title: 'Test on all devices', description: 'Check mobile and desktop.', assigneeRole: 'owner', dueOffset: 18, priority: 'high', labels: ['testing'] },
            { title: 'Set up analytics', description: 'Add Google Analytics.', assigneeRole: 'owner', dueOffset: 19, priority: 'medium', labels: ['analytics'] },
            { title: 'Configure SEO', description: 'Optimize for search engines.', assigneeRole: 'owner', dueOffset: 20, priority: 'medium', labels: ['seo'] },
            { title: 'Launch website', description: 'Go live.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['launch'] },
            { title: 'Announce launch', description: 'Share on social media.', assigneeRole: 'owner', dueOffset: 22, priority: 'medium', labels: ['promotion'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 27. REFERRAL SYSTEM ====================
  {
    name: 'Referral System',
    slug: 'referral-system',
    description:
      'Build a referral system to generate consistent client referrals. Create incentives and nurture referral partners.',
    category: 'freelance',
    icon: 'Gift',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'active', name: 'Active', order: 1, color: '#3B82F6' },
      { id: 'tracking', name: 'Tracking', order: 2, color: '#F59E0B' },
      { id: 'rewarded', name: 'Rewarded', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Referrer Name', type: 'text', description: 'Who referred', isRequired: true },
      { name: 'Referred Client', type: 'text', description: 'New client name', isRequired: false },
      { name: 'Reward Type', type: 'select', description: 'Type of referral reward', options: ['Cash', 'Discount', 'Gift Card', 'Service Credit', 'Other'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'System Design',
          description: 'Create referral program',
          tasks: [
            { title: 'Define referral incentives', description: 'Decide on rewards for referrers.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Create referral terms', description: 'Document program rules.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['legal'] },
            { title: 'Design tracking system', description: 'How to track referrals.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['setup'] },
            { title: 'Create referral materials', description: 'Email templates and landing page.', assigneeRole: 'owner', dueOffset: 5, priority: 'medium', labels: ['marketing'] },
          ],
        },
        {
          name: 'Partner Outreach',
          description: 'Recruit referral partners',
          tasks: [
            { title: 'Identify potential partners', description: 'List people who can refer you.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['research'] },
            { title: 'Reach out to past clients', description: 'Ask satisfied clients to refer.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['outreach'] },
            { title: 'Connect with complementary freelancers', description: 'Partner with non-competing peers.', assigneeRole: 'owner', dueOffset: 12, priority: 'medium', labels: ['networking'] },
            { title: 'Share referral program details', description: 'Explain how program works.', assigneeRole: 'owner', dueOffset: 14, priority: 'high', labels: ['communication'] },
          ],
        },
        {
          name: 'Management',
          description: 'Manage referrals',
          tasks: [
            { title: 'Track incoming referrals', description: 'Log all referrals received.', assigneeRole: 'owner', dueOffset: 21, priority: 'high', labels: ['tracking'] },
            { title: 'Follow up on referral leads', description: 'Contact referred prospects.', assigneeRole: 'owner', dueOffset: 22, priority: 'high', labels: ['sales'] },
            { title: 'Deliver rewards promptly', description: 'Pay referral bonuses on time.', assigneeRole: 'owner', dueOffset: 30, priority: 'high', labels: ['rewards'] },
            { title: 'Thank referrers', description: 'Send appreciation message.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['relationship'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 28. UPWORK PROFILE ====================
  {
    name: 'Upwork Profile',
    slug: 'upwork-profile',
    description:
      'Optimize your Upwork profile to win more clients. Create a compelling presence on the platform.',
    category: 'freelance',
    icon: 'Briefcase',
    color: '#14A800',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'audit', name: 'Audit', order: 0, color: '#6B7280' },
      { id: 'optimization', name: 'Optimization', order: 1, color: '#3B82F6' },
      { id: 'testing', name: 'Testing', order: 2, color: '#F59E0B' },
      { id: 'optimized', name: 'Optimized', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Profile URL', type: 'text', description: 'Upwork profile link', isRequired: true },
      { name: 'Specialization', type: 'text', description: 'Primary skill category', isRequired: false },
      { name: 'Hourly Rate', type: 'number', description: 'Current hourly rate', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Profile Setup',
          description: 'Set up core profile',
          tasks: [
            { title: 'Write compelling title', description: 'Create attention-grabbing headline.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['profile'] },
            { title: 'Craft professional overview', description: 'Write your profile description.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['writing'] },
            { title: 'Upload professional photo', description: 'Add high-quality headshot.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['profile'] },
            { title: 'Set competitive rate', description: 'Research and set hourly rate.', assigneeRole: 'owner', dueOffset: 3, priority: 'high', labels: ['pricing'] },
          ],
        },
        {
          name: 'Portfolio & Skills',
          description: 'Showcase your work',
          tasks: [
            { title: 'Add portfolio items', description: 'Upload best work samples.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['portfolio'] },
            { title: 'Select relevant skills', description: 'Choose top skills for your niche.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['skills'] },
            { title: 'Take skill tests', description: 'Complete relevant assessments.', assigneeRole: 'owner', dueOffset: 8, priority: 'medium', labels: ['certification'] },
            { title: 'Add certifications', description: 'Include relevant credentials.', assigneeRole: 'owner', dueOffset: 9, priority: 'medium', labels: ['certification'] },
          ],
        },
        {
          name: 'Optimization',
          description: 'Improve visibility',
          tasks: [
            { title: 'Optimize for search', description: 'Use keywords in profile.', assigneeRole: 'owner', dueOffset: 10, priority: 'high', labels: ['seo'] },
            { title: 'Set availability status', description: 'Configure availability badge.', assigneeRole: 'owner', dueOffset: 11, priority: 'medium', labels: ['settings'] },
            { title: 'Enable profile boost', description: 'Consider Connects and boosts.', assigneeRole: 'owner', dueOffset: 12, priority: 'low', labels: ['promotion'] },
            { title: 'Request recommendations', description: 'Get endorsements from clients.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['social-proof'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 29. FIVERR GIG SETUP ====================
  {
    name: 'Fiverr Gig Setup',
    slug: 'fiverr-gig-setup',
    description:
      'Create and optimize Fiverr gigs to attract buyers. Set up compelling service offerings.',
    category: 'freelance',
    icon: 'ShoppingBag',
    color: '#1DBF73',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creating', name: 'Creating', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Gig Title', type: 'text', description: 'Gig name', isRequired: true },
      { name: 'Category', type: 'text', description: 'Fiverr category', isRequired: false },
      { name: 'Starting Price', type: 'number', description: 'Base gig price', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Gig Planning',
          description: 'Plan your gig',
          tasks: [
            { title: 'Research competition', description: 'Analyze top gigs in category.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['research'] },
            { title: 'Define gig service', description: 'Decide exactly what you offer.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['planning'] },
            { title: 'Plan pricing tiers', description: 'Create Basic, Standard, Premium.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['pricing'] },
            { title: 'List gig extras', description: 'Identify upsell opportunities.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['pricing'] },
          ],
        },
        {
          name: 'Gig Creation',
          description: 'Build your gig',
          tasks: [
            { title: 'Write gig title', description: 'Craft keyword-rich title.', assigneeRole: 'owner', dueOffset: 4, priority: 'high', labels: ['writing'] },
            { title: 'Create gig description', description: 'Write compelling copy.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['writing'] },
            { title: 'Design gig images', description: 'Create eye-catching thumbnails.', assigneeRole: 'owner', dueOffset: 7, priority: 'high', labels: ['design'] },
            { title: 'Create gig video', description: 'Record introduction video.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['video'] },
            { title: 'Set up FAQ', description: 'Answer common questions.', assigneeRole: 'owner', dueOffset: 8, priority: 'medium', labels: ['content'] },
          ],
        },
        {
          name: 'Launch & Optimize',
          description: 'Go live and improve',
          tasks: [
            { title: 'Publish gig', description: 'Make gig live.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['launch'] },
            { title: 'Share gig externally', description: 'Promote on social media.', assigneeRole: 'owner', dueOffset: 13, priority: 'medium', labels: ['promotion'] },
            { title: 'Monitor gig performance', description: 'Track impressions and clicks.', assigneeRole: 'owner', dueOffset: 20, priority: 'medium', labels: ['analytics'] },
            { title: 'Optimize based on data', description: 'Improve underperforming areas.', assigneeRole: 'owner', dueOffset: 30, priority: 'medium', labels: ['optimization'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },

  // ==================== 30. LINKEDIN OPTIMIZATION ====================
  {
    name: 'LinkedIn Optimization',
    slug: 'linkedin-optimization',
    description:
      'Optimize your LinkedIn profile for freelance success. Attract clients and build professional credibility.',
    category: 'freelance',
    icon: 'Linkedin',
    color: '#0A66C2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'audit', name: 'Audit', order: 0, color: '#6B7280' },
      { id: 'optimization', name: 'Optimization', order: 1, color: '#3B82F6' },
      { id: 'content', name: 'Content', order: 2, color: '#F59E0B' },
      { id: 'networking', name: 'Networking', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Profile URL', type: 'text', description: 'LinkedIn profile URL', isRequired: true },
      { name: 'Target Industry', type: 'text', description: 'Industries to target', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Profile Optimization',
          description: 'Optimize your profile',
          tasks: [
            { title: 'Write compelling headline', description: 'Create value-focused headline.', assigneeRole: 'owner', dueOffset: 0, priority: 'high', labels: ['profile'] },
            { title: 'Update About section', description: 'Craft engaging summary.', assigneeRole: 'owner', dueOffset: 2, priority: 'high', labels: ['writing'] },
            { title: 'Upload professional photo', description: 'Add high-quality headshot.', assigneeRole: 'owner', dueOffset: 1, priority: 'high', labels: ['profile'] },
            { title: 'Create custom banner', description: 'Design branded background.', assigneeRole: 'owner', dueOffset: 3, priority: 'medium', labels: ['design'] },
            { title: 'Update experience section', description: 'Highlight relevant work.', assigneeRole: 'owner', dueOffset: 5, priority: 'high', labels: ['profile'] },
          ],
        },
        {
          name: 'Visibility',
          description: 'Increase discoverability',
          tasks: [
            { title: 'Add relevant skills', description: 'Select top skills for endorsement.', assigneeRole: 'owner', dueOffset: 6, priority: 'high', labels: ['skills'] },
            { title: 'Request recommendations', description: 'Get client testimonials.', assigneeRole: 'owner', dueOffset: 8, priority: 'high', labels: ['social-proof'] },
            { title: 'Customize URL', description: 'Create clean profile URL.', assigneeRole: 'owner', dueOffset: 7, priority: 'medium', labels: ['profile'] },
            { title: 'Enable Open to Work', description: 'Set freelance preferences.', assigneeRole: 'owner', dueOffset: 9, priority: 'medium', labels: ['settings'] },
          ],
        },
        {
          name: 'Content Strategy',
          description: 'Build thought leadership',
          tasks: [
            { title: 'Plan content themes', description: 'Define topics to post about.', assigneeRole: 'owner', dueOffset: 10, priority: 'medium', labels: ['strategy'] },
            { title: 'Create first post', description: 'Publish valuable content.', assigneeRole: 'owner', dueOffset: 12, priority: 'high', labels: ['content'] },
            { title: 'Engage with industry content', description: 'Comment on relevant posts.', assigneeRole: 'owner', dueOffset: 14, priority: 'medium', labels: ['engagement'] },
            { title: 'Connect with target clients', description: 'Send personalized invites.', assigneeRole: 'owner', dueOffset: 17, priority: 'high', labels: ['networking'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: false, enableStoryPoints: false },
  },
];
