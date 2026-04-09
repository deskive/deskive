/**
 * HR & People Project Templates
 * Pre-built templates for hiring, onboarding, performance reviews, and team management
 */

export const HR_TEMPLATES = [
  // ==================== 1. EMPLOYEE ONBOARDING ====================
  {
    name: 'Employee Onboarding',
    slug: 'employee-onboarding',
    description:
      'Comprehensive 30-60-90 day onboarding program template. Ensure new hires have everything they need to succeed from day one.',
    category: 'hr',
    icon: 'UserPlus',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'pre_start', name: 'Pre-Start', order: 0, color: '#6B7280' },
      { id: 'week_1', name: 'Week 1', order: 1, color: '#3B82F6' },
      { id: 'month_1', name: 'Month 1', order: 2, color: '#F59E0B' },
      { id: 'month_2', name: 'Month 2', order: 3, color: '#8B5CF6' },
      { id: 'month_3', name: 'Month 3', order: 4, color: '#EC4899' },
      { id: 'completed', name: 'Completed', order: 5, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Department',
        type: 'select',
        description: 'Employee department',
        options: ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR', 'Product'],
        isRequired: true,
      },
      {
        name: 'Start Date',
        type: 'date',
        description: 'Employee start date',
        isRequired: true,
      },
      {
        name: 'Buddy',
        type: 'text',
        description: 'Assigned onboarding buddy',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Start Setup',
          description: 'Preparations before day one',
          tasks: [
            {
              title: 'IT setup and equipment',
              description:
                'Order and configure laptop, accounts, and access.',
              assigneeRole: 'lead',
              dueOffset: -5,
              priority: 'high',
              labels: ['it', 'setup'],
              subtasks: [
                { title: 'Order laptop/equipment' },
                { title: 'Create email account' },
                { title: 'Setup software licenses' },
                { title: 'Configure VPN access' },
              ],
            },
            {
              title: 'Prepare workstation',
              description:
                'Set up desk, chair, monitors, and office supplies.',
              assigneeRole: 'member',
              dueOffset: -2,
              priority: 'medium',
              labels: ['facilities', 'setup'],
            },
            {
              title: 'Send welcome package',
              description:
                'Send welcome email with first day details and company swag.',
              assigneeRole: 'lead',
              dueOffset: -3,
              priority: 'high',
              labels: ['welcome', 'communication'],
            },
            {
              title: 'Schedule first week meetings',
              description:
                'Set up intro meetings with team and key stakeholders.',
              assigneeRole: 'lead',
              dueOffset: -2,
              priority: 'high',
              labels: ['calendar', 'meetings'],
            },
            {
              title: 'Assign onboarding buddy',
              description:
                'Pair new hire with experienced team member.',
              assigneeRole: 'lead',
              dueOffset: -5,
              priority: 'high',
              labels: ['buddy', 'support'],
            },
          ],
        },
        {
          name: 'First Week',
          description: 'Days 1-5: Orientation and basics',
          tasks: [
            {
              title: 'Day 1: Welcome and orientation',
              description:
                'Welcome session, office tour, and team introductions.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['orientation', 'day1'],
              subtasks: [
                { title: 'Office tour' },
                { title: 'Team introductions' },
                { title: 'HR paperwork completion' },
                { title: 'Benefits enrollment' },
              ],
            },
            {
              title: 'IT and tools setup',
              description:
                'Get all systems, tools, and access configured.',
              assigneeRole: 'member',
              dueOffset: 1,
              priority: 'high',
              labels: ['it', 'tools'],
              subtasks: [
                { title: 'Login to all systems' },
                { title: 'Install required software' },
                { title: 'Join communication channels' },
              ],
            },
            {
              title: 'Company overview session',
              description:
                'Learn about company history, mission, values, and culture.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['culture', 'training'],
            },
            {
              title: 'Product/service deep dive',
              description:
                'Comprehensive overview of products and services.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['product', 'training'],
            },
            {
              title: 'First week check-in',
              description:
                'Manager check-in to address questions and concerns.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['check-in', 'feedback'],
            },
          ],
        },
        {
          name: 'First Month (Days 6-30)',
          description: 'Building competence and connections',
          tasks: [
            {
              title: 'Department-specific training',
              description:
                'Complete role-specific training and certifications.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['training', 'role-specific'],
            },
            {
              title: 'Shadow team members',
              description:
                'Observe experienced colleagues in their daily work.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['learning', 'shadow'],
            },
            {
              title: 'First small project/task',
              description:
                'Assign first independent work with close support.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['project', 'hands-on'],
            },
            {
              title: '30-day check-in',
              description:
                'Formal review of progress and feedback session.',
              assigneeRole: 'lead',
              dueOffset: 30,
              priority: 'high',
              labels: ['review', 'feedback'],
              subtasks: [
                { title: 'Review initial goals' },
                { title: 'Discuss challenges' },
                { title: 'Set 60-day objectives' },
              ],
            },
          ],
        },
        {
          name: 'Second Month (Days 31-60)',
          description: 'Increasing responsibility',
          tasks: [
            {
              title: 'Own independent projects',
              description:
                'Take ownership of projects with moderate supervision.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['project', 'ownership'],
            },
            {
              title: 'Cross-functional collaboration',
              description:
                'Begin working with other teams and departments.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'medium',
              labels: ['collaboration', 'cross-team'],
            },
            {
              title: '60-day review',
              description:
                'Mid-point progress review and goal adjustment.',
              assigneeRole: 'lead',
              dueOffset: 60,
              priority: 'high',
              labels: ['review', 'feedback'],
            },
          ],
        },
        {
          name: 'Third Month (Days 61-90)',
          description: 'Full integration',
          tasks: [
            {
              title: 'Full project ownership',
              description:
                'Lead projects independently with minimal oversight.',
              assigneeRole: 'member',
              dueOffset: 75,
              priority: 'high',
              labels: ['project', 'leadership'],
            },
            {
              title: 'Contribute to team improvement',
              description:
                'Identify and suggest process improvements.',
              assigneeRole: 'member',
              dueOffset: 80,
              priority: 'medium',
              labels: ['improvement', 'contribution'],
            },
            {
              title: '90-day performance review',
              description:
                'Comprehensive review and transition out of onboarding.',
              assigneeRole: 'lead',
              dueOffset: 90,
              priority: 'high',
              labels: ['review', 'completion'],
              subtasks: [
                { title: 'Review all objectives' },
                { title: 'Discuss career development' },
                { title: 'Set ongoing goals' },
                { title: 'Complete onboarding checklist' },
              ],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['pre_start', 'week_1', 'month_1', 'month_2', 'month_3', 'completed'],
      },
    },
    settings: {
      trackProgress: true,
      notifyManager: true,
    },
  },

  // ==================== 2. RECRUITMENT PIPELINE ====================
  {
    name: 'Recruitment Pipeline',
    slug: 'recruitment-pipeline',
    description:
      'Manage the entire hiring process from job posting to offer acceptance. Track candidates and coordinate interviews efficiently.',
    category: 'hr',
    icon: 'Users',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'sourcing', name: 'Sourcing', order: 0, color: '#6B7280' },
      { id: 'screening', name: 'Screening', order: 1, color: '#3B82F6' },
      { id: 'interview', name: 'Interview', order: 2, color: '#F59E0B' },
      { id: 'assessment', name: 'Assessment', order: 3, color: '#8B5CF6' },
      { id: 'offer', name: 'Offer', order: 4, color: '#EC4899' },
      { id: 'hired', name: 'Hired', order: 5, color: '#10B981' },
      { id: 'rejected', name: 'Rejected', order: 6, color: '#EF4444' },
    ],
    customFields: [
      {
        name: 'Position',
        type: 'text',
        description: 'Job title being hired for',
        isRequired: true,
      },
      {
        name: 'Department',
        type: 'select',
        description: 'Hiring department',
        options: ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR', 'Product'],
        isRequired: true,
      },
      {
        name: 'Urgency',
        type: 'select',
        description: 'Hiring urgency',
        options: ['Critical', 'High', 'Medium', 'Low'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Job Preparation',
          description: 'Define role and requirements',
          tasks: [
            {
              title: 'Define job requirements',
              description:
                'Work with hiring manager to define role requirements.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'requirements'],
              subtasks: [
                { title: 'Meet with hiring manager' },
                { title: 'Define must-have skills' },
                { title: 'Define nice-to-have skills' },
                { title: 'Set compensation range' },
              ],
            },
            {
              title: 'Write job description',
              description:
                'Create compelling job description and posting.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['content', 'job-posting'],
            },
            {
              title: 'Design interview process',
              description:
                'Define interview stages, questions, and evaluators.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'interview'],
            },
            {
              title: 'Post job opening',
              description:
                'Publish job on company site and job boards.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['posting', 'sourcing'],
            },
          ],
        },
        {
          name: 'Sourcing',
          description: 'Find qualified candidates',
          tasks: [
            {
              title: 'Source candidates via LinkedIn',
              description:
                'Proactively reach out to potential candidates.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['sourcing', 'outreach'],
            },
            {
              title: 'Review referrals',
              description:
                'Process employee referrals for the position.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['sourcing', 'referrals'],
            },
            {
              title: 'Engage recruitment agencies',
              description:
                'Brief external recruiters if applicable.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'medium',
              labels: ['sourcing', 'agencies'],
            },
          ],
        },
        {
          name: 'Screening & Interviews',
          description: 'Evaluate candidates',
          tasks: [
            {
              title: 'Resume screening',
              description:
                'Review applications and shortlist candidates.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['screening', 'review'],
            },
            {
              title: 'Phone screening calls',
              description:
                'Conduct initial phone screens with shortlisted candidates.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['screening', 'calls'],
            },
            {
              title: 'Technical assessment',
              description:
                'Send and evaluate technical assessments.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'high',
              labels: ['assessment', 'technical'],
            },
            {
              title: 'Interview scheduling',
              description:
                'Coordinate interview schedules with candidates and panel.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['scheduling', 'coordination'],
            },
            {
              title: 'Conduct interviews',
              description:
                'Run interview rounds with hiring panel.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['interview', 'evaluation'],
            },
          ],
        },
        {
          name: 'Decision & Offer',
          description: 'Select and onboard',
          tasks: [
            {
              title: 'Debrief and decision',
              description:
                'Collect feedback and make hiring decision.',
              assigneeRole: 'lead',
              dueOffset: 30,
              priority: 'high',
              labels: ['decision', 'review'],
              subtasks: [
                { title: 'Collect interviewer feedback' },
                { title: 'Discuss candidates' },
                { title: 'Make final decision' },
              ],
            },
            {
              title: 'Reference checks',
              description:
                'Conduct reference checks for final candidate.',
              assigneeRole: 'member',
              dueOffset: 32,
              priority: 'high',
              labels: ['verification', 'reference'],
            },
            {
              title: 'Prepare offer',
              description:
                'Prepare compensation package and offer letter.',
              assigneeRole: 'lead',
              dueOffset: 33,
              priority: 'high',
              labels: ['offer', 'compensation'],
            },
            {
              title: 'Extend offer',
              description:
                'Present offer to candidate and negotiate if needed.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['offer', 'negotiation'],
            },
            {
              title: 'Rejected candidate communication',
              description:
                'Send respectful rejection emails to unsuccessful candidates.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'medium',
              labels: ['communication', 'rejection'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['sourcing', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'],
      },
    },
    settings: {
      trackTimeline: true,
      candidateTracking: true,
    },
  },

  // ==================== 3. PERFORMANCE REVIEW CYCLE ====================
  {
    name: 'Performance Review Cycle',
    slug: 'performance-review-cycle',
    description:
      'Quarterly or annual performance review process template. Includes self-assessments, manager reviews, peer feedback, and calibration.',
    category: 'hr',
    icon: 'BarChart2',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'self_review', name: 'Self Review', order: 1, color: '#3B82F6' },
      { id: 'manager_review', name: 'Manager Review', order: 2, color: '#F59E0B' },
      { id: 'calibration', name: 'Calibration', order: 3, color: '#8B5CF6' },
      { id: 'delivery', name: 'Delivery', order: 4, color: '#EC4899' },
      { id: 'completed', name: 'Completed', order: 5, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Review Period',
        type: 'select',
        description: 'Performance period being reviewed',
        options: ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'Annual'],
        isRequired: true,
      },
      {
        name: 'Review Type',
        type: 'select',
        description: 'Type of review',
        options: ['Quarterly Check-in', 'Mid-Year', 'Annual', 'Probation'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Preparation',
          description: 'Setup and communications',
          tasks: [
            {
              title: 'Announce review cycle',
              description:
                'Communicate timeline and expectations to all employees.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['communication', 'kickoff'],
            },
            {
              title: 'Prepare review templates',
              description:
                'Update and distribute review forms and guidelines.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['preparation', 'templates'],
            },
            {
              title: 'Train managers on process',
              description:
                'Brief managers on review process and calibration.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['training', 'managers'],
            },
          ],
        },
        {
          name: 'Self-Assessment Phase',
          description: 'Employee self-reviews',
          tasks: [
            {
              title: 'Launch self-assessment',
              description:
                'Open self-assessment forms for all employees.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['launch', 'self-review'],
            },
            {
              title: 'Send reminders',
              description:
                'Send reminder emails for incomplete self-assessments.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['reminders', 'follow-up'],
            },
            {
              title: 'Self-assessment deadline',
              description:
                'Ensure all self-assessments are completed.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['deadline', 'self-review'],
            },
          ],
        },
        {
          name: 'Manager Review Phase',
          description: 'Manager evaluations and feedback',
          tasks: [
            {
              title: 'Managers complete reviews',
              description:
                'Managers write performance reviews for direct reports.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['manager-review', 'evaluation'],
            },
            {
              title: 'Gather peer feedback',
              description:
                'Collect 360 feedback from peers if applicable.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'medium',
              labels: ['peer-feedback', '360'],
            },
            {
              title: 'Manager review deadline',
              description:
                'Ensure all manager reviews are completed.',
              assigneeRole: 'lead',
              dueOffset: 24,
              priority: 'high',
              labels: ['deadline', 'manager-review'],
            },
          ],
        },
        {
          name: 'Calibration',
          description: 'Align ratings across teams',
          tasks: [
            {
              title: 'Calibration sessions',
              description:
                'Conduct calibration meetings to ensure consistency.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['calibration', 'meeting'],
              subtasks: [
                { title: 'Schedule calibration meetings' },
                { title: 'Review rating distributions' },
                { title: 'Discuss edge cases' },
                { title: 'Finalize ratings' },
              ],
            },
            {
              title: 'Compensation decisions',
              description:
                'Make compensation adjustment decisions based on reviews.',
              assigneeRole: 'lead',
              dueOffset: 30,
              priority: 'high',
              labels: ['compensation', 'decisions'],
            },
          ],
        },
        {
          name: 'Delivery',
          description: 'Share reviews with employees',
          tasks: [
            {
              title: 'Manager training on delivery',
              description:
                'Train managers on delivering effective feedback.',
              assigneeRole: 'lead',
              dueOffset: 32,
              priority: 'high',
              labels: ['training', 'delivery'],
            },
            {
              title: 'Deliver reviews',
              description:
                'Managers deliver reviews to direct reports.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['delivery', 'feedback'],
            },
            {
              title: 'Goal setting for next period',
              description:
                'Set objectives for the upcoming review period.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['goals', 'planning'],
            },
            {
              title: 'Cycle retrospective',
              description:
                'Review the process and identify improvements.',
              assigneeRole: 'lead',
              dueOffset: 45,
              priority: 'medium',
              labels: ['retrospective', 'improvement'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['preparation', 'self_review', 'manager_review', 'calibration', 'delivery', 'completed'],
      },
    },
    settings: {
      confidential: true,
      recurring: true,
    },
  },

  // ==================== 4. TEAM OFFSITE PLANNING ====================
  {
    name: 'Team Offsite Planning',
    slug: 'team-offsite-planning',
    description:
      'Plan and execute memorable team offsites or retreats. From venue selection to agenda creation and follow-up.',
    category: 'hr',
    icon: 'MapPin',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'logistics', name: 'Logistics', order: 1, color: '#3B82F6' },
      { id: 'content', name: 'Content', order: 2, color: '#F59E0B' },
      { id: 'execution', name: 'Execution', order: 3, color: '#8B5CF6' },
      { id: 'follow_up', name: 'Follow-up', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Team Size',
        type: 'number',
        description: 'Number of attendees',
        isRequired: true,
      },
      {
        name: 'Budget',
        type: 'text',
        description: 'Total budget for offsite',
        isRequired: false,
      },
      {
        name: 'Location Type',
        type: 'select',
        description: 'Type of venue',
        options: ['Local', 'Domestic Travel', 'International'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Initial planning and goals',
          tasks: [
            {
              title: 'Define offsite objectives',
              description:
                'Set clear goals for what the offsite should achieve.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'objectives'],
            },
            {
              title: 'Set budget',
              description:
                'Determine and get approval for offsite budget.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['budget', 'approval'],
            },
            {
              title: 'Choose dates',
              description:
                'Select dates that work for all attendees.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'scheduling'],
            },
            {
              title: 'Gather input from team',
              description:
                'Survey team for preferences and ideas.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'medium',
              labels: ['survey', 'input'],
            },
          ],
        },
        {
          name: 'Logistics',
          description: 'Venue, travel, and accommodations',
          tasks: [
            {
              title: 'Research and book venue',
              description:
                'Find and reserve venue for offsite.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['venue', 'booking'],
              subtasks: [
                { title: 'Research venue options' },
                { title: 'Get quotes' },
                { title: 'Site visit if needed' },
                { title: 'Book venue' },
              ],
            },
            {
              title: 'Arrange travel',
              description:
                'Book flights/transportation for attendees.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['travel', 'booking'],
            },
            {
              title: 'Book accommodations',
              description:
                'Reserve hotel rooms or lodging.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['accommodation', 'booking'],
            },
            {
              title: 'Plan meals and catering',
              description:
                'Arrange food and beverages for the event.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['catering', 'food'],
            },
          ],
        },
        {
          name: 'Agenda & Content',
          description: 'Program and activities',
          tasks: [
            {
              title: 'Create detailed agenda',
              description:
                'Plan out schedule and sessions.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['agenda', 'planning'],
            },
            {
              title: 'Plan team building activities',
              description:
                'Organize team bonding activities.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['activities', 'team-building'],
            },
            {
              title: 'Prepare presentation materials',
              description:
                'Create slides and materials for sessions.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['content', 'presentations'],
            },
            {
              title: 'Send pre-read materials',
              description:
                'Distribute any pre-work to attendees.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'medium',
              labels: ['communication', 'pre-work'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Run the offsite',
          tasks: [
            {
              title: 'Final logistics check',
              description:
                'Confirm all bookings and arrangements.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['logistics', 'verification'],
            },
            {
              title: 'Run offsite sessions',
              description:
                'Facilitate and execute planned sessions.',
              assigneeRole: 'lead',
              dueOffset: 42,
              priority: 'high',
              labels: ['execution', 'facilitation'],
            },
            {
              title: 'Document outcomes',
              description:
                'Capture key decisions and action items.',
              assigneeRole: 'member',
              dueOffset: 44,
              priority: 'high',
              labels: ['documentation', 'outcomes'],
            },
          ],
        },
        {
          name: 'Follow-up',
          description: 'Post-offsite activities',
          tasks: [
            {
              title: 'Distribute summary and action items',
              description:
                'Share outcomes and next steps with team.',
              assigneeRole: 'lead',
              dueOffset: 49,
              priority: 'high',
              labels: ['follow-up', 'communication'],
            },
            {
              title: 'Collect feedback',
              description:
                'Survey attendees on offsite experience.',
              assigneeRole: 'member',
              dueOffset: 49,
              priority: 'medium',
              labels: ['feedback', 'survey'],
            },
            {
              title: 'Process expenses',
              description:
                'Handle reimbursements and close out budget.',
              assigneeRole: 'member',
              dueOffset: 56,
              priority: 'medium',
              labels: ['finance', 'expenses'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'logistics', 'content', 'execution', 'follow_up'],
      },
    },
    settings: {
      budgetTracking: true,
      attendeeManagement: true,
    },
  },

  // ==================== 5. EMPLOYEE EXIT PROCESS ====================
  {
    name: 'Employee Exit Process',
    slug: 'employee-exit-process',
    description:
      'Structured offboarding checklist ensuring smooth transitions. Covers knowledge transfer, access removal, and exit interviews.',
    category: 'hr',
    icon: 'LogOut',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'notification', name: 'Notification', order: 0, color: '#6B7280' },
      { id: 'transition', name: 'Transition', order: 1, color: '#3B82F6' },
      { id: 'final_week', name: 'Final Week', order: 2, color: '#F59E0B' },
      { id: 'last_day', name: 'Last Day', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Exit Type',
        type: 'select',
        description: 'Type of departure',
        options: ['Resignation', 'Termination', 'Retirement', 'Contract End', 'Layoff'],
        isRequired: true,
      },
      {
        name: 'Last Day',
        type: 'date',
        description: 'Employee last working day',
        isRequired: true,
      },
      {
        name: 'Rehire Eligible',
        type: 'checkbox',
        description: 'Eligible for rehire',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Initial Steps',
          description: 'Upon receiving resignation',
          tasks: [
            {
              title: 'Process resignation/termination',
              description:
                'Document and process the separation.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['admin', 'documentation'],
            },
            {
              title: 'Notify relevant stakeholders',
              description:
                'Inform HR, IT, Finance, and management.',
              assigneeRole: 'lead',
              dueOffset: 1,
              priority: 'high',
              labels: ['communication', 'notification'],
            },
            {
              title: 'Develop transition plan',
              description:
                'Plan for knowledge transfer and coverage.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'transition'],
            },
          ],
        },
        {
          name: 'Knowledge Transfer',
          description: 'Document and transfer knowledge',
          tasks: [
            {
              title: 'Document key responsibilities',
              description:
                'Create documentation of processes and responsibilities.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['documentation', 'knowledge'],
            },
            {
              title: 'Transition projects',
              description:
                'Hand off ongoing projects to team members.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['transition', 'projects'],
            },
            {
              title: 'Transfer client relationships',
              description:
                'Introduce replacements to key contacts.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['transition', 'relationships'],
            },
            {
              title: 'Train replacement/team',
              description:
                'Provide training on critical tasks.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['training', 'knowledge'],
            },
          ],
        },
        {
          name: 'Administrative Tasks',
          description: 'HR and admin processes',
          tasks: [
            {
              title: 'Calculate final pay',
              description:
                'Process final paycheck, PTO payout, bonuses.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['finance', 'payroll'],
            },
            {
              title: 'Benefits termination',
              description:
                'Process benefits termination and COBRA.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['benefits', 'admin'],
            },
            {
              title: 'Exit interview',
              description:
                'Conduct exit interview for feedback.',
              assigneeRole: 'lead',
              dueOffset: 12,
              priority: 'medium',
              labels: ['interview', 'feedback'],
            },
          ],
        },
        {
          name: 'Last Day Activities',
          description: 'Final day checklist',
          tasks: [
            {
              title: 'Collect company property',
              description:
                'Retrieve laptop, badge, keys, and equipment.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['property', 'collection'],
              subtasks: [
                { title: 'Collect laptop' },
                { title: 'Collect access badge' },
                { title: 'Collect keys' },
                { title: 'Collect any other equipment' },
              ],
            },
            {
              title: 'Revoke system access',
              description:
                'Remove all system and building access.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['it', 'security'],
              subtasks: [
                { title: 'Disable email account' },
                { title: 'Revoke system access' },
                { title: 'Remove from groups/channels' },
                { title: 'Disable badge access' },
              ],
            },
            {
              title: 'Complete separation paperwork',
              description:
                'Ensure all exit documents are signed.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['documentation', 'legal'],
            },
            {
              title: 'Send farewell communication',
              description:
                'Share appropriate announcement to team.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'medium',
              labels: ['communication', 'announcement'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['notification', 'transition', 'final_week', 'last_day', 'completed'],
      },
    },
    settings: {
      confidential: true,
      complianceRequired: true,
    },
  },

  // ==================== 6. NEW HIRE ORIENTATION ====================
  {
    name: 'New Hire Orientation',
    slug: 'new-hire-orientation',
    description:
      'Structured orientation program for new employees covering company policies, culture, and essential information.',
    category: 'hr',
    icon: 'GraduationCap',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'scheduled', name: 'Scheduled', order: 0, color: '#6B7280' },
      { id: 'day_1', name: 'Day 1', order: 1, color: '#3B82F6' },
      { id: 'day_2', name: 'Day 2', order: 2, color: '#F59E0B' },
      { id: 'follow_up', name: 'Follow-up', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Cohort', type: 'text', description: 'Orientation cohort name', isRequired: false },
      { name: 'Orientation Date', type: 'date', description: 'Start date of orientation', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Orientation Prep',
          description: 'Prepare materials and logistics',
          tasks: [
            { title: 'Prepare orientation packets', description: 'Print and assemble welcome materials.', assigneeRole: 'member', dueOffset: -3, priority: 'high', labels: ['preparation'] },
            { title: 'Setup training room', description: 'Configure AV equipment and seating.', assigneeRole: 'member', dueOffset: -1, priority: 'medium', labels: ['logistics'] },
            { title: 'Send calendar invites', description: 'Invite all new hires to orientation sessions.', assigneeRole: 'member', dueOffset: -5, priority: 'high', labels: ['communication'] },
            { title: 'Coordinate with presenters', description: 'Confirm all speakers and their time slots.', assigneeRole: 'lead', dueOffset: -3, priority: 'high', labels: ['coordination'] },
          ],
        },
        {
          name: 'Day 1 Sessions',
          description: 'First day orientation activities',
          tasks: [
            { title: 'Welcome and introductions', description: 'Executive welcome and team introductions.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['welcome'] },
            { title: 'Company history and mission', description: 'Present company background and values.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['culture'] },
            { title: 'HR policies overview', description: 'Cover key HR policies and procedures.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['policy'] },
            { title: 'Benefits enrollment session', description: 'Walk through benefits options and enrollment.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['benefits'] },
          ],
        },
        {
          name: 'Day 2 Sessions',
          description: 'Second day orientation activities',
          tasks: [
            { title: 'IT systems training', description: 'Train on essential software and tools.', assigneeRole: 'member', dueOffset: 1, priority: 'high', labels: ['training', 'it'] },
            { title: 'Security and compliance', description: 'Cover security protocols and compliance requirements.', assigneeRole: 'member', dueOffset: 1, priority: 'high', labels: ['security'] },
            { title: 'Department introductions', description: 'Meet with department heads.', assigneeRole: 'lead', dueOffset: 1, priority: 'medium', labels: ['introductions'] },
            { title: 'Q&A session', description: 'Open forum for questions.', assigneeRole: 'lead', dueOffset: 1, priority: 'medium', labels: ['engagement'] },
          ],
        },
        {
          name: 'Post-Orientation',
          description: 'Follow-up activities',
          tasks: [
            { title: 'Collect feedback surveys', description: 'Gather feedback on orientation experience.', assigneeRole: 'member', dueOffset: 3, priority: 'medium', labels: ['feedback'] },
            { title: '30-day check-in scheduling', description: 'Schedule follow-up meetings with new hires.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['follow-up'] },
            { title: 'Update orientation materials', description: 'Incorporate feedback for next cohort.', assigneeRole: 'lead', dueOffset: 7, priority: 'low', labels: ['improvement'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['scheduled', 'day_1', 'day_2', 'follow_up', 'completed'] },
    },
    settings: { trackAttendance: true },
  },

  // ==================== 7. REMOTE ONBOARDING ====================
  {
    name: 'Remote Onboarding',
    slug: 'remote-onboarding',
    description:
      'Specialized onboarding program for remote employees ensuring they feel connected and equipped to work from anywhere.',
    category: 'hr',
    icon: 'Wifi',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'pre_start', name: 'Pre-Start', order: 0, color: '#6B7280' },
      { id: 'week_1', name: 'Week 1', order: 1, color: '#3B82F6' },
      { id: 'week_2', name: 'Week 2', order: 2, color: '#F59E0B' },
      { id: 'month_1', name: 'Month 1', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Time Zone', type: 'text', description: 'Employee time zone', isRequired: true },
      { name: 'Equipment Shipped', type: 'checkbox', description: 'Equipment has been shipped', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Start Setup',
          description: 'Remote work preparation',
          tasks: [
            { title: 'Ship equipment', description: 'Send laptop, monitors, and peripherals to employee.', assigneeRole: 'member', dueOffset: -7, priority: 'high', labels: ['equipment', 'shipping'] },
            { title: 'Setup remote access', description: 'Configure VPN and remote desktop access.', assigneeRole: 'member', dueOffset: -3, priority: 'high', labels: ['it', 'access'] },
            { title: 'Create collaboration accounts', description: 'Setup Slack, Zoom, and project management tools.', assigneeRole: 'member', dueOffset: -3, priority: 'high', labels: ['tools'] },
            { title: 'Send welcome package', description: 'Ship company swag and welcome materials.', assigneeRole: 'member', dueOffset: -5, priority: 'medium', labels: ['welcome'] },
          ],
        },
        {
          name: 'Virtual First Week',
          description: 'Online orientation and setup',
          tasks: [
            { title: 'Virtual welcome meeting', description: 'Video call with manager and team.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['welcome', 'video'] },
            { title: 'IT setup support call', description: 'Help configure all systems and troubleshoot.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['it', 'support'] },
            { title: 'Virtual office tour', description: 'Online walkthrough of digital workspace.', assigneeRole: 'member', dueOffset: 1, priority: 'medium', labels: ['orientation'] },
            { title: 'Communication norms training', description: 'Cover async communication best practices.', assigneeRole: 'lead', dueOffset: 2, priority: 'high', labels: ['training', 'communication'] },
          ],
        },
        {
          name: 'Building Connections',
          description: 'Establish remote relationships',
          tasks: [
            { title: 'Virtual coffee chats', description: 'Schedule informal video calls with team members.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['networking'] },
            { title: 'Assign remote buddy', description: 'Pair with experienced remote worker.', assigneeRole: 'lead', dueOffset: 2, priority: 'high', labels: ['buddy'] },
            { title: 'Join virtual team events', description: 'Participate in online team building activities.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['team-building'] },
          ],
        },
        {
          name: 'Remote Work Mastery',
          description: 'Develop remote work skills',
          tasks: [
            { title: 'Time management training', description: 'Learn productivity techniques for remote work.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['training'] },
            { title: 'Home office setup review', description: 'Ensure ergonomic and productive workspace.', assigneeRole: 'member', dueOffset: 10, priority: 'medium', labels: ['ergonomics'] },
            { title: '30-day virtual check-in', description: 'Video call to review progress and address concerns.', assigneeRole: 'lead', dueOffset: 30, priority: 'high', labels: ['review'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['pre_start', 'week_1', 'week_2', 'month_1', 'completed'] },
    },
    settings: { remoteFirst: true },
  },

  // ==================== 8. INTERNSHIP PROGRAM ====================
  {
    name: 'Internship Program',
    slug: 'internship-program',
    description:
      'Comprehensive internship program management from recruitment to completion, including projects and mentorship.',
    category: 'hr',
    icon: 'Award',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'recruitment', name: 'Recruitment', order: 0, color: '#6B7280' },
      { id: 'onboarding', name: 'Onboarding', order: 1, color: '#3B82F6' },
      { id: 'mid_program', name: 'Mid-Program', order: 2, color: '#F59E0B' },
      { id: 'final_weeks', name: 'Final Weeks', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Program Duration', type: 'select', description: 'Length of internship', options: ['8 weeks', '10 weeks', '12 weeks', '6 months'], isRequired: true },
      { name: 'Department', type: 'select', description: 'Intern department', options: ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR', 'Product'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Setup',
          description: 'Design and launch internship program',
          tasks: [
            { title: 'Define program structure', description: 'Create curriculum and milestone schedule.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Recruit interns', description: 'Post positions and conduct interviews.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['recruitment'] },
            { title: 'Assign mentors', description: 'Match interns with experienced mentors.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['mentorship'] },
            { title: 'Prepare intern projects', description: 'Define meaningful project assignments.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['projects'] },
          ],
        },
        {
          name: 'Intern Onboarding',
          description: 'Welcome and orient interns',
          tasks: [
            { title: 'Intern orientation day', description: 'Welcome session and company overview.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['orientation'] },
            { title: 'Setup workstations', description: 'Prepare laptops and access for all interns.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['setup'] },
            { title: 'Introduce team and culture', description: 'Team meet-and-greets and culture sessions.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['culture'] },
            { title: 'Assign initial tasks', description: 'Give interns their first assignments.', assigneeRole: 'lead', dueOffset: 30, priority: 'high', labels: ['projects'] },
          ],
        },
        {
          name: 'Mid-Program Activities',
          description: 'Ongoing development and check-ins',
          tasks: [
            { title: 'Midpoint review', description: 'Formal feedback session with each intern.', assigneeRole: 'lead', dueOffset: 56, priority: 'high', labels: ['review'] },
            { title: 'Lunch and learn sessions', description: 'Educational sessions with different departments.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['learning'] },
            { title: 'Intern social events', description: 'Team building activities for intern cohort.', assigneeRole: 'member', dueOffset: 49, priority: 'medium', labels: ['events'] },
          ],
        },
        {
          name: 'Program Completion',
          description: 'Final presentations and wrap-up',
          tasks: [
            { title: 'Final project presentations', description: 'Interns present their work to leadership.', assigneeRole: 'lead', dueOffset: 77, priority: 'high', labels: ['presentation'] },
            { title: 'Performance evaluations', description: 'Complete evaluations for each intern.', assigneeRole: 'lead', dueOffset: 80, priority: 'high', labels: ['evaluation'] },
            { title: 'Return offer decisions', description: 'Determine full-time offers for top performers.', assigneeRole: 'lead', dueOffset: 82, priority: 'high', labels: ['offers'] },
            { title: 'Exit surveys and feedback', description: 'Collect intern feedback on program.', assigneeRole: 'member', dueOffset: 84, priority: 'medium', labels: ['feedback'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['recruitment', 'onboarding', 'mid_program', 'final_weeks', 'completed'] },
    },
    settings: { cohortBased: true },
  },

  // ==================== 9. GRADUATE PROGRAM ====================
  {
    name: 'Graduate Program',
    slug: 'graduate-program',
    description:
      'Rotational graduate development program with multiple department placements and accelerated learning paths.',
    category: 'hr',
    icon: 'TrendingUp',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'recruitment', name: 'Recruitment', order: 0, color: '#6B7280' },
      { id: 'rotation_1', name: 'Rotation 1', order: 1, color: '#3B82F6' },
      { id: 'rotation_2', name: 'Rotation 2', order: 2, color: '#F59E0B' },
      { id: 'rotation_3', name: 'Rotation 3', order: 3, color: '#8B5CF6' },
      { id: 'placement', name: 'Placement', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Program Track', type: 'select', description: 'Graduate program track', options: ['General Management', 'Technical', 'Finance', 'Operations'], isRequired: true },
      { name: 'Cohort Year', type: 'text', description: 'Graduate cohort year', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Launch',
          description: 'Onboard graduate cohort',
          tasks: [
            { title: 'Graduate orientation week', description: 'Comprehensive company and program introduction.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['orientation'] },
            { title: 'Assign executive sponsors', description: 'Match graduates with senior mentors.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['mentorship'] },
            { title: 'Create development plans', description: 'Individual development plans for each graduate.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['development'] },
          ],
        },
        {
          name: 'First Rotation',
          description: 'First department placement',
          tasks: [
            { title: 'Rotation 1 kickoff', description: 'Start first department rotation.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['rotation'] },
            { title: 'Set rotation objectives', description: 'Define goals for first rotation.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['goals'] },
            { title: 'Monthly progress reviews', description: 'Regular check-ins during rotation.', assigneeRole: 'lead', dueOffset: 45, priority: 'medium', labels: ['review'] },
            { title: 'Rotation 1 evaluation', description: 'Assess performance in first rotation.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['evaluation'] },
          ],
        },
        {
          name: 'Second Rotation',
          description: 'Second department placement',
          tasks: [
            { title: 'Rotation 2 kickoff', description: 'Transition to second department.', assigneeRole: 'member', dueOffset: 95, priority: 'high', labels: ['rotation'] },
            { title: 'Cross-functional project', description: 'Lead a project spanning multiple teams.', assigneeRole: 'member', dueOffset: 120, priority: 'high', labels: ['project'] },
            { title: 'Rotation 2 evaluation', description: 'Assess performance in second rotation.', assigneeRole: 'lead', dueOffset: 180, priority: 'high', labels: ['evaluation'] },
          ],
        },
        {
          name: 'Final Placement',
          description: 'Permanent role assignment',
          tasks: [
            { title: 'Placement discussions', description: 'Discuss permanent role preferences.', assigneeRole: 'lead', dueOffset: 270, priority: 'high', labels: ['placement'] },
            { title: 'Final presentations', description: 'Graduates present learnings to leadership.', assigneeRole: 'member', dueOffset: 350, priority: 'high', labels: ['presentation'] },
            { title: 'Program graduation', description: 'Celebrate program completion.', assigneeRole: 'lead', dueOffset: 365, priority: 'medium', labels: ['celebration'] },
            { title: 'Transition to permanent role', description: 'Begin full-time position.', assigneeRole: 'member', dueOffset: 365, priority: 'high', labels: ['transition'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['recruitment', 'rotation_1', 'rotation_2', 'rotation_3', 'placement'] },
    },
    settings: { rotationalProgram: true },
  },

  // ==================== 10. LEADERSHIP DEVELOPMENT ====================
  {
    name: 'Leadership Development',
    slug: 'leadership-development',
    description:
      'Executive leadership development program for high-potential employees preparing for senior roles.',
    category: 'hr',
    icon: 'Star',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'foundation', name: 'Foundation', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'application', name: 'Application', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Leadership Level', type: 'select', description: 'Target leadership level', options: ['Team Lead', 'Manager', 'Director', 'VP', 'C-Suite'], isRequired: true },
      { name: 'Executive Coach', type: 'text', description: 'Assigned executive coach', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Leadership Assessment',
          description: 'Evaluate current leadership capabilities',
          tasks: [
            { title: '360-degree feedback', description: 'Collect feedback from peers, reports, and managers.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Leadership style assessment', description: 'Complete leadership personality assessments.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['assessment'] },
            { title: 'Identify development areas', description: 'Analyze gaps and growth opportunities.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['analysis'] },
            { title: 'Create development plan', description: 'Build personalized leadership development plan.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Core Leadership Training',
          description: 'Foundational leadership skills',
          tasks: [
            { title: 'Strategic thinking workshop', description: 'Develop strategic planning capabilities.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['training'] },
            { title: 'Executive communication', description: 'Enhance presentation and communication skills.', assigneeRole: 'member', dueOffset: 45, priority: 'high', labels: ['communication'] },
            { title: 'Financial acumen training', description: 'Understand business financials and metrics.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['finance'] },
            { title: 'Change leadership module', description: 'Learn to lead organizational change.', assigneeRole: 'member', dueOffset: 75, priority: 'high', labels: ['change'] },
          ],
        },
        {
          name: 'Executive Coaching',
          description: 'One-on-one coaching sessions',
          tasks: [
            { title: 'Assign executive coach', description: 'Match with appropriate executive coach.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['coaching'] },
            { title: 'Monthly coaching sessions', description: 'Regular coaching meetings.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['coaching'] },
            { title: 'Shadow senior executives', description: 'Observe executive decision-making.', assigneeRole: 'member', dueOffset: 60, priority: 'medium', labels: ['shadowing'] },
          ],
        },
        {
          name: 'Applied Leadership',
          description: 'Put leadership skills into practice',
          tasks: [
            { title: 'Lead strategic initiative', description: 'Take ownership of company-wide project.', assigneeRole: 'member', dueOffset: 100, priority: 'high', labels: ['project'] },
            { title: 'Present to board/executives', description: 'Deliver presentation to senior leadership.', assigneeRole: 'member', dueOffset: 150, priority: 'high', labels: ['presentation'] },
            { title: 'Program completion review', description: 'Final assessment and next steps.', assigneeRole: 'lead', dueOffset: 180, priority: 'high', labels: ['review'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['assessment', 'foundation', 'development', 'application', 'completed'] },
    },
    settings: { executiveProgram: true },
  },

  // ==================== 11. MANAGEMENT TRAINING ====================
  {
    name: 'Management Training',
    slug: 'management-training',
    description: 'Comprehensive training program for new and experienced managers covering people management fundamentals.',
    category: 'hr',
    icon: 'Briefcase',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'enrollment', name: 'Enrollment', order: 0, color: '#6B7280' },
      { id: 'core_modules', name: 'Core Modules', order: 1, color: '#3B82F6' },
      { id: 'practice', name: 'Practice', order: 2, color: '#F59E0B' },
      { id: 'certification', name: 'Certification', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Manager Level', type: 'select', description: 'Management level', options: ['New Manager', 'Experienced Manager', 'Senior Manager'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Kickoff',
          description: 'Launch management training',
          tasks: [
            { title: 'Enroll participants', description: 'Register managers for training program.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['enrollment'] },
            { title: 'Pre-assessment', description: 'Assess current management skills.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['assessment'] },
            { title: 'Distribute materials', description: 'Send course materials to participants.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['materials'] },
          ],
        },
        {
          name: 'Core Training Modules',
          description: 'Essential management skills',
          tasks: [
            { title: 'Effective delegation', description: 'Learn to delegate tasks appropriately.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['training'] },
            { title: 'Performance feedback', description: 'Giving and receiving feedback effectively.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['training'] },
            { title: 'Conflict resolution', description: 'Handle workplace conflicts professionally.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['training'] },
            { title: 'Team motivation', description: 'Techniques to motivate and engage teams.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Practical Application',
          description: 'Apply learning in real scenarios',
          tasks: [
            { title: 'Role-play exercises', description: 'Practice management scenarios.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['practice'] },
            { title: 'Peer coaching sessions', description: 'Learn from fellow managers.', assigneeRole: 'member', dueOffset: 49, priority: 'medium', labels: ['coaching'] },
            { title: 'Action learning project', description: 'Apply skills to real workplace challenge.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['project'] },
          ],
        },
        {
          name: 'Certification',
          description: 'Complete program certification',
          tasks: [
            { title: 'Final assessment', description: 'Complete certification exam.', assigneeRole: 'member', dueOffset: 63, priority: 'high', labels: ['assessment'] },
            { title: 'Program graduation', description: 'Certificate ceremony and celebration.', assigneeRole: 'lead', dueOffset: 70, priority: 'medium', labels: ['completion'] },
            { title: 'Post-training survey', description: 'Collect feedback on program.', assigneeRole: 'member', dueOffset: 72, priority: 'low', labels: ['feedback'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['enrollment', 'core_modules', 'practice', 'certification'] },
    },
    settings: { certification: true },
  },

  // ==================== 12. TECHNICAL TRAINING PROGRAM ====================
  {
    name: 'Technical Training Program',
    slug: 'technical-training-program',
    description: 'Structured technical skills development program for engineering and technical teams.',
    category: 'hr',
    icon: 'Code',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'delivery', name: 'Delivery', order: 1, color: '#3B82F6' },
      { id: 'hands_on', name: 'Hands-on', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Technology', type: 'text', description: 'Technology or skill being taught', isRequired: true },
      { name: 'Skill Level', type: 'select', description: 'Target skill level', options: ['Beginner', 'Intermediate', 'Advanced'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Design',
          description: 'Design technical curriculum',
          tasks: [
            { title: 'Identify skill gaps', description: 'Assess team technical skills and gaps.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Create curriculum', description: 'Design training modules and content.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['planning'] },
            { title: 'Setup lab environment', description: 'Prepare technical sandbox for practice.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['setup'] },
          ],
        },
        {
          name: 'Training Delivery',
          description: 'Conduct training sessions',
          tasks: [
            { title: 'Instructor-led sessions', description: 'Live training sessions with expert.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['training'] },
            { title: 'Self-paced modules', description: 'Online learning modules.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['e-learning'] },
            { title: 'Q&A sessions', description: 'Address questions and clarifications.', assigneeRole: 'lead', dueOffset: 28, priority: 'medium', labels: ['support'] },
          ],
        },
        {
          name: 'Hands-on Practice',
          description: 'Apply technical skills',
          tasks: [
            { title: 'Lab exercises', description: 'Complete technical lab assignments.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['practice'] },
            { title: 'Project work', description: 'Apply skills to real project.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['project'] },
            { title: 'Code review sessions', description: 'Peer review of technical work.', assigneeRole: 'member', dueOffset: 49, priority: 'medium', labels: ['review'] },
          ],
        },
        {
          name: 'Assessment',
          description: 'Evaluate skill acquisition',
          tasks: [
            { title: 'Technical assessment', description: 'Test technical knowledge gained.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['assessment'] },
            { title: 'Certification', description: 'Award technical certification.', assigneeRole: 'lead', dueOffset: 60, priority: 'medium', labels: ['certification'] },
            { title: 'Training feedback', description: 'Collect program feedback.', assigneeRole: 'member', dueOffset: 62, priority: 'low', labels: ['feedback'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'delivery', 'hands_on', 'completed'] },
    },
    settings: { technicalTraining: true },
  },

  // ==================== 13. SOFT SKILLS WORKSHOP ====================
  {
    name: 'Soft Skills Workshop',
    slug: 'soft-skills-workshop',
    description: 'Workshop series focused on developing interpersonal and professional soft skills.',
    category: 'hr',
    icon: 'MessageCircle',
    color: '#A855F7',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'sessions', name: 'Sessions', order: 1, color: '#3B82F6' },
      { id: 'practice', name: 'Practice', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Workshop Topic', type: 'select', description: 'Focus area', options: ['Communication', 'Presentation', 'Negotiation', 'Emotional Intelligence', 'Time Management'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Workshop Planning',
          description: 'Prepare workshop content',
          tasks: [
            { title: 'Define learning objectives', description: 'Set clear goals for workshop.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Create workshop materials', description: 'Develop slides, exercises, and handouts.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['materials'] },
            { title: 'Schedule sessions', description: 'Book rooms and send invitations.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['logistics'] },
          ],
        },
        {
          name: 'Workshop Delivery',
          description: 'Conduct workshop sessions',
          tasks: [
            { title: 'Session 1: Foundations', description: 'Introduction and core concepts.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['session'] },
            { title: 'Session 2: Deep Dive', description: 'Advanced techniques and strategies.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['session'] },
            { title: 'Session 3: Application', description: 'Real-world scenarios and practice.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['session'] },
          ],
        },
        {
          name: 'Follow-up Activities',
          description: 'Reinforce learning',
          tasks: [
            { title: 'Peer practice groups', description: 'Form groups for ongoing practice.', assigneeRole: 'member', dueOffset: 35, priority: 'medium', labels: ['practice'] },
            { title: 'Manager coaching', description: 'Managers reinforce skills on the job.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['coaching'] },
            { title: 'Collect feedback', description: 'Gather participant feedback.', assigneeRole: 'member', dueOffset: 45, priority: 'low', labels: ['feedback'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'sessions', 'practice', 'completed'] },
    },
    settings: { workshopBased: true },
  },

  // ==================== 14. DIVERSITY & INCLUSION TRAINING ====================
  {
    name: 'Diversity & Inclusion Training',
    slug: 'diversity-inclusion-training',
    description: 'Comprehensive D&I training program promoting inclusive workplace culture and practices.',
    category: 'hr',
    icon: 'Globe',
    color: '#14B8A6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'training', name: 'Training', order: 1, color: '#3B82F6' },
      { id: 'action', name: 'Action', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Training Type', type: 'select', description: 'Type of D&I training', options: ['All Employees', 'Managers', 'Leadership', 'New Hires'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Setup',
          description: 'Prepare D&I training',
          tasks: [
            { title: 'Assess current state', description: 'Review D&I metrics and feedback.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Select training content', description: 'Choose appropriate D&I curriculum.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['content'] },
            { title: 'Schedule training sessions', description: 'Plan training calendar.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['logistics'] },
          ],
        },
        {
          name: 'Training Delivery',
          description: 'Conduct D&I training',
          tasks: [
            { title: 'Unconscious bias training', description: 'Address hidden biases.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['training'] },
            { title: 'Inclusive leadership', description: 'Train leaders on inclusive practices.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['training'] },
            { title: 'Cultural competency', description: 'Build cross-cultural awareness.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['training'] },
            { title: 'Allyship workshop', description: 'Being an effective ally.', assigneeRole: 'lead', dueOffset: 35, priority: 'medium', labels: ['training'] },
          ],
        },
        {
          name: 'Action Planning',
          description: 'Turn learning into action',
          tasks: [
            { title: 'Personal commitment plans', description: 'Individual D&I action commitments.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['action'] },
            { title: 'Team D&I goals', description: 'Set team diversity objectives.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['goals'] },
            { title: 'Progress tracking', description: 'Monitor D&I initiative progress.', assigneeRole: 'lead', dueOffset: 90, priority: 'medium', labels: ['tracking'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'training', 'action', 'completed'] },
    },
    settings: { complianceRequired: true },
  },

  // ==================== 15. COMPLIANCE TRAINING ====================
  {
    name: 'Compliance Training',
    slug: 'compliance-training',
    description: 'Mandatory compliance training program ensuring regulatory adherence and policy awareness.',
    category: 'hr',
    icon: 'Shield',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'assignment', name: 'Assignment', order: 0, color: '#6B7280' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { id: 'assessment', name: 'Assessment', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Compliance Area', type: 'select', description: 'Area of compliance', options: ['Data Privacy', 'Anti-Bribery', 'Code of Conduct', 'Information Security', 'Industry Specific'], isRequired: true },
      { name: 'Due Date', type: 'date', description: 'Compliance deadline', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Training Assignment',
          description: 'Assign compliance modules',
          tasks: [
            { title: 'Identify required training', description: 'Determine compliance requirements.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Assign to employees', description: 'Distribute training assignments.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['assignment'] },
            { title: 'Send notifications', description: 'Notify employees of requirements.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['communication'] },
          ],
        },
        {
          name: 'Training Completion',
          description: 'Complete compliance modules',
          tasks: [
            { title: 'Complete training modules', description: 'Finish all assigned courses.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['training'] },
            { title: 'Send reminders', description: 'Follow up with incomplete training.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['follow-up'] },
            { title: 'Manager escalation', description: 'Escalate non-compliant employees.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['escalation'] },
          ],
        },
        {
          name: 'Assessment & Certification',
          description: 'Verify compliance knowledge',
          tasks: [
            { title: 'Complete assessments', description: 'Pass compliance quizzes.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['assessment'] },
            { title: 'Issue certificates', description: 'Generate completion certificates.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['certification'] },
            { title: 'Update compliance records', description: 'Record completion in HR system.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['records'] },
            { title: 'Generate compliance report', description: 'Report on training completion rates.', assigneeRole: 'lead', dueOffset: 30, priority: 'high', labels: ['reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['assignment', 'in_progress', 'assessment', 'completed'] },
    },
    settings: { mandatory: true, trackCompletion: true },
  },

  // ==================== 16. SAFETY TRAINING ====================
  {
    name: 'Safety Training',
    slug: 'safety-training',
    description: 'Workplace safety training program covering hazard identification, emergency procedures, and safe work practices.',
    category: 'hr',
    icon: 'AlertTriangle',
    color: '#F97316',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'training', name: 'Training', order: 1, color: '#3B82F6' },
      { id: 'drills', name: 'Drills', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Safety Topic', type: 'select', description: 'Safety training focus', options: ['General Safety', 'Fire Safety', 'Chemical Safety', 'Ergonomics', 'First Aid'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Training Preparation',
          description: 'Prepare safety training',
          tasks: [
            { title: 'Review safety regulations', description: 'Check OSHA and local requirements.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['compliance'] },
            { title: 'Prepare training materials', description: 'Create safety manuals and presentations.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['materials'] },
            { title: 'Schedule training sessions', description: 'Plan training calendar for all shifts.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['scheduling'] },
          ],
        },
        {
          name: 'Training Delivery',
          description: 'Conduct safety training',
          tasks: [
            { title: 'Hazard identification training', description: 'Teach employees to spot hazards.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['training'] },
            { title: 'Emergency procedures', description: 'Cover evacuation and emergency protocols.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['training'] },
            { title: 'PPE training', description: 'Proper use of protective equipment.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Practical Drills',
          description: 'Practice safety procedures',
          tasks: [
            { title: 'Fire drill', description: 'Conduct evacuation drill.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['drill'] },
            { title: 'First aid practice', description: 'Hands-on first aid training.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['practice'] },
            { title: 'Safety audit', description: 'Inspect workplace for hazards.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['audit'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'training', 'drills', 'completed'] },
    },
    settings: { mandatory: true, oshaCompliant: true },
  },

  // ==================== 17. SEXUAL HARASSMENT PREVENTION ====================
  {
    name: 'Sexual Harassment Prevention',
    slug: 'sexual-harassment-prevention',
    description: 'Mandatory training program on preventing workplace harassment and creating a respectful work environment.',
    category: 'hr',
    icon: 'ShieldCheck',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'assignment', name: 'Assignment', order: 0, color: '#6B7280' },
      { id: 'training', name: 'Training', order: 1, color: '#3B82F6' },
      { id: 'assessment', name: 'Assessment', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Training Level', type: 'select', description: 'Training audience', options: ['All Employees', 'Supervisors', 'Managers'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Launch',
          description: 'Initiate training program',
          tasks: [
            { title: 'Announce training requirement', description: 'Notify all employees of mandatory training.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['communication'] },
            { title: 'Assign training modules', description: 'Distribute appropriate training by role.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['assignment'] },
            { title: 'Set completion deadline', description: 'Establish training deadline.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['timeline'] },
          ],
        },
        {
          name: 'Training Content',
          description: 'Complete training modules',
          tasks: [
            { title: 'Definition and examples', description: 'Learn what constitutes harassment.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['training'] },
            { title: 'Reporting procedures', description: 'Understand how to report incidents.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['training'] },
            { title: 'Bystander intervention', description: 'Learn to intervene appropriately.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['training'] },
            { title: 'Manager responsibilities', description: 'Additional training for supervisors.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Completion',
          description: 'Verify and document completion',
          tasks: [
            { title: 'Knowledge assessment', description: 'Complete quiz to verify understanding.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['assessment'] },
            { title: 'Sign acknowledgment', description: 'Acknowledge policy understanding.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['documentation'] },
            { title: 'Generate completion report', description: 'Report on company-wide completion.', assigneeRole: 'lead', dueOffset: 30, priority: 'high', labels: ['reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['assignment', 'training', 'assessment', 'completed'] },
    },
    settings: { mandatory: true, legallyRequired: true },
  },

  // ==================== 18. 360-DEGREE FEEDBACK ====================
  {
    name: '360-Degree Feedback',
    slug: '360-degree-feedback',
    description: 'Multi-rater feedback process collecting input from managers, peers, direct reports, and self-assessment.',
    category: 'hr',
    icon: 'RefreshCw',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'collection', name: 'Collection', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'delivery', name: 'Delivery', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Feedback Cycle', type: 'select', description: 'Feedback cycle type', options: ['Annual', 'Bi-annual', 'Quarterly', 'Project-based'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Process Setup',
          description: 'Configure feedback process',
          tasks: [
            { title: 'Select participants', description: 'Identify who will receive 360 feedback.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Choose raters', description: 'Select appropriate feedback providers.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['selection'] },
            { title: 'Customize questionnaire', description: 'Adapt feedback questions for roles.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['design'] },
          ],
        },
        {
          name: 'Feedback Collection',
          description: 'Gather feedback from all raters',
          tasks: [
            { title: 'Launch survey', description: 'Send feedback requests to raters.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['launch'] },
            { title: 'Self-assessment completion', description: 'Participants complete self-review.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['self-review'] },
            { title: 'Send reminders', description: 'Follow up with pending responses.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['follow-up'] },
            { title: 'Close survey', description: 'End feedback collection period.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['deadline'] },
          ],
        },
        {
          name: 'Report Generation',
          description: 'Analyze and compile feedback',
          tasks: [
            { title: 'Generate reports', description: 'Compile individual feedback reports.', assigneeRole: 'member', dueOffset: 32, priority: 'high', labels: ['analysis'] },
            { title: 'Quality review', description: 'Review reports for accuracy.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['review'] },
            { title: 'Prepare coaching guides', description: 'Create development recommendations.', assigneeRole: 'member', dueOffset: 38, priority: 'medium', labels: ['development'] },
          ],
        },
        {
          name: 'Feedback Delivery',
          description: 'Share and discuss results',
          tasks: [
            { title: 'Schedule debrief sessions', description: 'Book feedback discussions.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['scheduling'] },
            { title: 'Deliver feedback', description: 'Conduct individual feedback sessions.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['delivery'] },
            { title: 'Create action plans', description: 'Develop improvement plans.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['action-planning'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['setup', 'collection', 'analysis', 'delivery', 'completed'] },
    },
    settings: { confidential: true },
  },

  // ==================== 19. GOAL SETTING (OKRs) ====================
  {
    name: 'Goal Setting (OKRs)',
    slug: 'goal-setting-okrs',
    description: 'Objectives and Key Results planning process for aligning individual and team goals with company strategy.',
    category: 'hr',
    icon: 'Target',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'drafting', name: 'Drafting', order: 1, color: '#3B82F6' },
      { id: 'alignment', name: 'Alignment', order: 2, color: '#F59E0B' },
      { id: 'tracking', name: 'Tracking', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'OKR Period', type: 'select', description: 'Goal period', options: ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy Cascade',
          description: 'Communicate company objectives',
          tasks: [
            { title: 'Share company OKRs', description: 'Communicate organizational objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['communication'] },
            { title: 'Department alignment meeting', description: 'Align department goals with company.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['alignment'] },
            { title: 'OKR training', description: 'Train teams on OKR methodology.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['training'] },
          ],
        },
        {
          name: 'OKR Drafting',
          description: 'Create individual and team OKRs',
          tasks: [
            { title: 'Draft team OKRs', description: 'Create team-level objectives.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['drafting'] },
            { title: 'Draft individual OKRs', description: 'Employees create personal OKRs.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['drafting'] },
            { title: 'Manager review', description: 'Managers review and refine OKRs.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Finalization',
          description: 'Finalize and publish OKRs',
          tasks: [
            { title: 'Cross-team alignment', description: 'Ensure OKRs align across teams.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['alignment'] },
            { title: 'Finalize OKRs', description: 'Lock in final objectives and key results.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['finalization'] },
            { title: 'Publish OKRs', description: 'Share OKRs company-wide.', assigneeRole: 'lead', dueOffset: 32, priority: 'medium', labels: ['communication'] },
          ],
        },
        {
          name: 'Progress Tracking',
          description: 'Monitor OKR progress',
          tasks: [
            { title: 'Weekly check-ins', description: 'Regular progress updates.', assigneeRole: 'member', dueOffset: 60, priority: 'medium', labels: ['tracking'] },
            { title: 'Mid-quarter review', description: 'Assess progress at midpoint.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['review'] },
            { title: 'Quarter-end scoring', description: 'Score and reflect on OKR achievement.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['scoring'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'drafting', 'alignment', 'tracking', 'completed'] },
    },
    settings: { recurring: true },
  },

  // ==================== 20. CAREER DEVELOPMENT PLANNING ====================
  {
    name: 'Career Development Planning',
    slug: 'career-development-planning',
    description: 'Individual career planning process helping employees map career paths and development opportunities.',
    category: 'hr',
    icon: 'Map',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'review', name: 'Review', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Career Track', type: 'select', description: 'Career direction', options: ['Individual Contributor', 'Management', 'Technical Leadership', 'Cross-functional'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Self-Assessment',
          description: 'Evaluate current position and aspirations',
          tasks: [
            { title: 'Skills assessment', description: 'Evaluate current skills and competencies.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Career aspirations discussion', description: 'Discuss long-term career goals.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['discussion'] },
            { title: 'Identify strengths and gaps', description: 'Determine areas for development.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['analysis'] },
          ],
        },
        {
          name: 'Career Path Mapping',
          description: 'Define career trajectory',
          tasks: [
            { title: 'Explore career options', description: 'Research potential career paths.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['exploration'] },
            { title: 'Set career milestones', description: 'Define short and long-term goals.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['goals'] },
            { title: 'Create development plan', description: 'Document development activities.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Development Activities',
          description: 'Execute development plan',
          tasks: [
            { title: 'Identify learning opportunities', description: 'Find training, courses, certifications.', assigneeRole: 'member', dueOffset: 35, priority: 'medium', labels: ['learning'] },
            { title: 'Seek stretch assignments', description: 'Find challenging projects.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['experience'] },
            { title: 'Build network', description: 'Connect with mentors and sponsors.', assigneeRole: 'member', dueOffset: 49, priority: 'medium', labels: ['networking'] },
          ],
        },
        {
          name: 'Progress Review',
          description: 'Review career development progress',
          tasks: [
            { title: 'Quarterly progress check', description: 'Review development plan progress.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['review'] },
            { title: 'Adjust plan as needed', description: 'Update plan based on progress.', assigneeRole: 'member', dueOffset: 95, priority: 'medium', labels: ['adjustment'] },
            { title: 'Annual career discussion', description: 'Formal annual career conversation.', assigneeRole: 'lead', dueOffset: 365, priority: 'high', labels: ['annual-review'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['assessment', 'planning', 'development', 'review'] },
    },
    settings: { ongoing: true },
  },

  // ==================== 21. SUCCESSION PLANNING ====================
  {
    name: 'Succession Planning',
    slug: 'succession-planning',
    description: 'Strategic process for identifying and developing future leaders to fill key positions.',
    category: 'hr',
    icon: 'UserCheck',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'identification', name: 'Identification', order: 0, color: '#6B7280' },
      { id: 'assessment', name: 'Assessment', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Position Level', type: 'select', description: 'Level of positions', options: ['Executive', 'Director', 'Manager', 'Key Technical'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Critical Role Identification',
          description: 'Identify key positions for succession',
          tasks: [
            { title: 'Map critical roles', description: 'Identify positions requiring succession plans.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Assess vacancy risk', description: 'Evaluate retirement and turnover risk.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['risk'] },
            { title: 'Define role requirements', description: 'Document competencies needed for each role.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['requirements'] },
          ],
        },
        {
          name: 'Successor Identification',
          description: 'Identify potential successors',
          tasks: [
            { title: 'Talent pool review', description: 'Identify potential internal candidates.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['talent'] },
            { title: 'Readiness assessment', description: 'Evaluate candidate readiness levels.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['assessment'] },
            { title: 'Gap analysis', description: 'Identify development needs for each candidate.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['analysis'] },
          ],
        },
        {
          name: 'Development Planning',
          description: 'Create successor development plans',
          tasks: [
            { title: 'Create development plans', description: 'Build individual development plans.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['development'] },
            { title: 'Assign mentors', description: 'Pair successors with senior mentors.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['mentorship'] },
            { title: 'Plan stretch assignments', description: 'Identify growth opportunities.', assigneeRole: 'member', dueOffset: 49, priority: 'medium', labels: ['assignments'] },
          ],
        },
        {
          name: 'Ongoing Review',
          description: 'Monitor and update succession plans',
          tasks: [
            { title: 'Quarterly progress review', description: 'Review development progress.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['review'] },
            { title: 'Update succession charts', description: 'Refresh succession documentation.', assigneeRole: 'member', dueOffset: 180, priority: 'medium', labels: ['documentation'] },
            { title: 'Annual succession review', description: 'Comprehensive annual review.', assigneeRole: 'lead', dueOffset: 365, priority: 'high', labels: ['annual'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['identification', 'assessment', 'development', 'monitoring'] },
    },
    settings: { confidential: true, strategic: true },
  },

  // ==================== 22. TALENT REVIEW ====================
  {
    name: 'Talent Review',
    slug: 'talent-review',
    description: 'Annual talent review process to assess workforce capabilities, identify high performers, and plan development.',
    category: 'hr',
    icon: 'Users',
    color: '#2563EB',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'assessment', name: 'Assessment', order: 1, color: '#3B82F6' },
      { id: 'calibration', name: 'Calibration', order: 2, color: '#F59E0B' },
      { id: 'action_planning', name: 'Action Planning', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Review Year', type: 'text', description: 'Talent review year', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Work',
          description: 'Prepare for talent review',
          tasks: [
            { title: 'Update talent profiles', description: 'Ensure employee data is current.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['data'] },
            { title: 'Managers complete assessments', description: 'Rate employees on performance and potential.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['assessment'] },
            { title: 'Prepare 9-box grids', description: 'Create talent matrix visualizations.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['analysis'] },
          ],
        },
        {
          name: 'Talent Review Sessions',
          description: 'Conduct talent discussions',
          tasks: [
            { title: 'Department talent reviews', description: 'Review talent within each department.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['review'] },
            { title: 'Cross-functional calibration', description: 'Align ratings across departments.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['calibration'] },
            { title: 'Executive talent review', description: 'Senior leadership talent discussion.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['executive'] },
          ],
        },
        {
          name: 'Outcomes and Actions',
          description: 'Plan talent actions',
          tasks: [
            { title: 'Identify high potentials', description: 'Finalize HiPo designation.', assigneeRole: 'lead', dueOffset: 40, priority: 'high', labels: ['hipo'] },
            { title: 'Create development plans', description: 'Plan for key talent development.', assigneeRole: 'member', dueOffset: 45, priority: 'high', labels: ['development'] },
            { title: 'Address performance issues', description: 'Plan for underperformers.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['performance'] },
            { title: 'Update succession plans', description: 'Integrate with succession planning.', assigneeRole: 'member', dueOffset: 50, priority: 'medium', labels: ['succession'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['preparation', 'assessment', 'calibration', 'action_planning'] },
    },
    settings: { confidential: true, annual: true },
  },

  // ==================== 23. HIGH POTENTIAL PROGRAM ====================
  {
    name: 'High Potential Program',
    slug: 'high-potential-program',
    description: 'Accelerated development program for high-potential employees identified as future leaders.',
    category: 'hr',
    icon: 'Zap',
    color: '#D946EF',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'selection', name: 'Selection', order: 0, color: '#6B7280' },
      { id: 'onboarding', name: 'Onboarding', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'graduation', name: 'Graduation', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Program Cohort', type: 'text', description: 'HiPo cohort identifier', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Participant Selection',
          description: 'Select program participants',
          tasks: [
            { title: 'Review talent pool', description: 'Identify HiPo candidates from talent review.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['selection'] },
            { title: 'Manager nominations', description: 'Collect manager nominations.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['nomination'] },
            { title: 'Final selection', description: 'Finalize program participants.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['selection'] },
          ],
        },
        {
          name: 'Program Launch',
          description: 'Onboard HiPo cohort',
          tasks: [
            { title: 'Program kickoff', description: 'Welcome session for new cohort.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['kickoff'] },
            { title: 'Assign executive sponsors', description: 'Match with senior sponsors.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['sponsorship'] },
            { title: 'Create individual plans', description: 'Build personalized development plans.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Development Journey',
          description: 'Execute development activities',
          tasks: [
            { title: 'Leadership workshops', description: 'Attend leadership development sessions.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['training'] },
            { title: 'Cross-functional projects', description: 'Lead strategic projects.', assigneeRole: 'member', dueOffset: 120, priority: 'high', labels: ['projects'] },
            { title: 'Executive exposure', description: 'Present to senior leadership.', assigneeRole: 'member', dueOffset: 180, priority: 'high', labels: ['visibility'] },
            { title: 'External development', description: 'Attend conferences and external programs.', assigneeRole: 'member', dueOffset: 240, priority: 'medium', labels: ['external'] },
          ],
        },
        {
          name: 'Program Completion',
          description: 'Graduate from program',
          tasks: [
            { title: 'Final assessment', description: 'Evaluate development progress.', assigneeRole: 'lead', dueOffset: 350, priority: 'high', labels: ['assessment'] },
            { title: 'Career placement discussions', description: 'Discuss next career moves.', assigneeRole: 'lead', dueOffset: 355, priority: 'high', labels: ['career'] },
            { title: 'Graduation ceremony', description: 'Celebrate program completion.', assigneeRole: 'lead', dueOffset: 365, priority: 'medium', labels: ['celebration'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['selection', 'onboarding', 'development', 'graduation'] },
    },
    settings: { confidential: true, eliteProgram: true },
  },

  // ==================== 24. MENTORSHIP PROGRAM ====================
  {
    name: 'Mentorship Program',
    slug: 'mentorship-program',
    description: 'Formal mentorship program connecting experienced employees with mentees for professional development.',
    category: 'hr',
    icon: 'Heart',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'enrollment', name: 'Enrollment', order: 0, color: '#6B7280' },
      { id: 'matching', name: 'Matching', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Program Duration', type: 'select', description: 'Length of mentorship', options: ['3 months', '6 months', '12 months'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Setup',
          description: 'Launch mentorship program',
          tasks: [
            { title: 'Define program goals', description: 'Set objectives for mentorship program.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Recruit mentors', description: 'Identify and enroll mentors.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['recruitment'] },
            { title: 'Recruit mentees', description: 'Open applications for mentees.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['recruitment'] },
            { title: 'Train mentors', description: 'Provide mentor training.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Matching Process',
          description: 'Pair mentors and mentees',
          tasks: [
            { title: 'Review applications', description: 'Assess mentor and mentee profiles.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['review'] },
            { title: 'Create matches', description: 'Pair mentors with mentees.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['matching'] },
            { title: 'Notify participants', description: 'Announce mentor-mentee pairs.', assigneeRole: 'member', dueOffset: 23, priority: 'high', labels: ['communication'] },
          ],
        },
        {
          name: 'Active Mentorship',
          description: 'Support ongoing mentorship',
          tasks: [
            { title: 'Kickoff meetings', description: 'First mentor-mentee meetings.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['kickoff'] },
            { title: 'Monthly check-ins', description: 'Program coordinator check-ins.', assigneeRole: 'member', dueOffset: 60, priority: 'medium', labels: ['check-in'] },
            { title: 'Mid-program review', description: 'Assess partnership progress.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Program Completion',
          description: 'Close out mentorship program',
          tasks: [
            { title: 'Final reflections', description: 'Participants share learnings.', assigneeRole: 'member', dueOffset: 175, priority: 'medium', labels: ['reflection'] },
            { title: 'Collect feedback', description: 'Survey participants on experience.', assigneeRole: 'member', dueOffset: 180, priority: 'medium', labels: ['feedback'] },
            { title: 'Recognition event', description: 'Celebrate program completion.', assigneeRole: 'lead', dueOffset: 180, priority: 'medium', labels: ['celebration'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['enrollment', 'matching', 'active', 'completed'] },
    },
    settings: { developmental: true },
  },

  // ==================== 25. COACHING PROGRAM ====================
  {
    name: 'Coaching Program',
    slug: 'coaching-program',
    description: 'Professional coaching program providing one-on-one coaching for employee development.',
    category: 'hr',
    icon: 'Compass',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'intake', name: 'Intake', order: 0, color: '#6B7280' },
      { id: 'coaching', name: 'Coaching', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Coaching Type', type: 'select', description: 'Type of coaching', options: ['Executive', 'Leadership', 'Career', 'Performance'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Coaching Intake',
          description: 'Assess coaching needs',
          tasks: [
            { title: 'Coaching request review', description: 'Evaluate coaching requests.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['intake'] },
            { title: 'Stakeholder interviews', description: 'Gather input from manager and HR.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['discovery'] },
            { title: 'Coach matching', description: 'Select appropriate coach.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['matching'] },
          ],
        },
        {
          name: 'Coaching Engagement',
          description: 'Active coaching sessions',
          tasks: [
            { title: 'Chemistry session', description: 'Initial coach-coachee meeting.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['session'] },
            { title: 'Set coaching goals', description: 'Define coaching objectives.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['goals'] },
            { title: 'Regular coaching sessions', description: 'Ongoing coaching meetings.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['sessions'] },
          ],
        },
        {
          name: 'Progress Review',
          description: 'Monitor coaching effectiveness',
          tasks: [
            { title: 'Mid-point review', description: 'Assess coaching progress.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['review'] },
            { title: 'Stakeholder feedback', description: 'Gather feedback on progress.', assigneeRole: 'member', dueOffset: 75, priority: 'medium', labels: ['feedback'] },
            { title: 'Adjust coaching plan', description: 'Refine coaching approach.', assigneeRole: 'member', dueOffset: 80, priority: 'medium', labels: ['adjustment'] },
          ],
        },
        {
          name: 'Coaching Completion',
          description: 'Conclude coaching engagement',
          tasks: [
            { title: 'Final coaching session', description: 'Closing session with coach.', assigneeRole: 'member', dueOffset: 120, priority: 'high', labels: ['closure'] },
            { title: 'Measure outcomes', description: 'Assess coaching impact.', assigneeRole: 'lead', dueOffset: 125, priority: 'high', labels: ['measurement'] },
            { title: 'Document learnings', description: 'Capture insights and growth.', assigneeRole: 'member', dueOffset: 130, priority: 'medium', labels: ['documentation'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['intake', 'coaching', 'review', 'completed'] },
    },
    settings: { confidential: true },
  },

  // ==================== 26. JOB SHADOWING PROGRAM ====================
  {
    name: 'Job Shadowing Program',
    slug: 'job-shadowing-program',
    description: 'Program enabling employees to shadow colleagues in different roles to explore career options.',
    category: 'hr',
    icon: 'Eye',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'application', name: 'Application', order: 0, color: '#6B7280' },
      { id: 'matching', name: 'Matching', order: 1, color: '#3B82F6' },
      { id: 'shadowing', name: 'Shadowing', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Shadow Duration', type: 'select', description: 'Length of shadowing', options: ['Half day', 'Full day', 'Week'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Administration',
          description: 'Manage shadowing requests',
          tasks: [
            { title: 'Open application period', description: 'Announce shadowing opportunity.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['launch'] },
            { title: 'Collect applications', description: 'Gather shadow requests.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['applications'] },
            { title: 'Identify hosts', description: 'Find employees willing to host.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['hosts'] },
          ],
        },
        {
          name: 'Matching and Preparation',
          description: 'Prepare shadowing experiences',
          tasks: [
            { title: 'Match shadows with hosts', description: 'Pair requesters with hosts.', assigneeRole: 'lead', dueOffset: 18, priority: 'high', labels: ['matching'] },
            { title: 'Schedule shadow days', description: 'Coordinate calendars.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['scheduling'] },
            { title: 'Prepare participants', description: 'Brief hosts and shadows.', assigneeRole: 'member', dueOffset: 25, priority: 'medium', labels: ['preparation'] },
          ],
        },
        {
          name: 'Shadowing Experience',
          description: 'Execute shadowing',
          tasks: [
            { title: 'Conduct shadow sessions', description: 'Shadows observe host work.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['shadowing'] },
            { title: 'Debrief discussions', description: 'Discuss observations and learnings.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['debrief'] },
            { title: 'Collect feedback', description: 'Gather participant feedback.', assigneeRole: 'member', dueOffset: 32, priority: 'medium', labels: ['feedback'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['application', 'matching', 'shadowing', 'completed'] },
    },
    settings: { careerExploration: true },
  },

  // ==================== 27. CROSS-TRAINING INITIATIVE ====================
  {
    name: 'Cross-Training Initiative',
    slug: 'cross-training-initiative',
    description: 'Initiative to cross-train employees across different functions for flexibility and skill building.',
    category: 'hr',
    icon: 'Repeat',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'training', name: 'Training', order: 1, color: '#3B82F6' },
      { id: 'practice', name: 'Practice', order: 2, color: '#F59E0B' },
      { id: 'certified', name: 'Certified', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Training Area', type: 'text', description: 'Cross-training function', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Initiative Planning',
          description: 'Plan cross-training program',
          tasks: [
            { title: 'Identify critical skills', description: 'Determine skills needing backup coverage.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['analysis'] },
            { title: 'Select participants', description: 'Choose employees for cross-training.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['selection'] },
            { title: 'Create training plan', description: 'Design cross-training curriculum.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Knowledge Transfer',
          description: 'Conduct training sessions',
          tasks: [
            { title: 'Classroom training', description: 'Formal training sessions.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['training'] },
            { title: 'Job shadowing', description: 'Observe experienced employees.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['shadowing'] },
            { title: 'Documentation review', description: 'Study process documentation.', assigneeRole: 'member', dueOffset: 35, priority: 'medium', labels: ['documentation'] },
          ],
        },
        {
          name: 'Hands-on Practice',
          description: 'Apply cross-training skills',
          tasks: [
            { title: 'Supervised practice', description: 'Practice with oversight.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['practice'] },
            { title: 'Independent execution', description: 'Perform tasks independently.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['execution'] },
            { title: 'Skill assessment', description: 'Evaluate cross-training proficiency.', assigneeRole: 'lead', dueOffset: 63, priority: 'high', labels: ['assessment'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'training', 'practice', 'certified'] },
    },
    settings: { operational: true },
  },

  // ==================== 28. SKILL GAP ANALYSIS ====================
  {
    name: 'Skill Gap Analysis',
    slug: 'skill-gap-analysis',
    description: 'Process to identify gaps between current and required workforce skills for strategic planning.',
    category: 'hr',
    icon: 'PieChart',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' },
      { id: 'planning', name: 'Planning', order: 2, color: '#F59E0B' },
      { id: 'execution', name: 'Execution', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Department', type: 'select', description: 'Analysis scope', options: ['Company-wide', 'Engineering', 'Sales', 'Marketing', 'Operations'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Current State Assessment',
          description: 'Assess existing skills',
          tasks: [
            { title: 'Define skill framework', description: 'Create competency model.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['framework'] },
            { title: 'Conduct skills inventory', description: 'Assess current workforce skills.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['inventory'] },
            { title: 'Manager assessments', description: 'Managers rate team skills.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['assessment'] },
          ],
        },
        {
          name: 'Future State Definition',
          description: 'Define required skills',
          tasks: [
            { title: 'Identify future skill needs', description: 'Determine skills for strategy.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['planning'] },
            { title: 'Benchmark against industry', description: 'Compare to market standards.', assigneeRole: 'member', dueOffset: 35, priority: 'medium', labels: ['benchmarking'] },
            { title: 'Technology impact analysis', description: 'Consider tech changes on skills.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['technology'] },
          ],
        },
        {
          name: 'Gap Analysis',
          description: 'Analyze skill gaps',
          tasks: [
            { title: 'Calculate skill gaps', description: 'Identify gaps by role and team.', assigneeRole: 'member', dueOffset: 49, priority: 'high', labels: ['analysis'] },
            { title: 'Prioritize gaps', description: 'Rank gaps by business impact.', assigneeRole: 'lead', dueOffset: 52, priority: 'high', labels: ['prioritization'] },
            { title: 'Create gap report', description: 'Document findings and recommendations.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['reporting'] },
          ],
        },
        {
          name: 'Action Planning',
          description: 'Plan gap closure',
          tasks: [
            { title: 'Develop learning programs', description: 'Create training to close gaps.', assigneeRole: 'lead', dueOffset: 63, priority: 'high', labels: ['training'] },
            { title: 'Hiring strategy', description: 'Plan recruitment for critical gaps.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['hiring'] },
            { title: 'Track progress', description: 'Monitor gap closure progress.', assigneeRole: 'member', dueOffset: 180, priority: 'medium', labels: ['tracking'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['assessment', 'analysis', 'planning', 'execution'] },
    },
    settings: { strategic: true },
  },

  // ==================== 29. WORKFORCE PLANNING ====================
  {
    name: 'Workforce Planning',
    slug: 'workforce-planning',
    description: 'Strategic workforce planning process to align talent needs with business objectives.',
    category: 'hr',
    icon: 'BarChart',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'analysis', name: 'Analysis', order: 0, color: '#6B7280' },
      { id: 'forecasting', name: 'Forecasting', order: 1, color: '#3B82F6' },
      { id: 'planning', name: 'Planning', order: 2, color: '#F59E0B' },
      { id: 'execution', name: 'Execution', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Planning Horizon', type: 'select', description: 'Planning timeframe', options: ['1 year', '2 years', '3 years', '5 years'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Current State Analysis',
          description: 'Assess current workforce',
          tasks: [
            { title: 'Workforce demographics', description: 'Analyze current workforce composition.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['analysis'] },
            { title: 'Turnover analysis', description: 'Review historical turnover patterns.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['turnover'] },
            { title: 'Productivity metrics', description: 'Assess workforce productivity.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['productivity'] },
          ],
        },
        {
          name: 'Demand Forecasting',
          description: 'Forecast future workforce needs',
          tasks: [
            { title: 'Business strategy alignment', description: 'Understand business growth plans.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['strategy'] },
            { title: 'Demand modeling', description: 'Project future headcount needs.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['forecasting'] },
            { title: 'Scenario planning', description: 'Model different scenarios.', assigneeRole: 'member', dueOffset: 35, priority: 'medium', labels: ['scenarios'] },
          ],
        },
        {
          name: 'Gap Analysis',
          description: 'Identify workforce gaps',
          tasks: [
            { title: 'Supply vs demand analysis', description: 'Compare projected supply to demand.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['analysis'] },
            { title: 'Critical role identification', description: 'Identify roles at risk.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['critical-roles'] },
            { title: 'Gap prioritization', description: 'Prioritize gaps to address.', assigneeRole: 'lead', dueOffset: 52, priority: 'high', labels: ['prioritization'] },
          ],
        },
        {
          name: 'Action Planning',
          description: 'Create workforce action plans',
          tasks: [
            { title: 'Hiring plan', description: 'Develop recruitment strategy.', assigneeRole: 'lead', dueOffset: 56, priority: 'high', labels: ['hiring'] },
            { title: 'Development plan', description: 'Plan internal talent development.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['development'] },
            { title: 'Contingent workforce plan', description: 'Plan for flexible workforce.', assigneeRole: 'member', dueOffset: 63, priority: 'medium', labels: ['contingent'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['analysis', 'forecasting', 'planning', 'execution'] },
    },
    settings: { strategic: true },
  },

  // ==================== 30. HEADCOUNT PLANNING ====================
  {
    name: 'Headcount Planning',
    slug: 'headcount-planning',
    description: 'Annual headcount planning process to budget and allocate positions across the organization.',
    category: 'hr',
    icon: 'Calculator',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'requests', name: 'Requests', order: 0, color: '#6B7280' },
      { id: 'review', name: 'Review', order: 1, color: '#3B82F6' },
      { id: 'approval', name: 'Approval', order: 2, color: '#F59E0B' },
      { id: 'allocation', name: 'Allocation', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Fiscal Year', type: 'text', description: 'Planning fiscal year', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Request Collection',
          description: 'Gather headcount requests',
          tasks: [
            { title: 'Launch planning process', description: 'Communicate planning timeline.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['launch'] },
            { title: 'Department submissions', description: 'Collect headcount requests.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['requests'] },
            { title: 'Business case review', description: 'Review justifications for requests.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Analysis and Prioritization',
          description: 'Review and prioritize requests',
          tasks: [
            { title: 'Budget analysis', description: 'Align requests with budget constraints.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['budget'] },
            { title: 'Strategic alignment', description: 'Prioritize by strategic importance.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['strategy'] },
            { title: 'Trade-off discussions', description: 'Discuss allocation trade-offs.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['discussion'] },
          ],
        },
        {
          name: 'Approval Process',
          description: 'Secure headcount approvals',
          tasks: [
            { title: 'Finance review', description: 'Finance team budget approval.', assigneeRole: 'member', dueOffset: 49, priority: 'high', labels: ['finance'] },
            { title: 'Executive approval', description: 'Leadership final approval.', assigneeRole: 'lead', dueOffset: 56, priority: 'high', labels: ['approval'] },
            { title: 'Board presentation', description: 'Present to board if required.', assigneeRole: 'lead', dueOffset: 60, priority: 'medium', labels: ['board'] },
          ],
        },
        {
          name: 'Allocation and Communication',
          description: 'Finalize and communicate allocations',
          tasks: [
            { title: 'Finalize allocations', description: 'Lock in headcount numbers.', assigneeRole: 'lead', dueOffset: 63, priority: 'high', labels: ['finalization'] },
            { title: 'Communicate to departments', description: 'Share approved headcount.', assigneeRole: 'member', dueOffset: 65, priority: 'high', labels: ['communication'] },
            { title: 'Update HRIS', description: 'Enter approved positions in system.', assigneeRole: 'member', dueOffset: 70, priority: 'medium', labels: ['systems'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['requests', 'review', 'approval', 'allocation'] },
    },
    settings: { annual: true, budgetLinked: true },
  },

  // ==================== 31. ORGANIZATIONAL RESTRUCTURING ====================
  {
    name: 'Organizational Restructuring',
    slug: 'organizational-restructuring',
    description: 'Major organizational change project including structure redesign, role changes, and communication.',
    category: 'hr',
    icon: 'GitBranch',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'stabilization', name: 'Stabilization', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Restructure Type', type: 'select', description: 'Type of restructure', options: ['Merger', 'Acquisition', 'Downsizing', 'Growth', 'Reorganization'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Assessment and Planning',
          description: 'Plan restructuring approach',
          tasks: [
            { title: 'Define restructuring objectives', description: 'Clarify goals of the restructure.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Assess current state', description: 'Document current organization.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['assessment'] },
            { title: 'Legal and compliance review', description: 'Ensure legal compliance.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['legal'] },
          ],
        },
        {
          name: 'Organization Design',
          description: 'Design new structure',
          tasks: [
            { title: 'Design new org structure', description: 'Create future organization chart.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['design'] },
            { title: 'Define new roles', description: 'Document new job descriptions.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['roles'] },
            { title: 'Plan role transitions', description: 'Map employees to new roles.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['transitions'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Execute restructuring',
          tasks: [
            { title: 'Leadership alignment', description: 'Align leaders on changes.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['leadership'] },
            { title: 'Employee communications', description: 'Announce changes to staff.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['communication'] },
            { title: 'Execute role changes', description: 'Implement organizational moves.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['execution'] },
            { title: 'Update systems', description: 'Update HR systems with changes.', assigneeRole: 'member', dueOffset: 63, priority: 'medium', labels: ['systems'] },
          ],
        },
        {
          name: 'Stabilization',
          description: 'Support transition',
          tasks: [
            { title: 'Monitor employee sentiment', description: 'Track morale and concerns.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['monitoring'] },
            { title: 'Address issues', description: 'Resolve emerging problems.', assigneeRole: 'lead', dueOffset: 77, priority: 'high', labels: ['resolution'] },
            { title: 'Post-implementation review', description: 'Assess restructure effectiveness.', assigneeRole: 'lead', dueOffset: 90, priority: 'medium', labels: ['review'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'design', 'implementation', 'stabilization'] },
    },
    settings: { sensitive: true, changeManagement: true },
  },

  // ==================== 32. CHANGE MANAGEMENT ====================
  {
    name: 'Change Management',
    slug: 'change-management',
    description: 'Structured approach to transitioning individuals and teams through organizational changes.',
    category: 'hr',
    icon: 'RefreshCcw',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'engagement', name: 'Engagement', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'reinforcement', name: 'Reinforcement', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Change Type', type: 'text', description: 'Type of change initiative', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Change Readiness',
          description: 'Prepare for change',
          tasks: [
            { title: 'Define change vision', description: 'Articulate why change is needed.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['vision'] },
            { title: 'Stakeholder analysis', description: 'Identify key stakeholders.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['stakeholders'] },
            { title: 'Impact assessment', description: 'Assess change impact on teams.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['assessment'] },
          ],
        },
        {
          name: 'Engagement',
          description: 'Build support for change',
          tasks: [
            { title: 'Build change network', description: 'Identify change champions.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['champions'] },
            { title: 'Communication plan', description: 'Create change communication strategy.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['communication'] },
            { title: 'Address resistance', description: 'Identify and address resistance.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['resistance'] },
          ],
        },
        {
          name: 'Implementation Support',
          description: 'Support change adoption',
          tasks: [
            { title: 'Training and development', description: 'Build change capabilities.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['training'] },
            { title: 'Manager coaching', description: 'Equip managers to lead change.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['coaching'] },
            { title: 'Quick wins', description: 'Celebrate early successes.', assigneeRole: 'member', dueOffset: 56, priority: 'medium', labels: ['wins'] },
          ],
        },
        {
          name: 'Sustainment',
          description: 'Reinforce and sustain change',
          tasks: [
            { title: 'Measure adoption', description: 'Track change adoption metrics.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['metrics'] },
            { title: 'Reinforce behaviors', description: 'Sustain new ways of working.', assigneeRole: 'lead', dueOffset: 84, priority: 'high', labels: ['reinforcement'] },
            { title: 'Lessons learned', description: 'Document change learnings.', assigneeRole: 'member', dueOffset: 90, priority: 'medium', labels: ['lessons'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['preparation', 'engagement', 'implementation', 'reinforcement'] },
    },
    settings: { strategic: true },
  },

  // ==================== 33. CULTURE TRANSFORMATION ====================
  {
    name: 'Culture Transformation',
    slug: 'culture-transformation',
    description: 'Long-term initiative to shift organizational culture to align with strategic objectives.',
    category: 'hr',
    icon: 'Sunrise',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'discovery', name: 'Discovery', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'activation', name: 'Activation', order: 2, color: '#F59E0B' },
      { id: 'embedding', name: 'Embedding', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Culture', type: 'text', description: 'Desired culture attributes', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Culture Assessment',
          description: 'Understand current culture',
          tasks: [
            { title: 'Culture audit', description: 'Assess current culture state.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Employee interviews', description: 'Gather qualitative insights.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['research'] },
            { title: 'Culture survey', description: 'Quantitative culture measurement.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['survey'] },
          ],
        },
        {
          name: 'Vision Definition',
          description: 'Define target culture',
          tasks: [
            { title: 'Define cultural values', description: 'Articulate desired values.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['values'] },
            { title: 'Behavioral anchors', description: 'Define observable behaviors.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['behaviors'] },
            { title: 'Leadership alignment', description: 'Align leaders on culture vision.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['alignment'] },
          ],
        },
        {
          name: 'Culture Activation',
          description: 'Launch culture initiatives',
          tasks: [
            { title: 'Culture launch event', description: 'Company-wide culture rollout.', assigneeRole: 'lead', dueOffset: 63, priority: 'high', labels: ['launch'] },
            { title: 'Leader role modeling', description: 'Leaders demonstrate values.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['leadership'] },
            { title: 'Culture training', description: 'Train employees on new culture.', assigneeRole: 'member', dueOffset: 77, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Culture Embedding',
          description: 'Sustain culture change',
          tasks: [
            { title: 'Align HR processes', description: 'Embed culture in hiring, performance.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['processes'] },
            { title: 'Recognition program', description: 'Recognize culture champions.', assigneeRole: 'member', dueOffset: 100, priority: 'medium', labels: ['recognition'] },
            { title: 'Culture pulse checks', description: 'Ongoing culture measurement.', assigneeRole: 'member', dueOffset: 180, priority: 'medium', labels: ['measurement'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['discovery', 'design', 'activation', 'embedding'] },
    },
    settings: { longTerm: true, strategic: true },
  },

  // ==================== 34. EMPLOYEE ENGAGEMENT SURVEY ====================
  {
    name: 'Employee Engagement Survey',
    slug: 'employee-engagement-survey',
    description: 'Annual employee engagement survey process from design to action planning.',
    category: 'hr',
    icon: 'ClipboardList',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'fielding', name: 'Fielding', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'action', name: 'Action', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Survey Year', type: 'text', description: 'Survey year', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Survey Design',
          description: 'Prepare engagement survey',
          tasks: [
            { title: 'Review survey questions', description: 'Update questionnaire as needed.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['design'] },
            { title: 'Communication plan', description: 'Plan survey communications.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['communication'] },
            { title: 'Technical setup', description: 'Configure survey platform.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['setup'] },
          ],
        },
        {
          name: 'Survey Fielding',
          description: 'Administer survey',
          tasks: [
            { title: 'Launch survey', description: 'Send survey to all employees.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['launch'] },
            { title: 'Send reminders', description: 'Follow up for participation.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['reminders'] },
            { title: 'Close survey', description: 'End survey collection.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['close'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze results',
          tasks: [
            { title: 'Generate reports', description: 'Create survey reports.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['analysis'] },
            { title: 'Identify themes', description: 'Find key insights and themes.', assigneeRole: 'lead', dueOffset: 40, priority: 'high', labels: ['insights'] },
            { title: 'Benchmark comparison', description: 'Compare to prior years and benchmarks.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['benchmarking'] },
          ],
        },
        {
          name: 'Action Planning',
          description: 'Drive improvements',
          tasks: [
            { title: 'Share results', description: 'Communicate results to organization.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['communication'] },
            { title: 'Manager action planning', description: 'Managers create team action plans.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['action'] },
            { title: 'Track progress', description: 'Monitor action plan implementation.', assigneeRole: 'member', dueOffset: 120, priority: 'medium', labels: ['tracking'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['design', 'fielding', 'analysis', 'action'] },
    },
    settings: { annual: true },
  },

  // ==================== 35. PULSE SURVEY ====================
  {
    name: 'Pulse Survey',
    slug: 'pulse-survey',
    description: 'Quick pulse surveys to gather frequent employee feedback on specific topics.',
    category: 'hr',
    icon: 'Activity',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'active', name: 'Active', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Topic', type: 'text', description: 'Pulse survey topic', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Survey Setup',
          description: 'Prepare pulse survey',
          tasks: [
            { title: 'Define survey topic', description: 'Choose focus area for pulse.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Create questions', description: 'Write 3-5 quick questions.', assigneeRole: 'member', dueOffset: 2, priority: 'high', labels: ['design'] },
            { title: 'Configure survey', description: 'Setup in survey tool.', assigneeRole: 'member', dueOffset: 3, priority: 'medium', labels: ['setup'] },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Collect responses',
          tasks: [
            { title: 'Launch pulse', description: 'Send pulse survey.', assigneeRole: 'member', dueOffset: 4, priority: 'high', labels: ['launch'] },
            { title: 'Monitor response rate', description: 'Track participation.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['monitoring'] },
            { title: 'Close survey', description: 'End data collection.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['close'] },
          ],
        },
        {
          name: 'Results Review',
          description: 'Analyze and share results',
          tasks: [
            { title: 'Analyze results', description: 'Review pulse responses.', assigneeRole: 'lead', dueOffset: 11, priority: 'high', labels: ['analysis'] },
            { title: 'Share insights', description: 'Communicate findings.', assigneeRole: 'lead', dueOffset: 13, priority: 'high', labels: ['communication'] },
            { title: 'Identify actions', description: 'Determine follow-up actions.', assigneeRole: 'lead', dueOffset: 14, priority: 'medium', labels: ['action'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['design', 'active', 'analysis', 'completed'] },
    },
    settings: { recurring: true, quickCycle: true },
  },

  // ==================== 36. EXIT INTERVIEW PROCESS ====================
  {
    name: 'Exit Interview Process',
    slug: 'exit-interview-process',
    description: 'Systematic exit interview process to gather insights from departing employees.',
    category: 'hr',
    icon: 'MessageSquare',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'scheduled', name: 'Scheduled', order: 0, color: '#6B7280' },
      { id: 'conducted', name: 'Conducted', order: 1, color: '#3B82F6' },
      { id: 'analyzed', name: 'Analyzed', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Exit Type', type: 'select', description: 'Type of departure', options: ['Voluntary', 'Involuntary', 'Retirement'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Interview Scheduling',
          description: 'Schedule exit interviews',
          tasks: [
            { title: 'Identify departing employees', description: 'Track upcoming exits.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['tracking'] },
            { title: 'Schedule interviews', description: 'Book exit interview times.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['scheduling'] },
            { title: 'Send questionnaire', description: 'Pre-interview survey option.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['survey'] },
          ],
        },
        {
          name: 'Interview Execution',
          description: 'Conduct exit interviews',
          tasks: [
            { title: 'Conduct interview', description: 'Hold exit conversation.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['interview'] },
            { title: 'Document feedback', description: 'Record key insights.', assigneeRole: 'member', dueOffset: 11, priority: 'high', labels: ['documentation'] },
            { title: 'Thank departing employee', description: 'Express appreciation.', assigneeRole: 'lead', dueOffset: 12, priority: 'medium', labels: ['appreciation'] },
          ],
        },
        {
          name: 'Analysis and Action',
          description: 'Analyze exit data',
          tasks: [
            { title: 'Enter data in system', description: 'Log interview in HR system.', assigneeRole: 'member', dueOffset: 13, priority: 'high', labels: ['data-entry'] },
            { title: 'Identify patterns', description: 'Look for trends in exits.', assigneeRole: 'lead', dueOffset: 30, priority: 'medium', labels: ['analysis'] },
            { title: 'Share insights', description: 'Report findings to leadership.', assigneeRole: 'lead', dueOffset: 60, priority: 'medium', labels: ['reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['scheduled', 'conducted', 'analyzed', 'completed'] },
    },
    settings: { ongoing: true },
  },

  // ==================== 37. OFFBOARDING PROCESS ====================
  {
    name: 'Offboarding Process',
    slug: 'offboarding-process',
    description: 'Comprehensive employee offboarding checklist for smooth departures.',
    category: 'hr',
    icon: 'UserMinus',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'notification', name: 'Notification', order: 0, color: '#6B7280' },
      { id: 'transition', name: 'Transition', order: 1, color: '#3B82F6' },
      { id: 'final_day', name: 'Final Day', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Last Day', type: 'date', description: 'Employee last day', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Initial Steps',
          description: 'Process departure notification',
          tasks: [
            { title: 'Receive resignation', description: 'Accept and acknowledge departure.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['admin'] },
            { title: 'Notify stakeholders', description: 'Inform HR, IT, Finance.', assigneeRole: 'member', dueOffset: 1, priority: 'high', labels: ['notification'] },
            { title: 'Create transition plan', description: 'Plan knowledge transfer.', assigneeRole: 'lead', dueOffset: 2, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Transition',
          description: 'Execute knowledge transfer',
          tasks: [
            { title: 'Document responsibilities', description: 'Capture job knowledge.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['documentation'] },
            { title: 'Transfer projects', description: 'Hand off ongoing work.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['transition'] },
            { title: 'Update contacts', description: 'Redirect client relationships.', assigneeRole: 'member', dueOffset: 10, priority: 'medium', labels: ['contacts'] },
          ],
        },
        {
          name: 'Final Day Checklist',
          description: 'Last day activities',
          tasks: [
            { title: 'Collect equipment', description: 'Return company assets.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['equipment'] },
            { title: 'Revoke access', description: 'Disable all system access.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['security'] },
            { title: 'Process final pay', description: 'Complete payroll processing.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['payroll'] },
            { title: 'Exit interview', description: 'Conduct departure interview.', assigneeRole: 'lead', dueOffset: 14, priority: 'medium', labels: ['interview'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['notification', 'transition', 'final_day', 'completed'] },
    },
    settings: { compliance: true },
  },

  // ==================== 38. TERMINATION PROCESS ====================
  {
    name: 'Termination Process',
    slug: 'termination-process',
    description: 'Structured involuntary termination process ensuring legal compliance and dignity.',
    category: 'hr',
    icon: 'XCircle',
    color: '#B91C1C',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'notification', name: 'Notification', order: 1, color: '#3B82F6' },
      { id: 'processing', name: 'Processing', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Termination Reason', type: 'select', description: 'Reason for termination', options: ['Performance', 'Conduct', 'Position Elimination', 'Other'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Termination',
          description: 'Prepare for termination',
          tasks: [
            { title: 'Document justification', description: 'Compile performance/conduct records.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['documentation'] },
            { title: 'Legal review', description: 'Get legal approval for termination.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['legal'] },
            { title: 'Prepare paperwork', description: 'Create separation documents.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['paperwork'] },
          ],
        },
        {
          name: 'Termination Meeting',
          description: 'Conduct termination',
          tasks: [
            { title: 'Schedule meeting', description: 'Plan termination conversation.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['scheduling'] },
            { title: 'Conduct meeting', description: 'Deliver termination news.', assigneeRole: 'lead', dueOffset: 8, priority: 'high', labels: ['meeting'] },
            { title: 'Provide separation info', description: 'Explain benefits, final pay.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['information'] },
          ],
        },
        {
          name: 'Post-Termination',
          description: 'Complete termination process',
          tasks: [
            { title: 'Immediate access removal', description: 'Disable systems immediately.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['security'] },
            { title: 'Collect property', description: 'Retrieve company assets.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['property'] },
            { title: 'Process final pay', description: 'Calculate and issue final check.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['payroll'] },
            { title: 'Update records', description: 'Complete HR file and systems.', assigneeRole: 'member', dueOffset: 12, priority: 'medium', labels: ['records'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['preparation', 'notification', 'processing', 'completed'] },
    },
    settings: { confidential: true, legalCompliance: true },
  },

  // ==================== 39. LAYOFF MANAGEMENT ====================
  {
    name: 'Layoff Management',
    slug: 'layoff-management',
    description: 'Managing workforce reductions with compliance, compassion, and clear communication.',
    category: 'hr',
    icon: 'TrendingDown',
    color: '#991B1B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'preparation', name: 'Preparation', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'support', name: 'Support', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Affected Headcount', type: 'number', description: 'Number of positions eliminated', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Strategic Planning',
          description: 'Plan layoff approach',
          tasks: [
            { title: 'Define scope', description: 'Determine extent of reductions.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Selection criteria', description: 'Establish fair selection process.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['criteria'] },
            { title: 'Legal review', description: 'Ensure WARN Act and legal compliance.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['legal'] },
          ],
        },
        {
          name: 'Preparation',
          description: 'Prepare for layoff execution',
          tasks: [
            { title: 'Finalize affected list', description: 'Confirm employees impacted.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['list'] },
            { title: 'Prepare severance packages', description: 'Create separation offers.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['severance'] },
            { title: 'Train managers', description: 'Prepare managers for conversations.', assigneeRole: 'lead', dueOffset: 20, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Notification Day',
          description: 'Execute layoff notifications',
          tasks: [
            { title: 'Notify affected employees', description: 'Conduct individual notifications.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['notification'] },
            { title: 'Company-wide communication', description: 'Announce changes to organization.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['communication'] },
            { title: 'System access handling', description: 'Manage system access changes.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['access'] },
          ],
        },
        {
          name: 'Transition Support',
          description: 'Support affected employees',
          tasks: [
            { title: 'Outplacement services', description: 'Provide career transition support.', assigneeRole: 'member', dueOffset: 22, priority: 'high', labels: ['outplacement'] },
            { title: 'Benefits information', description: 'Explain COBRA and benefits.', assigneeRole: 'member', dueOffset: 24, priority: 'high', labels: ['benefits'] },
            { title: 'Remaining staff support', description: 'Address survivor morale.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['morale'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'preparation', 'execution', 'support'] },
    },
    settings: { confidential: true, sensitive: true },
  },

  // ==================== 40. OUTPLACEMENT SUPPORT ====================
  {
    name: 'Outplacement Support',
    slug: 'outplacement-support',
    description: 'Career transition support program for employees affected by layoffs or restructuring.',
    category: 'hr',
    icon: 'Compass',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'active_support', name: 'Active Support', order: 1, color: '#3B82F6' },
      { id: 'transition', name: 'Transition', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Support Level', type: 'select', description: 'Level of outplacement support', options: ['Basic', 'Standard', 'Executive'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Setup',
          description: 'Establish outplacement support',
          tasks: [
            { title: 'Select outplacement provider', description: 'Choose and contract vendor.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['vendor'] },
            { title: 'Define support packages', description: 'Determine services by level.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['planning'] },
            { title: 'Enroll participants', description: 'Register affected employees.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['enrollment'] },
          ],
        },
        {
          name: 'Career Support',
          description: 'Provide transition resources',
          tasks: [
            { title: 'Resume assistance', description: 'Help with resume updates.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['resume'] },
            { title: 'Interview coaching', description: 'Prepare for interviews.', assigneeRole: 'member', dueOffset: 15, priority: 'high', labels: ['coaching'] },
            { title: 'Job search support', description: 'Assist with job searching.', assigneeRole: 'member', dueOffset: 20, priority: 'high', labels: ['job-search'] },
            { title: 'Networking assistance', description: 'Help build professional network.', assigneeRole: 'member', dueOffset: 25, priority: 'medium', labels: ['networking'] },
          ],
        },
        {
          name: 'Monitoring',
          description: 'Track progress',
          tasks: [
            { title: 'Weekly check-ins', description: 'Regular progress updates.', assigneeRole: 'member', dueOffset: 30, priority: 'medium', labels: ['check-in'] },
            { title: 'Track placements', description: 'Monitor job placement success.', assigneeRole: 'lead', dueOffset: 60, priority: 'medium', labels: ['tracking'] },
            { title: 'Program evaluation', description: 'Assess program effectiveness.', assigneeRole: 'lead', dueOffset: 90, priority: 'low', labels: ['evaluation'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['setup', 'active_support', 'transition', 'completed'] },
    },
    settings: { supportive: true },
  },

  // ==================== 41. ALUMNI NETWORK LAUNCH ====================
  {
    name: 'Alumni Network Launch',
    slug: 'alumni-network-launch',
    description: 'Launch and manage a corporate alumni network to maintain relationships with former employees.',
    category: 'hr',
    icon: 'Network',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'development', name: 'Development', order: 1, color: '#3B82F6' },
      { id: 'launch', name: 'Launch', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Platform', type: 'text', description: 'Alumni platform or tool', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Program Design',
          description: 'Design alumni network',
          tasks: [
            { title: 'Define program objectives', description: 'Set goals for alumni network.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Select platform', description: 'Choose alumni management platform.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['technology'] },
            { title: 'Create program structure', description: 'Design membership and benefits.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['design'] },
          ],
        },
        {
          name: 'Platform Development',
          description: 'Build alumni infrastructure',
          tasks: [
            { title: 'Setup platform', description: 'Configure alumni system.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['setup'] },
            { title: 'Create content', description: 'Develop initial content and resources.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['content'] },
            { title: 'Test platform', description: 'Test functionality with pilot group.', assigneeRole: 'member', dueOffset: 49, priority: 'high', labels: ['testing'] },
          ],
        },
        {
          name: 'Launch',
          description: 'Launch alumni network',
          tasks: [
            { title: 'Build alumni database', description: 'Compile former employee contacts.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['data'] },
            { title: 'Launch communications', description: 'Announce network to alumni.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['launch'] },
            { title: 'Host launch event', description: 'Kickoff event for network.', assigneeRole: 'lead', dueOffset: 65, priority: 'medium', labels: ['event'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'development', 'launch', 'active'] },
    },
    settings: { ongoing: true },
  },

  // ==================== 42. RECRUITMENT CAMPAIGN ====================
  {
    name: 'Recruitment Campaign',
    slug: 'recruitment-campaign',
    description: 'Large-scale recruitment campaign for hiring multiple positions or expanding teams.',
    category: 'hr',
    icon: 'Megaphone',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'active', name: 'Active', order: 1, color: '#3B82F6' },
      { id: 'closing', name: 'Closing', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Hires', type: 'number', description: 'Number of positions to fill', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Campaign Planning',
          description: 'Plan recruitment campaign',
          tasks: [
            { title: 'Define hiring needs', description: 'Identify positions and requirements.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Set campaign budget', description: 'Allocate recruitment budget.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['budget'] },
            { title: 'Create employer branding', description: 'Develop campaign messaging.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['branding'] },
          ],
        },
        {
          name: 'Campaign Execution',
          description: 'Run recruitment campaign',
          tasks: [
            { title: 'Post job advertisements', description: 'Publish across channels.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['advertising'] },
            { title: 'Social media campaign', description: 'Promote on social platforms.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['social'] },
            { title: 'Attend job fairs', description: 'Participate in recruitment events.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['events'] },
            { title: 'Employee referral push', description: 'Encourage internal referrals.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['referrals'] },
          ],
        },
        {
          name: 'Candidate Processing',
          description: 'Process applicants',
          tasks: [
            { title: 'Screen applications', description: 'Review incoming applications.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['screening'] },
            { title: 'Conduct interviews', description: 'Interview qualified candidates.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['interviews'] },
            { title: 'Make offers', description: 'Extend offers to selected candidates.', assigneeRole: 'lead', dueOffset: 56, priority: 'high', labels: ['offers'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'active', 'closing', 'completed'] },
    },
    settings: { highVolume: true },
  },

  // ==================== 43. CAMPUS RECRUITMENT ====================
  {
    name: 'Campus Recruitment',
    slug: 'campus-recruitment',
    description: 'University and college recruitment program for entry-level hiring and internships.',
    category: 'hr',
    icon: 'BookOpen',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'campus_events', name: 'Campus Events', order: 1, color: '#3B82F6' },
      { id: 'selection', name: 'Selection', order: 2, color: '#F59E0B' },
      { id: 'onboarding', name: 'Onboarding', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Schools', type: 'text', description: 'Target universities/colleges', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Planning',
          description: 'Plan campus recruiting',
          tasks: [
            { title: 'Identify target schools', description: 'Select universities to recruit from.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Define positions', description: 'Determine entry-level openings.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['roles'] },
            { title: 'Schedule campus visits', description: 'Book career fairs and events.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['scheduling'] },
          ],
        },
        {
          name: 'Campus Engagement',
          description: 'Engage with students',
          tasks: [
            { title: 'Career fair participation', description: 'Staff and attend career fairs.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['events'] },
            { title: 'Information sessions', description: 'Host company presentations.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['presentations'] },
            { title: 'Campus interviews', description: 'Conduct on-campus interviews.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['interviews'] },
          ],
        },
        {
          name: 'Selection Process',
          description: 'Select and hire candidates',
          tasks: [
            { title: 'Second round interviews', description: 'Bring finalists to office.', assigneeRole: 'lead', dueOffset: 56, priority: 'high', labels: ['interviews'] },
            { title: 'Extend offers', description: 'Make offers to selected students.', assigneeRole: 'lead', dueOffset: 63, priority: 'high', labels: ['offers'] },
            { title: 'Track acceptances', description: 'Monitor offer acceptance rates.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['tracking'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'campus_events', 'selection', 'onboarding'] },
    },
    settings: { seasonal: true },
  },

  // ==================== 44. EXECUTIVE SEARCH ====================
  {
    name: 'Executive Search',
    slug: 'executive-search',
    description: 'Executive-level recruitment process for senior leadership positions.',
    category: 'hr',
    icon: 'Search',
    color: '#1E3A8A',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'specification', name: 'Specification', order: 0, color: '#6B7280' },
      { id: 'search', name: 'Search', order: 1, color: '#3B82F6' },
      { id: 'assessment', name: 'Assessment', order: 2, color: '#F59E0B' },
      { id: 'offer', name: 'Offer', order: 3, color: '#8B5CF6' },
      { id: 'placed', name: 'Placed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Position', type: 'text', description: 'Executive position title', isRequired: true },
      { name: 'Search Firm', type: 'text', description: 'Executive search firm', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Search Definition',
          description: 'Define search requirements',
          tasks: [
            { title: 'Define role requirements', description: 'Document executive profile.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['specification'] },
            { title: 'Select search firm', description: 'Engage executive search partner.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['vendor'] },
            { title: 'Brief search firm', description: 'Provide detailed requirements.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['briefing'] },
          ],
        },
        {
          name: 'Candidate Search',
          description: 'Identify candidates',
          tasks: [
            { title: 'Market mapping', description: 'Identify potential candidates.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['research'] },
            { title: 'Candidate outreach', description: 'Approach target candidates.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['outreach'] },
            { title: 'Review longlist', description: 'Evaluate initial candidates.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['review'] },
          ],
        },
        {
          name: 'Assessment',
          description: 'Evaluate candidates',
          tasks: [
            { title: 'First round interviews', description: 'Initial executive interviews.', assigneeRole: 'lead', dueOffset: 56, priority: 'high', labels: ['interviews'] },
            { title: 'Reference checks', description: 'Conduct thorough references.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['references'] },
            { title: 'Board presentations', description: 'Present finalists to board.', assigneeRole: 'lead', dueOffset: 77, priority: 'high', labels: ['presentation'] },
          ],
        },
        {
          name: 'Offer and Close',
          description: 'Secure executive hire',
          tasks: [
            { title: 'Negotiate offer', description: 'Develop and negotiate package.', assigneeRole: 'lead', dueOffset: 84, priority: 'high', labels: ['negotiation'] },
            { title: 'Due diligence', description: 'Background verification.', assigneeRole: 'member', dueOffset: 88, priority: 'high', labels: ['verification'] },
            { title: 'Onboarding planning', description: 'Plan executive onboarding.', assigneeRole: 'lead', dueOffset: 95, priority: 'high', labels: ['onboarding'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['specification', 'search', 'assessment', 'offer', 'placed'] },
    },
    settings: { confidential: true, executive: true },
  },

  // ==================== 45. CONTRACTOR HIRING ====================
  {
    name: 'Contractor Hiring',
    slug: 'contractor-hiring',
    description: 'Process for hiring contractors and temporary workers for project-based or seasonal needs.',
    category: 'hr',
    icon: 'Briefcase',
    color: '#F97316',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'requisition', name: 'Requisition', order: 0, color: '#6B7280' },
      { id: 'sourcing', name: 'Sourcing', order: 1, color: '#3B82F6' },
      { id: 'contracting', name: 'Contracting', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Contract Duration', type: 'text', description: 'Length of contract', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Request and Approval',
          description: 'Initiate contractor request',
          tasks: [
            { title: 'Submit contractor request', description: 'Document need for contractor.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['request'] },
            { title: 'Budget approval', description: 'Secure budget for engagement.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['approval'] },
            { title: 'Define requirements', description: 'Document skills and scope.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['requirements'] },
          ],
        },
        {
          name: 'Sourcing',
          description: 'Find contractors',
          tasks: [
            { title: 'Engage staffing agencies', description: 'Contact preferred vendors.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['sourcing'] },
            { title: 'Review candidates', description: 'Evaluate contractor profiles.', assigneeRole: 'lead', dueOffset: 12, priority: 'high', labels: ['review'] },
            { title: 'Interview contractors', description: 'Screen potential contractors.', assigneeRole: 'lead', dueOffset: 16, priority: 'high', labels: ['interviews'] },
          ],
        },
        {
          name: 'Contracting',
          description: 'Finalize engagement',
          tasks: [
            { title: 'Negotiate rates', description: 'Agree on compensation.', assigneeRole: 'lead', dueOffset: 20, priority: 'high', labels: ['negotiation'] },
            { title: 'Execute contract', description: 'Sign engagement agreement.', assigneeRole: 'member', dueOffset: 23, priority: 'high', labels: ['contract'] },
            { title: 'Onboard contractor', description: 'Provide access and orientation.', assigneeRole: 'member', dueOffset: 26, priority: 'high', labels: ['onboarding'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['requisition', 'sourcing', 'contracting', 'active'] },
    },
    settings: { contingent: true },
  },

  // ==================== 46. FREELANCER MANAGEMENT ====================
  {
    name: 'Freelancer Management',
    slug: 'freelancer-management',
    description: 'Managing freelance talent pool for project-based work and flexible staffing.',
    category: 'hr',
    icon: 'User',
    color: '#14B8A6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'vetting', name: 'Vetting', order: 0, color: '#6B7280' },
      { id: 'pool', name: 'Pool', order: 1, color: '#3B82F6' },
      { id: 'engaged', name: 'Engaged', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Skill Category', type: 'text', description: 'Freelancer specialty', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Freelancer Onboarding',
          description: 'Vet and add freelancers',
          tasks: [
            { title: 'Review portfolio', description: 'Evaluate freelancer work samples.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['vetting'] },
            { title: 'Interview freelancer', description: 'Assess skills and fit.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['interview'] },
            { title: 'Complete paperwork', description: 'Collect contracts and tax forms.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['admin'] },
          ],
        },
        {
          name: 'Project Assignment',
          description: 'Engage freelancers on projects',
          tasks: [
            { title: 'Define project scope', description: 'Document deliverables and timeline.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['scope'] },
            { title: 'Match freelancer', description: 'Select best fit for project.', assigneeRole: 'lead', dueOffset: 12, priority: 'high', labels: ['matching'] },
            { title: 'Brief freelancer', description: 'Provide project details.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['briefing'] },
          ],
        },
        {
          name: 'Project Management',
          description: 'Manage freelancer engagement',
          tasks: [
            { title: 'Monitor progress', description: 'Track deliverable completion.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['monitoring'] },
            { title: 'Review deliverables', description: 'Evaluate work quality.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['review'] },
            { title: 'Process payment', description: 'Pay for completed work.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['payment'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['vetting', 'pool', 'engaged', 'completed'] },
    },
    settings: { gigEconomy: true },
  },

  // ==================== 47. RPO IMPLEMENTATION ====================
  {
    name: 'RPO Implementation',
    slug: 'rpo-implementation',
    description: 'Recruitment Process Outsourcing implementation with external recruitment partner.',
    category: 'hr',
    icon: 'Settings',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'selection', name: 'Selection', order: 0, color: '#6B7280' },
      { id: 'transition', name: 'Transition', order: 1, color: '#3B82F6' },
      { id: 'stabilization', name: 'Stabilization', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'RPO Provider', type: 'text', description: 'Selected RPO partner', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Provider Selection',
          description: 'Select RPO partner',
          tasks: [
            { title: 'Define requirements', description: 'Document RPO needs and scope.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['requirements'] },
            { title: 'Issue RFP', description: 'Send request for proposals.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['procurement'] },
            { title: 'Evaluate proposals', description: 'Review and score providers.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['evaluation'] },
            { title: 'Select provider', description: 'Choose RPO partner.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['selection'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Transition to RPO',
          tasks: [
            { title: 'Contract negotiation', description: 'Finalize agreement terms.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['contract'] },
            { title: 'Knowledge transfer', description: 'Share processes and requirements.', assigneeRole: 'member', dueOffset: 49, priority: 'high', labels: ['transition'] },
            { title: 'System integration', description: 'Connect ATS and processes.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['technology'] },
          ],
        },
        {
          name: 'Optimization',
          description: 'Optimize RPO partnership',
          tasks: [
            { title: 'Monitor SLAs', description: 'Track performance metrics.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['performance'] },
            { title: 'Quarterly reviews', description: 'Regular partnership reviews.', assigneeRole: 'lead', dueOffset: 90, priority: 'medium', labels: ['review'] },
            { title: 'Process improvements', description: 'Identify optimization opportunities.', assigneeRole: 'member', dueOffset: 120, priority: 'medium', labels: ['improvement'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['selection', 'transition', 'stabilization', 'optimization'] },
    },
    settings: { outsourcing: true },
  },

  // ==================== 48. ATS IMPLEMENTATION ====================
  {
    name: 'ATS Implementation',
    slug: 'ats-implementation',
    description: 'Applicant Tracking System implementation or upgrade project.',
    category: 'hr',
    icon: 'Database',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'selection', name: 'Selection', order: 0, color: '#6B7280' },
      { id: 'configuration', name: 'Configuration', order: 1, color: '#3B82F6' },
      { id: 'testing', name: 'Testing', order: 2, color: '#F59E0B' },
      { id: 'rollout', name: 'Rollout', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'ATS Platform', type: 'text', description: 'Selected ATS system', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Selection',
          description: 'Select ATS platform',
          tasks: [
            { title: 'Define requirements', description: 'Document ATS needs.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['requirements'] },
            { title: 'Evaluate vendors', description: 'Demo and compare systems.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['evaluation'] },
            { title: 'Select platform', description: 'Choose ATS vendor.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['selection'] },
          ],
        },
        {
          name: 'Configuration',
          description: 'Setup and configure ATS',
          tasks: [
            { title: 'Configure workflows', description: 'Setup hiring workflows.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['configuration'] },
            { title: 'Integrate systems', description: 'Connect HRIS and other tools.', assigneeRole: 'member', dueOffset: 49, priority: 'high', labels: ['integration'] },
            { title: 'Data migration', description: 'Import historical data.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['migration'] },
          ],
        },
        {
          name: 'Testing and Training',
          description: 'Test and train users',
          tasks: [
            { title: 'User acceptance testing', description: 'Test all functionality.', assigneeRole: 'member', dueOffset: 63, priority: 'high', labels: ['testing'] },
            { title: 'Train recruiters', description: 'Train recruitment team.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['training'] },
            { title: 'Train hiring managers', description: 'Train manager users.', assigneeRole: 'member', dueOffset: 77, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Launch',
          description: 'Go-live and support',
          tasks: [
            { title: 'Go-live', description: 'Launch new ATS system.', assigneeRole: 'lead', dueOffset: 84, priority: 'high', labels: ['launch'] },
            { title: 'Provide support', description: 'Support users post-launch.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['support'] },
            { title: 'Post-implementation review', description: 'Assess implementation success.', assigneeRole: 'lead', dueOffset: 120, priority: 'medium', labels: ['review'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['selection', 'configuration', 'testing', 'rollout'] },
    },
    settings: { technology: true },
  },

  // ==================== 49. HRIS IMPLEMENTATION ====================
  {
    name: 'HRIS Implementation',
    slug: 'hris-implementation',
    description: 'Human Resource Information System implementation or major upgrade.',
    category: 'hr',
    icon: 'Server',
    color: '#4F46E5',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'build', name: 'Build', order: 1, color: '#3B82F6' },
      { id: 'testing', name: 'Testing', order: 2, color: '#F59E0B' },
      { id: 'deployment', name: 'Deployment', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'HRIS Platform', type: 'text', description: 'HRIS system name', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Project Planning',
          description: 'Plan HRIS implementation',
          tasks: [
            { title: 'Define scope', description: 'Document modules and features.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['scope'] },
            { title: 'Assemble project team', description: 'Form implementation team.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['team'] },
            { title: 'Create project plan', description: 'Develop detailed timeline.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'System Build',
          description: 'Configure and customize',
          tasks: [
            { title: 'Configure core HR', description: 'Setup employee records module.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['configuration'] },
            { title: 'Setup payroll integration', description: 'Connect payroll systems.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['integration'] },
            { title: 'Build reports', description: 'Create required reports.', assigneeRole: 'member', dueOffset: 56, priority: 'medium', labels: ['reporting'] },
            { title: 'Data migration', description: 'Migrate employee data.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['migration'] },
          ],
        },
        {
          name: 'Testing',
          description: 'Validate system',
          tasks: [
            { title: 'System testing', description: 'Test all functionality.', assigneeRole: 'member', dueOffset: 84, priority: 'high', labels: ['testing'] },
            { title: 'User acceptance testing', description: 'End user validation.', assigneeRole: 'lead', dueOffset: 98, priority: 'high', labels: ['uat'] },
            { title: 'Parallel payroll run', description: 'Validate payroll accuracy.', assigneeRole: 'member', dueOffset: 105, priority: 'high', labels: ['payroll'] },
          ],
        },
        {
          name: 'Go-Live',
          description: 'Deploy system',
          tasks: [
            { title: 'Train users', description: 'Comprehensive user training.', assigneeRole: 'lead', dueOffset: 112, priority: 'high', labels: ['training'] },
            { title: 'Go-live', description: 'Launch new HRIS.', assigneeRole: 'lead', dueOffset: 120, priority: 'high', labels: ['launch'] },
            { title: 'Hypercare support', description: 'Intensive post-launch support.', assigneeRole: 'member', dueOffset: 150, priority: 'high', labels: ['support'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'build', 'testing', 'deployment'] },
    },
    settings: { majorProject: true },
  },

  // ==================== 50. PAYROLL SYSTEM MIGRATION ====================
  {
    name: 'Payroll System Migration',
    slug: 'payroll-system-migration',
    description: 'Migration to new payroll system ensuring accurate and compliant payroll processing.',
    category: 'hr',
    icon: 'DollarSign',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'configuration', name: 'Configuration', order: 1, color: '#3B82F6' },
      { id: 'parallel', name: 'Parallel Run', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Go-Live', type: 'date', description: 'Planned go-live date', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan payroll migration',
          tasks: [
            { title: 'Document current state', description: 'Map existing payroll setup.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['documentation'] },
            { title: 'Define requirements', description: 'Detail new system needs.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['requirements'] },
            { title: 'Create migration plan', description: 'Develop detailed timeline.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'System Setup',
          description: 'Configure new payroll',
          tasks: [
            { title: 'Configure earnings/deductions', description: 'Setup pay codes.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['configuration'] },
            { title: 'Setup tax tables', description: 'Configure tax calculations.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['taxes'] },
            { title: 'Migrate employee data', description: 'Import employee records.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['migration'] },
          ],
        },
        {
          name: 'Validation',
          description: 'Test and validate',
          tasks: [
            { title: 'Parallel payroll run 1', description: 'First parallel comparison.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['testing'] },
            { title: 'Reconcile differences', description: 'Resolve discrepancies.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['reconciliation'] },
            { title: 'Parallel payroll run 2', description: 'Second parallel comparison.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['testing'] },
          ],
        },
        {
          name: 'Cutover',
          description: 'Go-live activities',
          tasks: [
            { title: 'Train payroll team', description: 'Train on new system.', assigneeRole: 'lead', dueOffset: 77, priority: 'high', labels: ['training'] },
            { title: 'Final data sync', description: 'Last data migration.', assigneeRole: 'member', dueOffset: 82, priority: 'high', labels: ['migration'] },
            { title: 'Go-live', description: 'Process first live payroll.', assigneeRole: 'lead', dueOffset: 84, priority: 'high', labels: ['launch'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'configuration', 'parallel', 'live'] },
    },
    settings: { critical: true },
  },];
