/// Workflow Automation Models

// ============================================
// ENUMS
// ============================================

enum WorkflowTriggerType {
  entityChange,
  schedule,
  webhook,
  manual;

  String get value {
    switch (this) {
      case WorkflowTriggerType.entityChange:
        return 'entity_change';
      case WorkflowTriggerType.schedule:
        return 'schedule';
      case WorkflowTriggerType.webhook:
        return 'webhook';
      case WorkflowTriggerType.manual:
        return 'manual';
    }
  }

  static WorkflowTriggerType fromString(String value) {
    switch (value) {
      case 'entity_change':
        return WorkflowTriggerType.entityChange;
      case 'schedule':
        return WorkflowTriggerType.schedule;
      case 'webhook':
        return WorkflowTriggerType.webhook;
      case 'manual':
        return WorkflowTriggerType.manual;
      default:
        return WorkflowTriggerType.manual;
    }
  }

  String get displayName {
    switch (this) {
      case WorkflowTriggerType.entityChange:
        return 'When something changes';
      case WorkflowTriggerType.schedule:
        return 'On a schedule';
      case WorkflowTriggerType.webhook:
        return 'When webhook is called';
      case WorkflowTriggerType.manual:
        return 'Run manually';
    }
  }

  String get icon {
    switch (this) {
      case WorkflowTriggerType.entityChange:
        return 'bolt';
      case WorkflowTriggerType.schedule:
        return 'schedule';
      case WorkflowTriggerType.webhook:
        return 'webhook';
      case WorkflowTriggerType.manual:
        return 'play_arrow';
    }
  }
}

enum EntityType {
  task,
  note,
  event,
  file,
  project,
  message,
  approval;

  String get value => name;

  static EntityType fromString(String value) {
    return EntityType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EntityType.task,
    );
  }

  String get displayName {
    switch (this) {
      case EntityType.task:
        return 'Task';
      case EntityType.note:
        return 'Note';
      case EntityType.event:
        return 'Calendar Event';
      case EntityType.file:
        return 'File';
      case EntityType.project:
        return 'Project';
      case EntityType.message:
        return 'Message';
      case EntityType.approval:
        return 'Approval';
    }
  }

  String get icon {
    switch (this) {
      case EntityType.task:
        return 'task_alt';
      case EntityType.note:
        return 'note';
      case EntityType.event:
        return 'event';
      case EntityType.file:
        return 'folder';
      case EntityType.project:
        return 'folder_special';
      case EntityType.message:
        return 'chat';
      case EntityType.approval:
        return 'verified';
    }
  }
}

enum EntityEventType {
  created,
  updated,
  deleted,
  statusChanged,
  assigned,
  completed,
  dueDateChanged,
  priorityChanged,
  commented,
  shared,
  started,
  ended,
  approved,
  rejected;

  String get value {
    switch (this) {
      case EntityEventType.statusChanged:
        return 'status_changed';
      case EntityEventType.dueDateChanged:
        return 'due_date_changed';
      case EntityEventType.priorityChanged:
        return 'priority_changed';
      default:
        return name;
    }
  }

  static EntityEventType fromString(String value) {
    switch (value) {
      case 'status_changed':
        return EntityEventType.statusChanged;
      case 'due_date_changed':
        return EntityEventType.dueDateChanged;
      case 'priority_changed':
        return EntityEventType.priorityChanged;
      default:
        return EntityEventType.values.firstWhere(
          (e) => e.name == value,
          orElse: () => EntityEventType.updated,
        );
    }
  }

  String get displayName {
    switch (this) {
      case EntityEventType.created:
        return 'is created';
      case EntityEventType.updated:
        return 'is updated';
      case EntityEventType.deleted:
        return 'is deleted';
      case EntityEventType.statusChanged:
        return 'status changes';
      case EntityEventType.assigned:
        return 'is assigned';
      case EntityEventType.completed:
        return 'is completed';
      case EntityEventType.dueDateChanged:
        return 'due date changes';
      case EntityEventType.priorityChanged:
        return 'priority changes';
      case EntityEventType.commented:
        return 'receives a comment';
      case EntityEventType.shared:
        return 'is shared';
      case EntityEventType.started:
        return 'starts';
      case EntityEventType.ended:
        return 'ends';
      case EntityEventType.approved:
        return 'is approved';
      case EntityEventType.rejected:
        return 'is rejected';
    }
  }
}

enum WorkflowStepType {
  action,
  condition,
  delay,
  loop,
  parallel,
  setVariable,
  subWorkflow,
  stop;

  String get value {
    switch (this) {
      case WorkflowStepType.setVariable:
        return 'set_variable';
      default:
        return name;
    }
  }

  static WorkflowStepType fromString(String value) {
    switch (value) {
      case 'set_variable':
        return WorkflowStepType.setVariable;
      default:
        return WorkflowStepType.values.firstWhere(
          (e) => e.name == value,
          orElse: () => WorkflowStepType.action,
        );
    }
  }

  String get displayName {
    switch (this) {
      case WorkflowStepType.action:
        return 'Action';
      case WorkflowStepType.condition:
        return 'Condition';
      case WorkflowStepType.delay:
        return 'Delay';
      case WorkflowStepType.loop:
        return 'Loop';
      case WorkflowStepType.parallel:
        return 'Parallel';
      case WorkflowStepType.setVariable:
        return 'Set Variable';
      case WorkflowStepType.subWorkflow:
        return 'Sub Workflow';
      case WorkflowStepType.stop:
        return 'Stop';
    }
  }

  String get icon {
    switch (this) {
      case WorkflowStepType.action:
        return 'flash_on';
      case WorkflowStepType.condition:
        return 'call_split';
      case WorkflowStepType.delay:
        return 'timer';
      case WorkflowStepType.loop:
        return 'loop';
      case WorkflowStepType.parallel:
        return 'account_tree';
      case WorkflowStepType.setVariable:
        return 'data_object';
      case WorkflowStepType.subWorkflow:
        return 'account_tree';
      case WorkflowStepType.stop:
        return 'stop';
    }
  }
}

enum WorkflowActionType {
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  assignTask,
  setDueDate,
  setPriority,
  addSubtask,
  moveTask,
  duplicateTask,
  createNote,
  updateNote,
  shareNote,
  appendToNote,
  createEvent,
  updateEvent,
  sendInvite,
  addAttendee,
  sendMessage,
  sendEmail,
  sendNotification,
  sendSlackMessage,
  postComment,
  aiGenerate,
  aiSummarize,
  aiTranslate,
  aiAnalyze,
  aiAutopilot,
  runAiAction,
  callWebhook,
  callApi,
  createProject,
  addProjectMember,
  updateProjectStatus,
  createFolder,
  moveFile,
  moveToProject,
  generateDocument,
  createApproval,
  requestApproval,
  approve,
  reject,
  delay,
  assignUser,
  changeStatus,
  addTag,
  removeTag;

  String get value {
    // Convert camelCase to snake_case
    return name.replaceAllMapped(
      RegExp(r'[A-Z]'),
      (match) => '_${match.group(0)!.toLowerCase()}',
    );
  }

  static WorkflowActionType fromString(String value) {
    // Convert snake_case to camelCase and find matching enum
    final camelCase = value.replaceAllMapped(
      RegExp(r'_([a-z])'),
      (match) => match.group(1)!.toUpperCase(),
    );
    return WorkflowActionType.values.firstWhere(
      (e) => e.name == camelCase,
      orElse: () => WorkflowActionType.sendNotification,
    );
  }

  String get displayName {
    switch (this) {
      case WorkflowActionType.createTask:
        return 'Create Task';
      case WorkflowActionType.updateTask:
        return 'Update Task';
      case WorkflowActionType.deleteTask:
        return 'Delete Task';
      case WorkflowActionType.completeTask:
        return 'Complete Task';
      case WorkflowActionType.assignTask:
        return 'Assign Task';
      case WorkflowActionType.setDueDate:
        return 'Set Due Date';
      case WorkflowActionType.setPriority:
        return 'Set Priority';
      case WorkflowActionType.addSubtask:
        return 'Add Subtask';
      case WorkflowActionType.moveTask:
        return 'Move Task';
      case WorkflowActionType.duplicateTask:
        return 'Duplicate Task';
      case WorkflowActionType.createNote:
        return 'Create Note';
      case WorkflowActionType.updateNote:
        return 'Update Note';
      case WorkflowActionType.shareNote:
        return 'Share Note';
      case WorkflowActionType.appendToNote:
        return 'Append to Note';
      case WorkflowActionType.createEvent:
        return 'Create Event';
      case WorkflowActionType.updateEvent:
        return 'Update Event';
      case WorkflowActionType.sendInvite:
        return 'Send Invite';
      case WorkflowActionType.addAttendee:
        return 'Add Attendee';
      case WorkflowActionType.sendMessage:
        return 'Send Message';
      case WorkflowActionType.sendEmail:
        return 'Send Email';
      case WorkflowActionType.sendNotification:
        return 'Send Notification';
      case WorkflowActionType.postComment:
        return 'Post Comment';
      case WorkflowActionType.sendSlackMessage:
        return 'Send Slack Message';
      case WorkflowActionType.aiGenerate:
        return 'AI Generate';
      case WorkflowActionType.aiSummarize:
        return 'AI Summarize';
      case WorkflowActionType.aiTranslate:
        return 'AI Translate';
      case WorkflowActionType.aiAnalyze:
        return 'AI Analyze';
      case WorkflowActionType.aiAutopilot:
        return 'AI Autopilot';
      case WorkflowActionType.runAiAction:
        return 'Run AI Action';
      case WorkflowActionType.callWebhook:
        return 'Call Webhook';
      case WorkflowActionType.callApi:
        return 'Call API';
      case WorkflowActionType.createProject:
        return 'Create Project';
      case WorkflowActionType.addProjectMember:
        return 'Add Project Member';
      case WorkflowActionType.updateProjectStatus:
        return 'Update Project Status';
      case WorkflowActionType.createFolder:
        return 'Create Folder';
      case WorkflowActionType.moveFile:
        return 'Move File';
      case WorkflowActionType.moveToProject:
        return 'Move to Project';
      case WorkflowActionType.generateDocument:
        return 'Generate Document';
      case WorkflowActionType.createApproval:
        return 'Create Approval';
      case WorkflowActionType.requestApproval:
        return 'Request Approval';
      case WorkflowActionType.approve:
        return 'Approve';
      case WorkflowActionType.reject:
        return 'Reject';
      case WorkflowActionType.delay:
        return 'Delay';
      case WorkflowActionType.assignUser:
        return 'Assign User';
      case WorkflowActionType.changeStatus:
        return 'Change Status';
      case WorkflowActionType.addTag:
        return 'Add Tag';
      case WorkflowActionType.removeTag:
        return 'Remove Tag';
    }
  }

  String get category {
    switch (this) {
      case WorkflowActionType.createTask:
      case WorkflowActionType.updateTask:
      case WorkflowActionType.deleteTask:
      case WorkflowActionType.completeTask:
      case WorkflowActionType.assignTask:
      case WorkflowActionType.setDueDate:
      case WorkflowActionType.setPriority:
      case WorkflowActionType.addSubtask:
      case WorkflowActionType.moveTask:
      case WorkflowActionType.duplicateTask:
        return 'Tasks';
      case WorkflowActionType.createNote:
      case WorkflowActionType.updateNote:
      case WorkflowActionType.shareNote:
      case WorkflowActionType.appendToNote:
        return 'Notes';
      case WorkflowActionType.createEvent:
      case WorkflowActionType.updateEvent:
      case WorkflowActionType.sendInvite:
      case WorkflowActionType.addAttendee:
        return 'Calendar';
      case WorkflowActionType.sendMessage:
      case WorkflowActionType.sendEmail:
      case WorkflowActionType.sendNotification:
      case WorkflowActionType.sendSlackMessage:
      case WorkflowActionType.postComment:
        return 'Communication';
      case WorkflowActionType.aiGenerate:
      case WorkflowActionType.aiSummarize:
      case WorkflowActionType.aiTranslate:
      case WorkflowActionType.aiAnalyze:
      case WorkflowActionType.aiAutopilot:
      case WorkflowActionType.runAiAction:
        return 'AI';
      case WorkflowActionType.callWebhook:
      case WorkflowActionType.callApi:
        return 'Integrations';
      case WorkflowActionType.createProject:
      case WorkflowActionType.addProjectMember:
      case WorkflowActionType.updateProjectStatus:
      case WorkflowActionType.moveToProject:
        return 'Projects';
      case WorkflowActionType.createFolder:
      case WorkflowActionType.moveFile:
      case WorkflowActionType.generateDocument:
        return 'Files';
      case WorkflowActionType.createApproval:
      case WorkflowActionType.requestApproval:
      case WorkflowActionType.approve:
      case WorkflowActionType.reject:
        return 'Approvals';
      case WorkflowActionType.delay:
      case WorkflowActionType.assignUser:
      case WorkflowActionType.changeStatus:
      case WorkflowActionType.addTag:
      case WorkflowActionType.removeTag:
        return 'General';
    }
  }

  String get icon {
    switch (this) {
      case WorkflowActionType.createTask:
        return 'add_task';
      case WorkflowActionType.updateTask:
        return 'edit';
      case WorkflowActionType.deleteTask:
        return 'delete';
      case WorkflowActionType.completeTask:
        return 'check_circle';
      case WorkflowActionType.assignTask:
        return 'person_add';
      case WorkflowActionType.setDueDate:
        return 'event';
      case WorkflowActionType.setPriority:
        return 'priority_high';
      case WorkflowActionType.addSubtask:
        return 'playlist_add';
      case WorkflowActionType.moveTask:
        return 'drive_file_move';
      case WorkflowActionType.duplicateTask:
        return 'content_copy';
      case WorkflowActionType.createNote:
        return 'note_add';
      case WorkflowActionType.updateNote:
        return 'edit_note';
      case WorkflowActionType.shareNote:
        return 'share';
      case WorkflowActionType.appendToNote:
        return 'post_add';
      case WorkflowActionType.createEvent:
        return 'event';
      case WorkflowActionType.updateEvent:
        return 'edit_calendar';
      case WorkflowActionType.sendInvite:
        return 'mail';
      case WorkflowActionType.addAttendee:
        return 'group_add';
      case WorkflowActionType.sendMessage:
        return 'chat';
      case WorkflowActionType.sendEmail:
        return 'email';
      case WorkflowActionType.sendNotification:
        return 'notifications';
      case WorkflowActionType.postComment:
        return 'comment';
      case WorkflowActionType.sendSlackMessage:
        return 'chat';
      case WorkflowActionType.aiGenerate:
        return 'auto_awesome';
      case WorkflowActionType.aiSummarize:
        return 'summarize';
      case WorkflowActionType.aiTranslate:
        return 'translate';
      case WorkflowActionType.aiAnalyze:
        return 'analytics';
      case WorkflowActionType.aiAutopilot:
        return 'smart_toy';
      case WorkflowActionType.runAiAction:
        return 'auto_fix_high';
      case WorkflowActionType.callWebhook:
        return 'webhook';
      case WorkflowActionType.callApi:
        return 'api';
      case WorkflowActionType.createProject:
        return 'create_new_folder';
      case WorkflowActionType.addProjectMember:
        return 'person_add';
      case WorkflowActionType.updateProjectStatus:
        return 'update';
      case WorkflowActionType.createFolder:
        return 'create_new_folder';
      case WorkflowActionType.moveFile:
        return 'drive_file_move';
      case WorkflowActionType.moveToProject:
        return 'folder_move';
      case WorkflowActionType.generateDocument:
        return 'description';
      case WorkflowActionType.createApproval:
        return 'approval';
      case WorkflowActionType.requestApproval:
        return 'request_quote';
      case WorkflowActionType.approve:
        return 'thumb_up';
      case WorkflowActionType.reject:
        return 'thumb_down';
      case WorkflowActionType.delay:
        return 'timer';
      case WorkflowActionType.assignUser:
        return 'person_add';
      case WorkflowActionType.changeStatus:
        return 'sync_alt';
      case WorkflowActionType.addTag:
        return 'label';
      case WorkflowActionType.removeTag:
        return 'label_off';
    }
  }
}

enum ConditionOperator {
  equals,
  notEquals,
  contains,
  notContains,
  startsWith,
  endsWith,
  greaterThan,
  lessThan,
  greaterOrEqual,
  lessOrEqual,
  isEmpty,
  isNotEmpty,
  inList,
  notInList,
  matchesRegex,
  isTrue,
  isFalse;

  String get value {
    switch (this) {
      case ConditionOperator.notEquals:
        return 'not_equals';
      case ConditionOperator.notContains:
        return 'not_contains';
      case ConditionOperator.startsWith:
        return 'starts_with';
      case ConditionOperator.endsWith:
        return 'ends_with';
      case ConditionOperator.greaterThan:
        return 'greater_than';
      case ConditionOperator.lessThan:
        return 'less_than';
      case ConditionOperator.greaterOrEqual:
        return 'greater_or_equal';
      case ConditionOperator.lessOrEqual:
        return 'less_or_equal';
      case ConditionOperator.isEmpty:
        return 'is_empty';
      case ConditionOperator.isNotEmpty:
        return 'is_not_empty';
      case ConditionOperator.inList:
        return 'in_list';
      case ConditionOperator.notInList:
        return 'not_in_list';
      case ConditionOperator.matchesRegex:
        return 'matches_regex';
      case ConditionOperator.isTrue:
        return 'is_true';
      case ConditionOperator.isFalse:
        return 'is_false';
      default:
        return name;
    }
  }

  String get displayName {
    switch (this) {
      case ConditionOperator.equals:
        return 'equals';
      case ConditionOperator.notEquals:
        return 'does not equal';
      case ConditionOperator.contains:
        return 'contains';
      case ConditionOperator.notContains:
        return 'does not contain';
      case ConditionOperator.startsWith:
        return 'starts with';
      case ConditionOperator.endsWith:
        return 'ends with';
      case ConditionOperator.greaterThan:
        return 'is greater than';
      case ConditionOperator.lessThan:
        return 'is less than';
      case ConditionOperator.greaterOrEqual:
        return 'is greater or equal';
      case ConditionOperator.lessOrEqual:
        return 'is less or equal';
      case ConditionOperator.isEmpty:
        return 'is empty';
      case ConditionOperator.isNotEmpty:
        return 'is not empty';
      case ConditionOperator.inList:
        return 'is in list';
      case ConditionOperator.notInList:
        return 'is not in list';
      case ConditionOperator.matchesRegex:
        return 'matches pattern';
      case ConditionOperator.isTrue:
        return 'is true';
      case ConditionOperator.isFalse:
        return 'is false';
    }
  }
}

enum WorkflowExecutionStatus {
  pending,
  running,
  completed,
  failed,
  cancelled;

  String get value => name;

  static WorkflowExecutionStatus fromString(String value) {
    return WorkflowExecutionStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => WorkflowExecutionStatus.pending,
    );
  }

  String get displayName {
    switch (this) {
      case WorkflowExecutionStatus.pending:
        return 'Pending';
      case WorkflowExecutionStatus.running:
        return 'Running';
      case WorkflowExecutionStatus.completed:
        return 'Completed';
      case WorkflowExecutionStatus.failed:
        return 'Failed';
      case WorkflowExecutionStatus.cancelled:
        return 'Cancelled';
    }
  }

  String get icon {
    switch (this) {
      case WorkflowExecutionStatus.pending:
        return 'hourglass_empty';
      case WorkflowExecutionStatus.running:
        return 'play_circle';
      case WorkflowExecutionStatus.completed:
        return 'check_circle';
      case WorkflowExecutionStatus.failed:
        return 'error';
      case WorkflowExecutionStatus.cancelled:
        return 'cancel';
    }
  }
}

// ============================================
// MODELS
// ============================================

class Workflow {
  final String id;
  final String workspaceId;
  final String createdBy;
  final String name;
  final String? description;
  final String? icon;
  final String? color;
  final bool isActive;
  final WorkflowTriggerType triggerType;
  final Map<String, dynamic> triggerConfig;
  final int runCount;
  final int successCount;
  final int failureCount;
  final DateTime? lastRunAt;
  final String? lastRunStatus;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<WorkflowStep>? steps;

  Workflow({
    required this.id,
    required this.workspaceId,
    required this.createdBy,
    required this.name,
    this.description,
    this.icon,
    this.color,
    required this.isActive,
    required this.triggerType,
    required this.triggerConfig,
    this.runCount = 0,
    this.successCount = 0,
    this.failureCount = 0,
    this.lastRunAt,
    this.lastRunStatus,
    required this.createdAt,
    required this.updatedAt,
    this.steps,
  });

  factory Workflow.fromJson(Map<String, dynamic> json) {
    return Workflow(
      id: json['id'] ?? '',
      workspaceId: json['workspaceId'] ?? json['workspace_id'] ?? '',
      createdBy: json['createdBy'] ?? json['created_by'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      icon: json['icon'],
      color: json['color'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      triggerType: WorkflowTriggerType.fromString(
        json['triggerType'] ?? json['trigger_type'] ?? 'manual',
      ),
      triggerConfig: json['triggerConfig'] ?? json['trigger_config'] ?? {},
      runCount: json['runCount'] ?? json['run_count'] ?? 0,
      successCount: json['successCount'] ?? json['success_count'] ?? 0,
      failureCount: json['failureCount'] ?? json['failure_count'] ?? 0,
      lastRunAt: json['lastRunAt'] != null || json['last_run_at'] != null
          ? DateTime.tryParse(json['lastRunAt'] ?? json['last_run_at'])
          : null,
      lastRunStatus: json['lastRunStatus'] ?? json['last_run_status'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? json['updated_at'] ?? '') ?? DateTime.now(),
      steps: json['steps'] != null
          ? (json['steps'] as List).map((s) => WorkflowStep.fromJson(s)).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'createdBy': createdBy,
      'name': name,
      'description': description,
      'icon': icon,
      'color': color,
      'isActive': isActive,
      'triggerType': triggerType.value,
      'triggerConfig': triggerConfig,
      'runCount': runCount,
      'successCount': successCount,
      'failureCount': failureCount,
      'lastRunAt': lastRunAt?.toIso8601String(),
      'lastRunStatus': lastRunStatus,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'steps': steps?.map((s) => s.toJson()).toList(),
    };
  }

  double get successRate {
    if (runCount == 0) return 0;
    return successCount / runCount * 100;
  }

  String get triggerDescription {
    switch (triggerType) {
      case WorkflowTriggerType.entityChange:
        final entityType = triggerConfig['entityType'] ?? 'item';
        final eventType = triggerConfig['eventType'] ?? 'changes';
        return 'When $entityType $eventType';
      case WorkflowTriggerType.schedule:
        return 'On schedule: ${triggerConfig['cronExpression'] ?? 'Not set'}';
      case WorkflowTriggerType.webhook:
        return 'When webhook is called';
      case WorkflowTriggerType.manual:
        return 'Run manually';
    }
  }
}

class WorkflowStep {
  final String id;
  final String workflowId;
  final int stepOrder;
  final WorkflowStepType stepType;
  final String? stepName;
  final Map<String, dynamic> stepConfig;
  final String? parentStepId;
  final String? branchPath;
  final bool isActive;
  final int positionX;
  final int positionY;
  final DateTime createdAt;
  final DateTime? updatedAt;

  WorkflowStep({
    required this.id,
    required this.workflowId,
    required this.stepOrder,
    required this.stepType,
    this.stepName,
    required this.stepConfig,
    this.parentStepId,
    this.branchPath,
    this.isActive = true,
    this.positionX = 0,
    this.positionY = 0,
    required this.createdAt,
    this.updatedAt,
  });

  factory WorkflowStep.fromJson(Map<String, dynamic> json) {
    return WorkflowStep(
      id: json['id'] ?? '',
      workflowId: json['workflowId'] ?? json['workflow_id'] ?? '',
      stepOrder: json['stepOrder'] ?? json['step_order'] ?? 0,
      stepType: WorkflowStepType.fromString(
        json['stepType'] ?? json['step_type'] ?? 'action',
      ),
      stepName: json['stepName'] ?? json['step_name'],
      stepConfig: json['stepConfig'] ?? json['step_config'] ?? {},
      parentStepId: json['parentStepId'] ?? json['parent_step_id'],
      branchPath: json['branchPath'] ?? json['branch_path'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      positionX: json['positionX'] ?? json['position_x'] ?? 0,
      positionY: json['positionY'] ?? json['position_y'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: json['updatedAt'] != null || json['updated_at'] != null
          ? DateTime.tryParse(json['updatedAt'] ?? json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workflowId': workflowId,
      'stepOrder': stepOrder,
      'stepType': stepType.value,
      'stepName': stepName,
      'stepConfig': stepConfig,
      'parentStepId': parentStepId,
      'branchPath': branchPath,
      'isActive': isActive,
      'positionX': positionX,
      'positionY': positionY,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  String get displayName => stepName ?? stepType.displayName;
}

class WorkflowExecution {
  final String id;
  final String workflowId;
  final String? triggeredBy;
  final String? triggerSource;
  final Map<String, dynamic> triggerData;
  final WorkflowExecutionStatus status;
  final String? currentStepId;
  final Map<String, dynamic> context;
  final String? errorMessage;
  final int stepsCompleted;
  final int stepsTotal;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int? executionTimeMs;
  final DateTime createdAt;

  WorkflowExecution({
    required this.id,
    required this.workflowId,
    this.triggeredBy,
    this.triggerSource,
    required this.triggerData,
    required this.status,
    this.currentStepId,
    required this.context,
    this.errorMessage,
    this.stepsCompleted = 0,
    this.stepsTotal = 0,
    this.startedAt,
    this.completedAt,
    this.executionTimeMs,
    required this.createdAt,
  });

  factory WorkflowExecution.fromJson(Map<String, dynamic> json) {
    return WorkflowExecution(
      id: json['id'] ?? '',
      workflowId: json['workflowId'] ?? json['workflow_id'] ?? '',
      triggeredBy: json['triggeredBy'] ?? json['triggered_by'],
      triggerSource: json['triggerSource'] ?? json['trigger_source'],
      triggerData: json['triggerData'] ?? json['trigger_data'] ?? {},
      status: WorkflowExecutionStatus.fromString(json['status'] ?? 'pending'),
      currentStepId: json['currentStepId'] ?? json['current_step_id'],
      context: json['context'] ?? {},
      errorMessage: json['errorMessage'] ?? json['error_message'],
      stepsCompleted: json['stepsCompleted'] ?? json['steps_completed'] ?? 0,
      stepsTotal: json['stepsTotal'] ?? json['steps_total'] ?? 0,
      startedAt: json['startedAt'] != null || json['started_at'] != null
          ? DateTime.tryParse(json['startedAt'] ?? json['started_at'])
          : null,
      completedAt: json['completedAt'] != null || json['completed_at'] != null
          ? DateTime.tryParse(json['completedAt'] ?? json['completed_at'])
          : null,
      executionTimeMs: json['executionTimeMs'] ?? json['execution_time_ms'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  double get progress {
    if (stepsTotal == 0) return 0;
    return stepsCompleted / stepsTotal;
  }

  String get durationDisplay {
    if (executionTimeMs == null) return '-';
    if (executionTimeMs! < 1000) return '${executionTimeMs}ms';
    if (executionTimeMs! < 60000) return '${(executionTimeMs! / 1000).toStringAsFixed(1)}s';
    return '${(executionTimeMs! / 60000).toStringAsFixed(1)}m';
  }
}

class AutomationTemplate {
  final String id;
  final String name;
  final String? description;
  final String category;
  final String? icon;
  final String? color;
  final Map<String, dynamic> templateConfig;
  final List<TemplateVariable> variables;
  final bool isFeatured;
  final bool isSystem;
  final int useCount;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime? updatedAt;

  AutomationTemplate({
    required this.id,
    required this.name,
    this.description,
    required this.category,
    this.icon,
    this.color,
    required this.templateConfig,
    this.variables = const [],
    this.isFeatured = false,
    this.isSystem = false,
    this.useCount = 0,
    this.createdBy,
    required this.createdAt,
    this.updatedAt,
  });

  factory AutomationTemplate.fromJson(Map<String, dynamic> json) {
    return AutomationTemplate(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      category: json['category'] ?? 'general',
      icon: json['icon'],
      color: json['color'],
      templateConfig: json['templateConfig'] ?? json['template_config'] ?? {},
      variables: json['variables'] != null
          ? (json['variables'] as List).map((v) => TemplateVariable.fromJson(v)).toList()
          : [],
      isFeatured: json['isFeatured'] ?? json['is_featured'] ?? false,
      isSystem: json['isSystem'] ?? json['is_system'] ?? false,
      useCount: json['useCount'] ?? json['use_count'] ?? 0,
      createdBy: json['createdBy'] ?? json['created_by'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: json['updatedAt'] != null || json['updated_at'] != null
          ? DateTime.tryParse(json['updatedAt'] ?? json['updated_at'])
          : null,
    );
  }
}

class TemplateVariable {
  final String name;
  final String type;
  final dynamic defaultValue;
  final String? description;

  TemplateVariable({
    required this.name,
    required this.type,
    this.defaultValue,
    this.description,
  });

  factory TemplateVariable.fromJson(Map<String, dynamic> json) {
    return TemplateVariable(
      name: json['name'] ?? '',
      type: json['type'] ?? 'string',
      defaultValue: json['default'],
      description: json['description'],
    );
  }
}

class TemplateCategory {
  final String id;
  final String name;
  final String icon;

  TemplateCategory({
    required this.id,
    required this.name,
    required this.icon,
  });

  factory TemplateCategory.fromJson(Map<String, dynamic> json) {
    return TemplateCategory(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      icon: json['icon'] ?? 'folder',
    );
  }
}

/// Pending workflow with execution status info
class PendingWorkflow {
  final Workflow workflow;
  final String pendingType; // 'scheduled' or 'execution'
  final DateTime? nextRunAt;
  final String? executionStatus;
  final String? executionId;

  PendingWorkflow({
    required this.workflow,
    required this.pendingType,
    this.nextRunAt,
    this.executionStatus,
    this.executionId,
  });

  factory PendingWorkflow.fromJson(Map<String, dynamic> json) {
    return PendingWorkflow(
      workflow: Workflow.fromJson(json['workflow'] ?? {}),
      pendingType: json['pendingType'] ?? json['pending_type'] ?? 'scheduled',
      nextRunAt: json['nextRunAt'] != null || json['next_run_at'] != null
          ? DateTime.tryParse(json['nextRunAt'] ?? json['next_run_at'])
          : null,
      executionStatus: json['executionStatus'] ?? json['execution_status'],
      executionId: json['executionId'] ?? json['execution_id'],
    );
  }

  bool get isScheduled => pendingType == 'scheduled';
  bool get isExecution => pendingType == 'execution';

  String get statusDescription {
    if (isScheduled && nextRunAt != null) {
      return 'Next run: ${_formatNextRun(nextRunAt!)}';
    }
    if (isExecution) {
      return executionStatus ?? 'Pending';
    }
    return 'Waiting';
  }

  static String _formatNextRun(DateTime dateTime) {
    final now = DateTime.now();
    final diff = dateTime.difference(now);

    if (diff.isNegative) return 'Overdue';
    if (diff.inMinutes < 1) return 'Less than a minute';
    if (diff.inMinutes < 60) return 'In ${diff.inMinutes} minutes';
    if (diff.inHours < 24) return 'In ${diff.inHours} hours';
    return 'In ${diff.inDays} days';
  }
}

/// Workflow condition for step-level filtering
class WorkflowCondition {
  final String id;
  final String field;
  final String operator;
  final dynamic value;
  final String? logicalOperator;

  WorkflowCondition({
    required this.id,
    required this.field,
    required this.operator,
    this.value,
    this.logicalOperator,
  });

  factory WorkflowCondition.fromJson(Map<String, dynamic> json) {
    return WorkflowCondition(
      id: json['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      field: json['field'] ?? '',
      operator: json['operator'] ?? 'equals',
      value: json['value'],
      logicalOperator: json['logicalOperator'] ?? json['logical_operator'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'field': field,
      'operator': operator,
      'value': value,
      'logicalOperator': logicalOperator,
    };
  }
}

/// Extended WorkflowStep with UI-friendly properties
extension WorkflowStepExtension on WorkflowStep {
  /// Get step name (alias for stepName)
  String get name => stepName ?? stepType.displayName;

  /// Get action type from stepConfig
  String? get actionType => stepConfig['actionType'];

  /// Get action config from stepConfig
  Map<String, dynamic> get actionConfig =>
      (stepConfig['actionConfig'] as Map<String, dynamic>?) ?? {};

  /// Get conditions from stepConfig
  List<WorkflowCondition> get conditions {
    final condList = stepConfig['conditions'] as List?;
    if (condList == null) return [];
    return condList.map((c) => WorkflowCondition.fromJson(c as Map<String, dynamic>)).toList();
  }

  /// Get continue on error flag
  bool get continueOnError => stepConfig['continueOnError'] ?? false;

  /// Get max retries
  int get maxRetries => stepConfig['maxRetries'] ?? 0;

  /// Get timeout in seconds
  int? get timeout => stepConfig['timeout'];

  /// Get order (alias for stepOrder)
  int get order => stepOrder;

  /// Get enabled state (alias for isActive)
  bool get isEnabled => isActive;
}
