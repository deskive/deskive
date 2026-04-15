/**
 * Pre-built Automation Templates
 * These templates are seeded into the database and available for all users
 */

export const automationTemplates = [
  // ============================================
  // PROJECT MANAGEMENT
  // ============================================
  {
    name: 'New Project Setup',
    description:
      'Automatically create default folders and starter tasks when a new project is created',
    category: 'project_management',
    icon: 'folder_special',
    color: '#4CAF50',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'project',
          eventType: 'created',
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Create Documents folder',
          config: {
            action: 'create_folder',
            params: {
              name: 'Documents',
              projectId: '{{trigger.entity.id}}',
            },
          },
        },
        {
          type: 'action',
          name: 'Create Resources folder',
          config: {
            action: 'create_folder',
            params: {
              name: 'Resources',
              projectId: '{{trigger.entity.id}}',
            },
          },
        },
        {
          type: 'action',
          name: 'Create kickoff task',
          config: {
            action: 'create_task',
            params: {
              title: 'Project Kickoff Meeting',
              description:
                'Schedule and conduct the project kickoff meeting with all stakeholders.',
              projectId: '{{trigger.entity.id}}',
              priority: 'high',
              dueDate: '{{add_days(now, 3)}}',
            },
          },
        },
        {
          type: 'action',
          name: 'Notify creator',
          config: {
            action: 'send_notification',
            params: {
              userId: '{{trigger.entity.created_by}}',
              title: 'Project Setup Complete',
              message:
                'Your project "{{trigger.entity.name}}" has been set up with default folders and tasks.',
            },
          },
        },
      ],
    },
    variables: [
      {
        name: 'kickoff_days',
        type: 'number',
        default: 3,
        description: 'Days until kickoff meeting due',
      },
    ],
  },

  {
    name: 'Task Completion Notification',
    description: 'Notify project manager when any task is marked as complete',
    category: 'project_management',
    icon: 'task_alt',
    color: '#2196F3',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'task',
          eventType: 'completed',
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Notify on completion',
          config: {
            action: 'send_notification',
            params: {
              userId: '{{trigger.entity.project.manager_id}}',
              title: 'Task Completed',
              message: '"{{trigger.entity.title}}" has been completed by {{trigger.triggeredBy}}.',
            },
          },
        },
      ],
    },
    variables: [],
  },

  {
    name: 'Auto-assign by Priority',
    description: 'Automatically assign high-priority tasks to team lead',
    category: 'project_management',
    icon: 'assignment_ind',
    color: '#FF5722',
    is_featured: false,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'task',
          eventType: 'created',
          filters: {
            priorityValues: ['high', 'urgent'],
          },
        },
      },
      steps: [
        {
          type: 'condition',
          name: 'Check if unassigned',
          config: {
            condition: {
              operator: 'AND',
              conditions: [{ field: 'trigger.entity.assignee_id', operator: 'is_empty' }],
            },
          },
        },
        {
          type: 'action',
          name: 'Assign to team lead',
          config: {
            action: 'assign_task',
            params: {
              taskId: '{{trigger.entity.id}}',
              assigneeId: '{{team_lead_id}}',
            },
          },
        },
        {
          type: 'action',
          name: 'Notify team lead',
          config: {
            action: 'send_notification',
            params: {
              userId: '{{team_lead_id}}',
              title: 'High Priority Task Assigned',
              message:
                'You have been assigned a {{trigger.entity.priority}} priority task: "{{trigger.entity.title}}"',
            },
          },
        },
      ],
    },
    variables: [
      {
        name: 'team_lead_id',
        type: 'string',
        description: 'User ID of the team lead to auto-assign to',
      },
    ],
  },

  // ============================================
  // DEADLINES & REMINDERS
  // ============================================
  {
    name: 'Due Date Reminder (24 Hours)',
    description: 'Send a reminder notification 24 hours before a task is due',
    category: 'productivity',
    icon: 'alarm',
    color: '#FFC107',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'schedule',
        config: {
          cronExpression: '0 * * * *', // Every hour
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Check and notify upcoming tasks',
          config: {
            action: 'ai_autopilot',
            params: {
              command:
                'Find all tasks due in the next 24 hours and send reminder notifications to assignees',
            },
          },
        },
      ],
    },
    variables: [],
  },

  {
    name: 'Overdue Task Escalation',
    description: 'Escalate overdue tasks by increasing priority and notifying manager',
    category: 'productivity',
    icon: 'warning',
    color: '#F44336',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'schedule',
        config: {
          cronExpression: '0 9 * * *', // Daily at 9 AM
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Escalate overdue tasks',
          config: {
            action: 'ai_autopilot',
            params: {
              command:
                'Find all tasks overdue by more than 2 days, increase their priority to high, and notify the project manager',
            },
          },
        },
      ],
    },
    variables: [
      {
        name: 'overdue_days',
        type: 'number',
        default: 2,
        description: 'Days overdue before escalation',
      },
    ],
  },

  // ============================================
  // COMMUNICATION
  // ============================================
  {
    name: 'Daily Standup Summary',
    description: 'Generate and post a daily standup summary every morning',
    category: 'communication',
    icon: 'groups',
    color: '#9C27B0',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'schedule',
        config: {
          cronExpression: '0 9 * * 1-5', // Weekdays at 9 AM
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Generate standup summary',
          config: {
            action: 'ai_autopilot',
            params: {
              command:
                'Generate a daily standup summary including: tasks completed yesterday, tasks planned for today, and any blockers. Post to the team channel.',
            },
          },
        },
      ],
    },
    variables: [
      { name: 'channel_id', type: 'string', description: 'Channel ID to post standup summary' },
    ],
  },

  {
    name: 'Weekly Progress Report',
    description: 'Generate and send a weekly progress report every Friday',
    category: 'communication',
    icon: 'assessment',
    color: '#3F51B5',
    is_featured: false,
    is_system: true,
    template_config: {
      trigger: {
        type: 'schedule',
        config: {
          cronExpression: '0 16 * * 5', // Friday at 4 PM
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Generate weekly report',
          config: {
            action: 'ai_autopilot',
            params: {
              command:
                'Generate a comprehensive weekly progress report including: completed tasks, ongoing work, upcoming deadlines, and team productivity metrics. Send via email to stakeholders.',
            },
          },
        },
      ],
    },
    variables: [
      {
        name: 'stakeholder_emails',
        type: 'array',
        description: 'Email addresses for weekly report',
      },
    ],
  },

  // ============================================
  // APPROVALS
  // ============================================
  {
    name: 'Approval Request Routing',
    description: 'Route approval requests to the appropriate approver based on type',
    category: 'approvals',
    icon: 'verified',
    color: '#00BCD4',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'approval',
          eventType: 'created',
        },
      },
      steps: [
        {
          type: 'condition',
          name: 'Check approval type',
          config: {
            condition: {
              operator: 'OR',
              conditions: [
                { field: 'trigger.entity.type', operator: 'equals', value: 'expense' },
                { field: 'trigger.entity.amount', operator: 'greater_than', value: 1000 },
              ],
            },
          },
        },
        {
          type: 'action',
          name: 'Notify finance team',
          config: {
            action: 'send_notification',
            params: {
              userId: '{{finance_manager_id}}',
              title: 'Approval Request Pending',
              message: 'A new {{trigger.entity.type}} approval request requires your attention.',
            },
          },
        },
        {
          type: 'action',
          name: 'Send email notification',
          config: {
            action: 'send_email',
            params: {
              to: '{{finance_email}}',
              subject: 'New Approval Request: {{trigger.entity.title}}',
              body: 'Please review the pending approval request.',
            },
          },
        },
      ],
    },
    variables: [
      { name: 'finance_manager_id', type: 'string', description: 'User ID of finance manager' },
      { name: 'finance_email', type: 'string', description: 'Finance team email' },
    ],
  },

  {
    name: 'Approval Approved Notification',
    description: 'Notify the requester when their approval is granted',
    category: 'approvals',
    icon: 'thumb_up',
    color: '#4CAF50',
    is_featured: false,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'approval',
          eventType: 'approved',
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Notify requester',
          config: {
            action: 'send_notification',
            params: {
              userId: '{{trigger.entity.requested_by}}',
              title: 'Approval Granted',
              message:
                'Your {{trigger.entity.type}} request "{{trigger.entity.title}}" has been approved!',
            },
          },
        },
      ],
    },
    variables: [],
  },

  // ============================================
  // ONBOARDING
  // ============================================
  {
    name: 'New Member Onboarding',
    description: 'Create onboarding tasks when a new member joins a project',
    category: 'onboarding',
    icon: 'person_add',
    color: '#E91E63',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'project',
          eventType: 'updated',
          filters: {
            fieldChanges: ['members'],
          },
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Create welcome task',
          config: {
            action: 'create_task',
            params: {
              title: 'Welcome! Complete onboarding checklist',
              description:
                '1. Review project documentation\\n2. Meet the team\\n3. Set up development environment\\n4. Complete first task',
              projectId: '{{trigger.entity.id}}',
              assigneeId: '{{trigger.new_member_id}}',
              priority: 'high',
              dueDate: '{{add_days(now, 7)}}',
            },
          },
        },
        {
          type: 'action',
          name: 'Create documentation review task',
          config: {
            action: 'create_task',
            params: {
              title: 'Review project documentation',
              projectId: '{{trigger.entity.id}}',
              assigneeId: '{{trigger.new_member_id}}',
              priority: 'medium',
              dueDate: '{{add_days(now, 2)}}',
            },
          },
        },
        {
          type: 'action',
          name: 'Notify project manager',
          config: {
            action: 'send_notification',
            params: {
              userId: '{{trigger.entity.manager_id}}',
              title: 'New Team Member',
              message:
                'A new member has joined {{trigger.entity.name}}. Onboarding tasks have been created.',
            },
          },
        },
      ],
    },
    variables: [],
  },

  // ============================================
  // MEETING & CALENDAR
  // ============================================
  {
    name: 'Meeting Follow-up Tasks',
    description: 'Create follow-up tasks after a meeting ends',
    category: 'scheduling',
    icon: 'event_note',
    color: '#673AB7',
    is_featured: true,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'event',
          eventType: 'ended',
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Create meeting notes',
          config: {
            action: 'create_note',
            params: {
              title: 'Meeting Notes: {{trigger.entity.title}}',
              content:
                '## Meeting Notes\\n\\n**Date:** {{trigger.entity.start_time}}\\n\\n### Attendees\\n\\n### Discussion Points\\n\\n### Action Items\\n\\n### Next Steps',
            },
          },
        },
        {
          type: 'action',
          name: 'Create follow-up task',
          config: {
            action: 'create_task',
            params: {
              title: 'Review and complete action items from: {{trigger.entity.title}}',
              description: 'Review meeting notes and complete assigned action items.',
              assigneeId: '{{trigger.entity.organizer_id}}',
              dueDate: '{{add_days(now, 3)}}',
            },
          },
        },
      ],
    },
    variables: [],
  },

  {
    name: 'Meeting Reminder (15 minutes)',
    description: 'Send a reminder 15 minutes before meetings start',
    category: 'scheduling',
    icon: 'notifications_active',
    color: '#FF9800',
    is_featured: false,
    is_system: true,
    template_config: {
      trigger: {
        type: 'schedule',
        config: {
          cronExpression: '*/15 * * * *', // Every 15 minutes
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Check and send meeting reminders',
          config: {
            action: 'ai_autopilot',
            params: {
              command:
                'Find all meetings starting in the next 15 minutes and send reminder notifications to all attendees.',
            },
          },
        },
      ],
    },
    variables: [],
  },

  // ============================================
  // NOTES & DOCUMENTS
  // ============================================
  {
    name: 'Note to Task Converter',
    description: 'Create tasks from action items mentioned in notes',
    category: 'productivity',
    icon: 'transform',
    color: '#795548',
    is_featured: false,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'note',
          eventType: 'created',
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Extract and create tasks',
          config: {
            action: 'ai_autopilot',
            params: {
              command:
                'Analyze the note content and extract any action items or todos. Create tasks for each action item found.',
              context: {
                noteId: '{{trigger.entity.id}}',
                noteContent: '{{trigger.entity.content}}',
              },
            },
          },
        },
      ],
    },
    variables: [],
  },

  // ============================================
  // INTEGRATIONS
  // ============================================
  {
    name: 'Slack Channel Notification',
    description: 'Post updates to a Slack channel when important events occur',
    category: 'integrations',
    icon: 'chat',
    color: '#611f69',
    is_featured: false,
    is_system: true,
    template_config: {
      trigger: {
        type: 'entity_change',
        config: {
          entityType: 'task',
          eventType: 'completed',
          filters: {
            priorityValues: ['high', 'urgent'],
          },
        },
      },
      steps: [
        {
          type: 'action',
          name: 'Post to Slack',
          config: {
            action: 'call_webhook',
            params: {
              url: '{{slack_webhook_url}}',
              method: 'POST',
              body: {
                text: ':white_check_mark: Task completed: "{{trigger.entity.title}}"',
                channel: '{{slack_channel}}',
              },
            },
          },
        },
      ],
    },
    variables: [
      { name: 'slack_webhook_url', type: 'string', description: 'Slack incoming webhook URL' },
      {
        name: 'slack_channel',
        type: 'string',
        default: '#general',
        description: 'Slack channel name',
      },
    ],
  },
];

export default automationTemplates;
