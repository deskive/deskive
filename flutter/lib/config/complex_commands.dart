import 'package:flutter/material.dart';

/// Represents a complex multilevel command that chains multiple tools together
class ComplexCommand {
  final String id;
  final String titleKey;
  final String titleDefault;
  final String descriptionKey;
  final String descriptionDefault;
  final String command;
  final IconData icon;
  final Color color;
  final List<String> toolChain;
  final int estimatedSteps;

  const ComplexCommand({
    required this.id,
    required this.titleKey,
    required this.titleDefault,
    required this.descriptionKey,
    required this.descriptionDefault,
    required this.command,
    required this.icon,
    required this.color,
    required this.toolChain,
    required this.estimatedSteps,
  });
}

/// Category of complex commands
class ComplexCommandCategory {
  final String id;
  final String titleKey;
  final String titleDefault;
  final IconData icon;
  final Color color;
  final List<ComplexCommand> commands;

  const ComplexCommandCategory({
    required this.id,
    required this.titleKey,
    required this.titleDefault,
    required this.icon,
    required this.color,
    required this.commands,
  });
}

/// Configuration for complex multilevel commands
class ComplexCommands {
  static const List<ComplexCommandCategory> categories = [
    // Project Kickoff & Planning
    ComplexCommandCategory(
      id: 'project_planning',
      titleKey: 'complex_commands.category.project_planning',
      titleDefault: 'Project Planning',
      icon: Icons.rocket_launch_outlined,
      color: Color(0xFF6366F1), // Indigo
      commands: [
        ComplexCommand(
          id: 'start_project_with_milestones',
          titleKey: 'complex_commands.start_project_with_milestones.title',
          titleDefault: 'Start Project with Milestones',
          descriptionKey: 'complex_commands.start_project_with_milestones.description',
          descriptionDefault: 'Create a new project with milestone tasks and assign team leads',
          command: 'Start a new project with milestones and assign team leads to each milestone',
          icon: Icons.flag_outlined,
          color: Color(0xFF6366F1),
          toolChain: ['create_project', 'batch_create_tasks', 'list_workspace_members', 'batch_update_tasks'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'setup_sprint_from_doc',
          titleKey: 'complex_commands.setup_sprint_from_doc.title',
          titleDefault: 'Setup Sprint from Document',
          descriptionKey: 'complex_commands.setup_sprint_from_doc.description',
          descriptionDefault: 'Extract tasks from a document and create a sprint project',
          command: 'Set up sprint planning with tasks extracted from the attached document',
          icon: Icons.document_scanner_outlined,
          color: Color(0xFF6366F1),
          toolChain: ['analyze_document', 'extract_action_items', 'create_project', 'batch_create_tasks'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'project_from_meeting',
          titleKey: 'complex_commands.project_from_meeting.title',
          titleDefault: 'Project from Meeting Notes',
          descriptionKey: 'complex_commands.project_from_meeting.description',
          descriptionDefault: 'Create a project board from meeting notes and notify team',
          command: 'Create a project board from the meeting notes and notify the team about their assigned tasks',
          icon: Icons.meeting_room_outlined,
          color: Color(0xFF6366F1),
          toolChain: ['extract_action_items', 'create_project', 'batch_create_tasks', 'send_channel_message'],
          estimatedSteps: 4,
        ),
      ],
    ),

    // Meeting & Calendar Workflows
    ComplexCommandCategory(
      id: 'meeting_workflows',
      titleKey: 'complex_commands.category.meeting_workflows',
      titleDefault: 'Meeting Workflows',
      icon: Icons.calendar_month_outlined,
      color: Color(0xFF0EA5E9), // Sky Blue
      commands: [
        ComplexCommand(
          id: 'schedule_with_agenda',
          titleKey: 'complex_commands.schedule_with_agenda.title',
          titleDefault: 'Schedule Meeting with Agenda',
          descriptionKey: 'complex_commands.schedule_with_agenda.description',
          descriptionDefault: 'Schedule a meeting with all project members and create an agenda note',
          command: 'Schedule a meeting with all project members and create a linked agenda note for the meeting',
          icon: Icons.event_note_outlined,
          color: Color(0xFF0EA5E9),
          toolChain: ['get_project_details', 'list_workspace_members', 'create_calendar_event', 'create_note', 'link_to_resource'],
          estimatedSteps: 5,
        ),
        ComplexCommand(
          id: 'block_focus_time',
          titleKey: 'complex_commands.block_focus_time.title',
          titleDefault: 'Block Focus Time',
          descriptionKey: 'complex_commands.block_focus_time.description',
          descriptionDefault: 'Analyze workload and block focus time for overdue tasks',
          command: 'Block focus time on my calendar this week for working on my overdue tasks',
          icon: Icons.do_not_disturb_on_outlined,
          color: Color(0xFF0EA5E9),
          toolChain: ['get_overdue_tasks', 'get_current_date_time', 'create_calendar_event'],
          estimatedSteps: 3,
        ),
        ComplexCommand(
          id: 'setup_weekly_standup',
          titleKey: 'complex_commands.setup_weekly_standup.title',
          titleDefault: 'Setup Weekly Standup',
          descriptionKey: 'complex_commands.setup_weekly_standup.description',
          descriptionDefault: 'Create recurring standup with reminder and notes template',
          command: 'Set up a weekly standup meeting with a recurring reminder and create a meeting notes template',
          icon: Icons.repeat_outlined,
          color: Color(0xFF0EA5E9),
          toolChain: ['get_current_date_time', 'create_calendar_event', 'create_note', 'schedule_notification'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'prepare_tomorrow_briefing',
          titleKey: 'complex_commands.prepare_tomorrow_briefing.title',
          titleDefault: 'Prepare Tomorrow\'s Briefing',
          descriptionKey: 'complex_commands.prepare_tomorrow_briefing.description',
          descriptionDefault: 'Compile tomorrow\'s schedule and share with team',
          command: 'Prepare tomorrow\'s schedule briefing and share it with the team channel',
          icon: Icons.wb_sunny_outlined,
          color: Color(0xFF0EA5E9),
          toolChain: ['get_current_date_time', 'list_calendar_events', 'get_daily_summary', 'send_channel_message'],
          estimatedSteps: 4,
        ),
      ],
    ),

    // Task Management Workflows
    ComplexCommandCategory(
      id: 'task_workflows',
      titleKey: 'complex_commands.category.task_workflows',
      titleDefault: 'Task Workflows',
      icon: Icons.task_alt_outlined,
      color: Color(0xFF22C55E), // Green
      commands: [
        ComplexCommand(
          id: 'review_overdue_notify',
          titleKey: 'complex_commands.review_overdue_notify.title',
          titleDefault: 'Review & Notify Overdue',
          descriptionKey: 'complex_commands.review_overdue_notify.description',
          descriptionDefault: 'Review overdue tasks, create follow-ups, and notify assignees',
          command: 'Review all overdue tasks, create follow-up reminders for each, and notify the assignees about them',
          icon: Icons.notification_important_outlined,
          color: Color(0xFF22C55E),
          toolChain: ['get_overdue_tasks', 'batch_create_tasks', 'send_notification'],
          estimatedSteps: 3,
        ),
        ComplexCommand(
          id: 'breakdown_with_budget',
          titleKey: 'complex_commands.breakdown_with_budget.title',
          titleDefault: 'Task Breakdown with Budget',
          descriptionKey: 'complex_commands.breakdown_with_budget.description',
          descriptionDefault: 'Break down a task into subtasks with time estimates for budget',
          command: 'Break down this task into subtasks and estimate time for each to add to the project budget',
          icon: Icons.account_tree_outlined,
          color: Color(0xFF22C55E),
          toolChain: ['get_task_details', 'batch_create_tasks', 'create_budget'],
          estimatedSteps: 3,
        ),
        ComplexCommand(
          id: 'tasks_from_email',
          titleKey: 'complex_commands.tasks_from_email.title',
          titleDefault: 'Tasks from Email',
          descriptionKey: 'complex_commands.tasks_from_email.description',
          descriptionDefault: 'Extract tasks from email and assign to team members',
          command: 'Create tasks from this email and assign them to the relevant team members based on their expertise',
          icon: Icons.email_outlined,
          color: Color(0xFF22C55E),
          toolChain: ['extract_action_items', 'list_workspace_members', 'batch_create_tasks'],
          estimatedSteps: 3,
        ),
        ComplexCommand(
          id: 'complete_and_report',
          titleKey: 'complex_commands.complete_and_report.title',
          titleDefault: 'Complete & Generate Report',
          descriptionKey: 'complex_commands.complete_and_report.description',
          descriptionDefault: 'Complete all project tasks and generate a completion report',
          command: 'Complete all remaining tasks in this project and generate a project completion report',
          icon: Icons.assignment_turned_in_outlined,
          color: Color(0xFF22C55E),
          toolChain: ['list_tasks', 'complete_task', 'get_project_details', 'create_note'],
          estimatedSteps: 4,
        ),
      ],
    ),

    // Communication Workflows
    ComplexCommandCategory(
      id: 'communication',
      titleKey: 'complex_commands.category.communication',
      titleDefault: 'Communication',
      icon: Icons.forum_outlined,
      color: Color(0xFF06B6D4), // Cyan
      commands: [
        ComplexCommand(
          id: 'weekly_digest',
          titleKey: 'complex_commands.weekly_digest.title',
          titleDefault: 'Weekly Project Digest',
          descriptionKey: 'complex_commands.weekly_digest.description',
          descriptionDefault: 'Summarize weekly updates and send to stakeholders',
          command: 'Summarize this week\'s project updates and send a digest email to stakeholders',
          icon: Icons.summarize_outlined,
          color: Color(0xFF06B6D4),
          toolChain: ['get_weekly_summary', 'list_tasks', 'summarize_text', 'send_email'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'meeting_followup',
          titleKey: 'complex_commands.meeting_followup.title',
          titleDefault: 'Meeting Follow-up',
          descriptionKey: 'complex_commands.meeting_followup.description',
          descriptionDefault: 'Create meeting recap, extract action items, and assign to team',
          command: 'Write a meeting recap, extract action items, assign them to team members, and share in the channel',
          icon: Icons.rate_review_outlined,
          color: Color(0xFF06B6D4),
          toolChain: ['write_meeting_notes', 'extract_action_items', 'list_workspace_members', 'batch_create_tasks', 'send_channel_message'],
          estimatedSteps: 5,
        ),
        ComplexCommand(
          id: 'milestone_celebration',
          titleKey: 'complex_commands.milestone_celebration.title',
          titleDefault: 'Milestone Celebration',
          descriptionKey: 'complex_commands.milestone_celebration.description',
          descriptionDefault: 'Announce milestone completion and schedule celebration',
          command: 'Announce the project milestone completion to the team and schedule a celebration event',
          icon: Icons.celebration_outlined,
          color: Color(0xFF06B6D4),
          toolChain: ['get_project_details', 'send_channel_message', 'create_calendar_event', 'send_notification'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'status_report_email',
          titleKey: 'complex_commands.status_report_email.title',
          titleDefault: 'Auto Status Report',
          descriptionKey: 'complex_commands.status_report_email.description',
          descriptionDefault: 'Generate status update from completed tasks and email',
          command: 'Create a status update from my completed tasks this week and email it to my manager',
          icon: Icons.email_outlined,
          color: Color(0xFF06B6D4),
          toolChain: ['list_tasks', 'summarize_text', 'generate_email_draft', 'send_email'],
          estimatedSteps: 4,
        ),
      ],
    ),

    // Budget & Finance Workflows
    ComplexCommandCategory(
      id: 'budget_finance',
      titleKey: 'complex_commands.category.budget_finance',
      titleDefault: 'Budget & Finance',
      icon: Icons.account_balance_wallet_outlined,
      color: Color(0xFF14B8A6), // Teal
      commands: [
        ComplexCommand(
          id: 'quarterly_budget_setup',
          titleKey: 'complex_commands.quarterly_budget_setup.title',
          titleDefault: 'Quarterly Budget Setup',
          descriptionKey: 'complex_commands.quarterly_budget_setup.description',
          descriptionDefault: 'Create quarterly budget, allocate to projects, set alerts',
          command: 'Create a quarterly budget, allocate amounts to active projects, and set up spending threshold alerts',
          icon: Icons.calendar_view_month_outlined,
          color: Color(0xFF14B8A6),
          toolChain: ['create_budget', 'list_projects', 'schedule_notification'],
          estimatedSteps: 3,
        ),
        ComplexCommand(
          id: 'expense_report_approval',
          titleKey: 'complex_commands.expense_report_approval.title',
          titleDefault: 'Expense Report for Approval',
          descriptionKey: 'complex_commands.expense_report_approval.description',
          descriptionDefault: 'Generate expense report and submit for approval',
          command: 'Generate a spending report for this week\'s expenses and submit it for manager approval',
          icon: Icons.receipt_long_outlined,
          color: Color(0xFF14B8A6),
          toolChain: ['list_expenses', 'get_budget_summary', 'create_note', 'create_approval_request'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'budget_health_check',
          titleKey: 'complex_commands.budget_health_check.title',
          titleDefault: 'Budget Health Check',
          descriptionKey: 'complex_commands.budget_health_check.description',
          descriptionDefault: 'Analyze project burn rate and alert if over budget',
          command: 'Analyze the project burn rate and send an alert if we\'re approaching or over budget',
          icon: Icons.health_and_safety_outlined,
          color: Color(0xFF14B8A6),
          toolChain: ['get_budget_summary', 'list_tasks', 'send_notification'],
          estimatedSteps: 3,
        ),
      ],
    ),

    // Reporting & Analytics
    ComplexCommandCategory(
      id: 'reporting',
      titleKey: 'complex_commands.category.reporting',
      titleDefault: 'Reporting & Analytics',
      icon: Icons.analytics_outlined,
      color: Color(0xFF8B5CF6), // Violet
      commands: [
        ComplexCommand(
          id: 'team_performance_review',
          titleKey: 'complex_commands.team_performance_review.title',
          titleDefault: 'Team Performance Review',
          descriptionKey: 'complex_commands.team_performance_review.description',
          descriptionDefault: 'Generate team report and schedule review meeting',
          command: 'Generate a weekly team performance report and schedule a review meeting to discuss it',
          icon: Icons.groups_outlined,
          color: Color(0xFF8B5CF6),
          toolChain: ['get_weekly_summary', 'list_tasks', 'create_note', 'create_calendar_event'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'project_health_assessment',
          titleKey: 'complex_commands.project_health_assessment.title',
          titleDefault: 'Project Health Assessment',
          descriptionKey: 'complex_commands.project_health_assessment.description',
          descriptionDefault: 'Analyze project status and create risk assessment document',
          command: 'Analyze the project health including overdue tasks and budget status, and create a risk assessment document',
          icon: Icons.assessment_outlined,
          color: Color(0xFF8B5CF6),
          toolChain: ['get_project_details', 'get_overdue_tasks', 'get_budget_summary', 'create_document'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'eod_summary',
          titleKey: 'complex_commands.eod_summary.title',
          titleDefault: 'End of Day Summary',
          descriptionKey: 'complex_commands.eod_summary.description',
          descriptionDefault: 'Create EOD summary with tomorrow\'s priorities',
          command: 'Create an end-of-day summary with what I completed today and my priorities for tomorrow',
          icon: Icons.nightlight_outlined,
          color: Color(0xFF8B5CF6),
          toolChain: ['get_daily_summary', 'list_tasks', 'get_upcoming_events', 'create_note'],
          estimatedSteps: 4,
        ),
      ],
    ),

    // Video & Meeting Workflows
    ComplexCommandCategory(
      id: 'video_meetings',
      titleKey: 'complex_commands.category.video_meetings',
      titleDefault: 'Video Meetings',
      icon: Icons.videocam_outlined,
      color: Color(0xFFEC4899), // Pink
      commands: [
        ComplexCommand(
          id: 'quick_team_huddle',
          titleKey: 'complex_commands.quick_team_huddle.title',
          titleDefault: 'Quick Team Huddle',
          descriptionKey: 'complex_commands.quick_team_huddle.description',
          descriptionDefault: 'Start instant meeting, invite team, create notes',
          command: 'Start an instant video meeting with the project team and create a meeting notes document',
          icon: Icons.groups_2_outlined,
          color: Color(0xFFEC4899),
          toolChain: ['get_project_details', 'create_video_meeting', 'send_notification', 'create_note'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'client_demo_setup',
          titleKey: 'complex_commands.client_demo_setup.title',
          titleDefault: 'Client Demo Setup',
          descriptionKey: 'complex_commands.client_demo_setup.description',
          descriptionDefault: 'Schedule demo with prep checklist and invite',
          command: 'Schedule a client demo meeting with a preparation checklist and send the calendar invite via email',
          icon: Icons.present_to_all_outlined,
          color: Color(0xFFEC4899),
          toolChain: ['create_calendar_event', 'schedule_video_meeting', 'create_note', 'send_email'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'recording_summary',
          titleKey: 'complex_commands.recording_summary.title',
          titleDefault: 'Meeting Recording Summary',
          descriptionKey: 'complex_commands.recording_summary.description',
          descriptionDefault: 'Summarize meeting recording and share action items',
          command: 'Summarize the meeting recording, extract action items, create tasks, and share with the team',
          icon: Icons.video_library_outlined,
          color: Color(0xFFEC4899),
          toolChain: ['write_meeting_notes', 'extract_action_items', 'batch_create_tasks', 'send_channel_message'],
          estimatedSteps: 4,
        ),
      ],
    ),

    // Daily Productivity
    ComplexCommandCategory(
      id: 'daily_productivity',
      titleKey: 'complex_commands.category.daily_productivity',
      titleDefault: 'Daily Productivity',
      icon: Icons.wb_sunny_outlined,
      color: Color(0xFFF59E0B), // Amber
      commands: [
        ComplexCommand(
          id: 'morning_routine',
          titleKey: 'complex_commands.morning_routine.title',
          titleDefault: 'Morning Routine',
          descriptionKey: 'complex_commands.morning_routine.description',
          descriptionDefault: 'Show priorities, block focus time, prep for first meeting',
          command: 'Start my workday: show today\'s priorities, block focus time for important tasks, and prepare notes for my first meeting',
          icon: Icons.coffee_outlined,
          color: Color(0xFFF59E0B),
          toolChain: ['get_daily_summary', 'get_upcoming_events', 'create_calendar_event', 'create_note'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'end_of_day_routine',
          titleKey: 'complex_commands.end_of_day_routine.title',
          titleDefault: 'End of Day Routine',
          descriptionKey: 'complex_commands.end_of_day_routine.description',
          descriptionDefault: 'Update tasks, log progress, plan tomorrow',
          command: 'End my workday: update my task progress, log what I completed today, and plan my priorities for tomorrow',
          icon: Icons.nights_stay_outlined,
          color: Color(0xFFF59E0B),
          toolChain: ['list_tasks', 'update_task', 'create_note'],
          estimatedSteps: 3,
        ),
        ComplexCommand(
          id: 'vacation_handoff',
          titleKey: 'complex_commands.vacation_handoff.title',
          titleDefault: 'Vacation Handoff',
          descriptionKey: 'complex_commands.vacation_handoff.description',
          descriptionDefault: 'Reassign tasks and set OOO notice',
          command: 'I\'m going on vacation: reassign my pending tasks to team members and post an out-of-office notice to the team channel',
          icon: Icons.beach_access_outlined,
          color: Color(0xFFF59E0B),
          toolChain: ['list_tasks', 'list_workspace_members', 'batch_update_tasks', 'send_channel_message'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'vacation_catchup',
          titleKey: 'complex_commands.vacation_catchup.title',
          titleDefault: 'Vacation Catch-up',
          descriptionKey: 'complex_commands.vacation_catchup.description',
          descriptionDefault: 'Catch up on what you missed while away',
          command: 'I\'m back from vacation: give me a summary of what I missed, show my assigned tasks, and any mentions or pending approvals',
          icon: Icons.flight_land_outlined,
          color: Color(0xFFF59E0B),
          toolChain: ['get_weekly_summary', 'list_tasks', 'list_approval_requests'],
          estimatedSteps: 3,
        ),
      ],
    ),

    // Approval Workflows
    ComplexCommandCategory(
      id: 'approvals',
      titleKey: 'complex_commands.category.approvals',
      titleDefault: 'Approval Workflows',
      icon: Icons.approval_outlined,
      color: Color(0xFF7C3AED), // Purple
      commands: [
        ComplexCommand(
          id: 'submit_plan_approval',
          titleKey: 'complex_commands.submit_plan_approval.title',
          titleDefault: 'Submit Plan for Approval',
          descriptionKey: 'complex_commands.submit_plan_approval.description',
          descriptionDefault: 'Create project plan document and submit for approval',
          command: 'Create a project plan document and submit it for leadership approval with a follow-up reminder',
          icon: Icons.send_and_archive_outlined,
          color: Color(0xFF7C3AED),
          toolChain: ['get_project_details', 'create_document', 'create_approval_request', 'schedule_notification'],
          estimatedSteps: 4,
        ),
        ComplexCommand(
          id: 'chase_pending_approvals',
          titleKey: 'complex_commands.chase_pending_approvals.title',
          titleDefault: 'Chase Pending Approvals',
          descriptionKey: 'complex_commands.chase_pending_approvals.description',
          descriptionDefault: 'Review pending approvals and send reminders',
          command: 'Review all pending approvals and send reminder notifications to the approvers who haven\'t responded',
          icon: Icons.notifications_active_outlined,
          color: Color(0xFF7C3AED),
          toolChain: ['list_approval_requests', 'send_notification'],
          estimatedSteps: 2,
        ),
      ],
    ),
  ];

  /// Get all complex commands as a flat list
  static List<ComplexCommand> get allCommands {
    return categories.expand((cat) => cat.commands).toList();
  }

  /// Get a category by ID
  static ComplexCommandCategory? getCategoryById(String id) {
    try {
      return categories.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Get a command by ID
  static ComplexCommand? getCommandById(String id) {
    for (final category in categories) {
      for (final command in category.commands) {
        if (command.id == id) return command;
      }
    }
    return null;
  }
}
