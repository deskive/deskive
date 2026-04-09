import 'package:dio/dio.dart';
import '../base_api_client.dart';

// ==================== ENUMS ====================

/// Bot types
enum BotType {
  custom('custom'),
  aiAssistant('ai_assistant'),
  webhook('webhook'),
  prebuilt('prebuilt');

  const BotType(this.value);
  final String value;

  static BotType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'ai_assistant':
        return BotType.aiAssistant;
      case 'webhook':
        return BotType.webhook;
      case 'prebuilt':
        return BotType.prebuilt;
      default:
        return BotType.custom;
    }
  }

  String get displayName {
    switch (this) {
      case BotType.custom:
        return 'Custom';
      case BotType.aiAssistant:
        return 'AI Assistant';
      case BotType.webhook:
        return 'Webhook';
      case BotType.prebuilt:
        return 'Prebuilt';
    }
  }
}

/// Bot status
enum BotStatus {
  draft('draft'),
  active('active'),
  inactive('inactive');

  const BotStatus(this.value);
  final String value;

  static BotStatus fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'active':
        return BotStatus.active;
      case 'inactive':
        return BotStatus.inactive;
      default:
        return BotStatus.draft;
    }
  }

  String get displayName {
    switch (this) {
      case BotStatus.draft:
        return 'Draft';
      case BotStatus.active:
        return 'Active';
      case BotStatus.inactive:
        return 'Inactive';
    }
  }
}

/// Trigger types
enum TriggerType {
  keyword('keyword'),
  regex('regex'),
  schedule('schedule'),
  webhook('webhook'),
  mention('mention'),
  anyMessage('any_message');

  const TriggerType(this.value);
  final String value;

  static TriggerType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'regex':
        return TriggerType.regex;
      case 'schedule':
        return TriggerType.schedule;
      case 'webhook':
        return TriggerType.webhook;
      case 'mention':
        return TriggerType.mention;
      case 'any_message':
        return TriggerType.anyMessage;
      default:
        return TriggerType.keyword;
    }
  }

  String get displayName {
    switch (this) {
      case TriggerType.keyword:
        return 'Keyword';
      case TriggerType.regex:
        return 'Regex';
      case TriggerType.schedule:
        return 'Schedule';
      case TriggerType.webhook:
        return 'Webhook';
      case TriggerType.mention:
        return 'Mention';
      case TriggerType.anyMessage:
        return 'Any Message';
    }
  }
}

/// Action types
enum ActionType {
  sendMessage('send_message'),
  sendAiMessage('send_ai_message'),
  aiAutopilot('ai_autopilot'),
  createTask('create_task'),
  createEvent('create_event'),
  callWebhook('call_webhook'),
  sendEmail('send_email');

  const ActionType(this.value);
  final String value;

  static ActionType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'send_ai_message':
        return ActionType.sendAiMessage;
      case 'ai_autopilot':
        return ActionType.aiAutopilot;
      case 'create_task':
        return ActionType.createTask;
      case 'create_event':
        return ActionType.createEvent;
      case 'call_webhook':
        return ActionType.callWebhook;
      case 'send_email':
        return ActionType.sendEmail;
      default:
        return ActionType.sendMessage;
    }
  }

  String get displayName {
    switch (this) {
      case ActionType.sendMessage:
        return 'Send Message';
      case ActionType.sendAiMessage:
        return 'Send AI Message';
      case ActionType.aiAutopilot:
        return 'AI AutoPilot';
      case ActionType.createTask:
        return 'Create Task';
      case ActionType.createEvent:
        return 'Create Event';
      case ActionType.callWebhook:
        return 'Call Webhook';
      case ActionType.sendEmail:
        return 'Send Email';
    }
  }
}

/// Failure policy for actions
enum FailurePolicy {
  continueExecution('continue'),
  stop('stop'),
  retry('retry');

  const FailurePolicy(this.value);
  final String value;

  static FailurePolicy fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'stop':
        return FailurePolicy.stop;
      case 'retry':
        return FailurePolicy.retry;
      default:
        return FailurePolicy.continueExecution;
    }
  }

  String get displayName {
    switch (this) {
      case FailurePolicy.continueExecution:
        return 'Continue';
      case FailurePolicy.stop:
        return 'Stop';
      case FailurePolicy.retry:
        return 'Retry';
    }
  }
}

/// Match type for keyword triggers
enum MatchType {
  exact('exact'),
  contains('contains'),
  startsWith('starts_with'),
  endsWith('ends_with');

  const MatchType(this.value);
  final String value;

  static MatchType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'contains':
        return MatchType.contains;
      case 'starts_with':
        return MatchType.startsWith;
      case 'ends_with':
        return MatchType.endsWith;
      default:
        return MatchType.exact;
    }
  }

  String get displayName {
    switch (this) {
      case MatchType.exact:
        return 'Exact Match';
      case MatchType.contains:
        return 'Contains';
      case MatchType.startsWith:
        return 'Starts With';
      case MatchType.endsWith:
        return 'Ends With';
    }
  }
}

/// Execution status for logs
enum ExecutionStatus {
  pending('pending'),
  running('running'),
  success('success'),
  failed('failed'),
  skipped('skipped');

  const ExecutionStatus(this.value);
  final String value;

  static ExecutionStatus fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'running':
        return ExecutionStatus.running;
      case 'success':
        return ExecutionStatus.success;
      case 'failed':
        return ExecutionStatus.failed;
      case 'skipped':
        return ExecutionStatus.skipped;
      default:
        return ExecutionStatus.pending;
    }
  }

  String get displayName {
    switch (this) {
      case ExecutionStatus.pending:
        return 'Pending';
      case ExecutionStatus.running:
        return 'Running';
      case ExecutionStatus.success:
        return 'Success';
      case ExecutionStatus.failed:
        return 'Failed';
      case ExecutionStatus.skipped:
        return 'Skipped';
    }
  }
}

// ==================== MODELS ====================

/// Bot model
class Bot {
  final String id;
  final String workspaceId;
  final String name;
  final String? displayName;
  final String? description;
  final String? avatarUrl;
  final BotStatus status;
  final BotType botType;
  final BotSettings settings;
  final List<String> permissions;
  final String? webhookSecret;
  final bool isPublic;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int triggerCount;
  final int actionCount;

  Bot({
    required this.id,
    required this.workspaceId,
    required this.name,
    this.displayName,
    this.description,
    this.avatarUrl,
    required this.status,
    required this.botType,
    required this.settings,
    this.permissions = const [],
    this.webhookSecret,
    this.isPublic = false,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.triggerCount = 0,
    this.actionCount = 0,
  });

  factory Bot.fromJson(Map<String, dynamic> json) {
    return Bot(
      id: json['id'] ?? '',
      workspaceId: json['workspaceId'] ?? '',
      name: json['name'] ?? '',
      displayName: json['displayName'],
      description: json['description'],
      avatarUrl: json['avatarUrl'],
      status: BotStatus.fromString(json['status']),
      botType: BotType.fromString(json['botType']),
      settings: BotSettings.fromJson(json['settings'] ?? {}),
      permissions: (json['permissions'] as List?)?.map((e) => e.toString()).toList() ?? [],
      webhookSecret: json['webhookSecret'],
      isPublic: json['isPublic'] ?? false,
      createdBy: json['createdBy'] ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
      triggerCount: json['triggerCount'] ?? 0,
      actionCount: json['actionCount'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'workspaceId': workspaceId,
    'name': name,
    if (displayName != null) 'displayName': displayName,
    if (description != null) 'description': description,
    if (avatarUrl != null) 'avatarUrl': avatarUrl,
    'status': status.value,
    'botType': botType.value,
    'settings': settings.toJson(),
    'permissions': permissions,
    if (webhookSecret != null) 'webhookSecret': webhookSecret,
    'isPublic': isPublic,
    'createdBy': createdBy,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'triggerCount': triggerCount,
    'actionCount': actionCount,
  };

  /// Get effective display name
  String get effectiveDisplayName => displayName ?? name;
}

/// Bot settings
class BotSettings {
  final int? rateLimit;
  final int? responseDelay;
  final int? maxExecutionDepth;

  BotSettings({
    this.rateLimit,
    this.responseDelay,
    this.maxExecutionDepth,
  });

  factory BotSettings.fromJson(Map<String, dynamic> json) {
    return BotSettings(
      rateLimit: json['rateLimit'],
      responseDelay: json['responseDelay'],
      maxExecutionDepth: json['maxExecutionDepth'],
    );
  }

  Map<String, dynamic> toJson() => {
    if (rateLimit != null) 'rateLimit': rateLimit,
    if (responseDelay != null) 'responseDelay': responseDelay,
    if (maxExecutionDepth != null) 'maxExecutionDepth': maxExecutionDepth,
  };
}

/// Bot trigger model
class BotTrigger {
  final String id;
  final String botId;
  final String name;
  final TriggerType triggerType;
  final Map<String, dynamic> triggerConfig;
  final bool isActive;
  final int priority;
  final int cooldownSeconds;
  final Map<String, dynamic> conditions;
  final DateTime createdAt;
  final DateTime updatedAt;

  BotTrigger({
    required this.id,
    required this.botId,
    required this.name,
    required this.triggerType,
    this.triggerConfig = const {},
    this.isActive = true,
    this.priority = 0,
    this.cooldownSeconds = 0,
    this.conditions = const {},
    required this.createdAt,
    required this.updatedAt,
  });

  factory BotTrigger.fromJson(Map<String, dynamic> json) {
    return BotTrigger(
      id: json['id'] ?? '',
      botId: json['botId'] ?? '',
      name: json['name'] ?? '',
      triggerType: TriggerType.fromString(json['triggerType']),
      triggerConfig: json['triggerConfig'] ?? {},
      isActive: json['isActive'] ?? true,
      priority: json['priority'] ?? 0,
      cooldownSeconds: json['cooldownSeconds'] ?? 0,
      conditions: json['conditions'] ?? {},
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'botId': botId,
    'name': name,
    'triggerType': triggerType.value,
    'triggerConfig': triggerConfig,
    'isActive': isActive,
    'priority': priority,
    'cooldownSeconds': cooldownSeconds,
    'conditions': conditions,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}

/// Bot action model
class BotAction {
  final String id;
  final String botId;
  final String? triggerId;
  final String name;
  final ActionType actionType;
  final Map<String, dynamic> actionConfig;
  final int executionOrder;
  final bool isActive;
  final FailurePolicy failurePolicy;
  final DateTime createdAt;
  final DateTime updatedAt;

  BotAction({
    required this.id,
    required this.botId,
    this.triggerId,
    required this.name,
    required this.actionType,
    this.actionConfig = const {},
    this.executionOrder = 0,
    this.isActive = true,
    this.failurePolicy = FailurePolicy.continueExecution,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BotAction.fromJson(Map<String, dynamic> json) {
    return BotAction(
      id: json['id'] ?? '',
      botId: json['botId'] ?? '',
      triggerId: json['triggerId'],
      name: json['name'] ?? '',
      actionType: ActionType.fromString(json['actionType']),
      actionConfig: json['actionConfig'] ?? {},
      executionOrder: json['executionOrder'] ?? 0,
      isActive: json['isActive'] ?? true,
      failurePolicy: FailurePolicy.fromString(json['failurePolicy']),
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'botId': botId,
    if (triggerId != null) 'triggerId': triggerId,
    'name': name,
    'actionType': actionType.value,
    'actionConfig': actionConfig,
    'executionOrder': executionOrder,
    'isActive': isActive,
    'failurePolicy': failurePolicy.value,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}

/// Bot installation model
class BotInstallation {
  final String id;
  final String botId;
  final String? channelId;
  final String? conversationId;
  final String installedBy;
  final bool isActive;
  final Map<String, dynamic> settingsOverride;
  final DateTime installedAt;
  final DateTime? uninstalledAt;
  final Bot? bot;

  BotInstallation({
    required this.id,
    required this.botId,
    this.channelId,
    this.conversationId,
    required this.installedBy,
    this.isActive = true,
    this.settingsOverride = const {},
    required this.installedAt,
    this.uninstalledAt,
    this.bot,
  });

  factory BotInstallation.fromJson(Map<String, dynamic> json) {
    return BotInstallation(
      id: json['id'] ?? '',
      botId: json['botId'] ?? '',
      channelId: json['channelId'],
      conversationId: json['conversationId'],
      installedBy: json['installedBy'] ?? '',
      isActive: json['isActive'] ?? true,
      settingsOverride: json['settingsOverride'] ?? {},
      installedAt: DateTime.tryParse(json['installedAt'] ?? '') ?? DateTime.now(),
      uninstalledAt: json['uninstalledAt'] != null
          ? DateTime.tryParse(json['uninstalledAt'])
          : null,
      bot: json['bot'] != null ? Bot.fromJson(json['bot']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'botId': botId,
    if (channelId != null) 'channelId': channelId,
    if (conversationId != null) 'conversationId': conversationId,
    'installedBy': installedBy,
    'isActive': isActive,
    'settingsOverride': settingsOverride,
    'installedAt': installedAt.toIso8601String(),
    if (uninstalledAt != null) 'uninstalledAt': uninstalledAt!.toIso8601String(),
  };
}

/// Bot execution log model
class BotExecutionLog {
  final String id;
  final String botId;
  final String? triggerId;
  final String? actionId;
  final String? installationId;
  final String? channelId;
  final String? conversationId;
  final String? messageId;
  final String? triggeredByUser;
  final String? triggerType;
  final Map<String, dynamic> triggerData;
  final String? actionType;
  final Map<String, dynamic> actionInput;
  final Map<String, dynamic> actionOutput;
  final ExecutionStatus status;
  final String? errorMessage;
  final int? executionTimeMs;
  final DateTime createdAt;

  BotExecutionLog({
    required this.id,
    required this.botId,
    this.triggerId,
    this.actionId,
    this.installationId,
    this.channelId,
    this.conversationId,
    this.messageId,
    this.triggeredByUser,
    this.triggerType,
    this.triggerData = const {},
    this.actionType,
    this.actionInput = const {},
    this.actionOutput = const {},
    required this.status,
    this.errorMessage,
    this.executionTimeMs,
    required this.createdAt,
  });

  factory BotExecutionLog.fromJson(Map<String, dynamic> json) {
    return BotExecutionLog(
      id: json['id'] ?? '',
      botId: json['botId'] ?? '',
      triggerId: json['triggerId'],
      actionId: json['actionId'],
      installationId: json['installationId'],
      channelId: json['channelId'],
      conversationId: json['conversationId'],
      messageId: json['messageId'],
      triggeredByUser: json['triggeredByUser'],
      triggerType: json['triggerType'],
      triggerData: json['triggerData'] ?? {},
      actionType: json['actionType'],
      actionInput: json['actionInput'] ?? {},
      actionOutput: json['actionOutput'] ?? {},
      status: ExecutionStatus.fromString(json['status']),
      errorMessage: json['errorMessage'],
      executionTimeMs: json['executionTimeMs'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'botId': botId,
    if (triggerId != null) 'triggerId': triggerId,
    if (actionId != null) 'actionId': actionId,
    if (installationId != null) 'installationId': installationId,
    if (channelId != null) 'channelId': channelId,
    if (conversationId != null) 'conversationId': conversationId,
    if (messageId != null) 'messageId': messageId,
    if (triggeredByUser != null) 'triggeredByUser': triggeredByUser,
    if (triggerType != null) 'triggerType': triggerType,
    'triggerData': triggerData,
    if (actionType != null) 'actionType': actionType,
    'actionInput': actionInput,
    'actionOutput': actionOutput,
    'status': status.value,
    if (errorMessage != null) 'errorMessage': errorMessage,
    if (executionTimeMs != null) 'executionTimeMs': executionTimeMs,
    'createdAt': createdAt.toIso8601String(),
  };
}

// ==================== DTOs ====================

/// Create bot DTO
class CreateBotDto {
  final String name;
  final String? displayName;
  final String? description;
  final String? avatarUrl;
  final BotType botType;
  final BotStatus status;
  final BotSettings? settings;
  final List<String>? permissions;
  final bool isPublic;

  CreateBotDto({
    required this.name,
    this.displayName,
    this.description,
    this.avatarUrl,
    this.botType = BotType.custom,
    this.status = BotStatus.draft,
    this.settings,
    this.permissions,
    this.isPublic = false,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    if (displayName != null) 'displayName': displayName,
    if (description != null) 'description': description,
    if (avatarUrl != null) 'avatarUrl': avatarUrl,
    'botType': botType.value,
    'status': status.value,
    if (settings != null) 'settings': settings!.toJson(),
    if (permissions != null) 'permissions': permissions,
    'isPublic': isPublic,
  };
}

/// Update bot DTO
class UpdateBotDto {
  final String? name;
  final String? displayName;
  final String? description;
  final String? avatarUrl;
  final BotType? botType;
  final BotStatus? status;
  final BotSettings? settings;
  final List<String>? permissions;
  final bool? isPublic;

  UpdateBotDto({
    this.name,
    this.displayName,
    this.description,
    this.avatarUrl,
    this.botType,
    this.status,
    this.settings,
    this.permissions,
    this.isPublic,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (displayName != null) map['displayName'] = displayName;
    if (description != null) map['description'] = description;
    if (avatarUrl != null) map['avatarUrl'] = avatarUrl;
    if (botType != null) map['botType'] = botType!.value;
    if (status != null) map['status'] = status!.value;
    if (settings != null) map['settings'] = settings!.toJson();
    if (permissions != null) map['permissions'] = permissions;
    if (isPublic != null) map['isPublic'] = isPublic;
    return map;
  }
}

/// Create trigger DTO
class CreateTriggerDto {
  final String name;
  final TriggerType triggerType;
  final Map<String, dynamic> triggerConfig;
  final bool isActive;
  final int priority;
  final int cooldownSeconds;
  final Map<String, dynamic>? conditions;

  CreateTriggerDto({
    required this.name,
    required this.triggerType,
    this.triggerConfig = const {},
    this.isActive = true,
    this.priority = 0,
    this.cooldownSeconds = 0,
    this.conditions,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'triggerType': triggerType.value,
    'triggerConfig': triggerConfig,
    'isActive': isActive,
    'priority': priority,
    'cooldownSeconds': cooldownSeconds,
    if (conditions != null) 'conditions': conditions,
  };
}

/// Update trigger DTO
class UpdateTriggerDto {
  final String? name;
  final TriggerType? triggerType;
  final Map<String, dynamic>? triggerConfig;
  final bool? isActive;
  final int? priority;
  final int? cooldownSeconds;
  final Map<String, dynamic>? conditions;

  UpdateTriggerDto({
    this.name,
    this.triggerType,
    this.triggerConfig,
    this.isActive,
    this.priority,
    this.cooldownSeconds,
    this.conditions,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (triggerType != null) map['triggerType'] = triggerType!.value;
    if (triggerConfig != null) map['triggerConfig'] = triggerConfig;
    if (isActive != null) map['isActive'] = isActive;
    if (priority != null) map['priority'] = priority;
    if (cooldownSeconds != null) map['cooldownSeconds'] = cooldownSeconds;
    if (conditions != null) map['conditions'] = conditions;
    return map;
  }
}

/// Create action DTO
class CreateActionDto {
  final String name;
  final ActionType actionType;
  final Map<String, dynamic> actionConfig;
  final String? triggerId;
  final int executionOrder;
  final bool isActive;
  final FailurePolicy failurePolicy;

  CreateActionDto({
    required this.name,
    required this.actionType,
    this.actionConfig = const {},
    this.triggerId,
    this.executionOrder = 0,
    this.isActive = true,
    this.failurePolicy = FailurePolicy.continueExecution,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'actionType': actionType.value,
    'actionConfig': actionConfig,
    if (triggerId != null) 'triggerId': triggerId,
    'executionOrder': executionOrder,
    'isActive': isActive,
    'failurePolicy': failurePolicy.value,
  };
}

/// Update action DTO
class UpdateActionDto {
  final String? name;
  final ActionType? actionType;
  final Map<String, dynamic>? actionConfig;
  final String? triggerId;
  final int? executionOrder;
  final bool? isActive;
  final FailurePolicy? failurePolicy;

  UpdateActionDto({
    this.name,
    this.actionType,
    this.actionConfig,
    this.triggerId,
    this.executionOrder,
    this.isActive,
    this.failurePolicy,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (actionType != null) map['actionType'] = actionType!.value;
    if (actionConfig != null) map['actionConfig'] = actionConfig;
    if (triggerId != null) map['triggerId'] = triggerId;
    if (executionOrder != null) map['executionOrder'] = executionOrder;
    if (isActive != null) map['isActive'] = isActive;
    if (failurePolicy != null) map['failurePolicy'] = failurePolicy!.value;
    return map;
  }
}

/// Install bot DTO
class InstallBotDto {
  final String? channelId;
  final String? conversationId;
  final Map<String, dynamic>? settingsOverride;

  InstallBotDto({
    this.channelId,
    this.conversationId,
    this.settingsOverride,
  });

  Map<String, dynamic> toJson() => {
    if (channelId != null) 'channelId': channelId,
    if (conversationId != null) 'conversationId': conversationId,
    if (settingsOverride != null) 'settingsOverride': settingsOverride,
  };
}

/// Test bot DTO
class TestBotDto {
  final String message;
  final String? channelId;
  final String? conversationId;

  TestBotDto({
    required this.message,
    this.channelId,
    this.conversationId,
  });

  Map<String, dynamic> toJson() => {
    'message': message,
    if (channelId != null) 'channelId': channelId,
    if (conversationId != null) 'conversationId': conversationId,
  };
}

/// Test bot response
class TestBotResponse {
  final bool triggered;
  final String? matchedTriggerId;
  final String? matchedTriggerName;
  final List<Map<String, dynamic>> executedActions;
  final String? response;

  TestBotResponse({
    required this.triggered,
    this.matchedTriggerId,
    this.matchedTriggerName,
    this.executedActions = const [],
    this.response,
  });

  factory TestBotResponse.fromJson(Map<String, dynamic> json) {
    return TestBotResponse(
      triggered: json['triggered'] ?? false,
      matchedTriggerId: json['matchedTriggerId'],
      matchedTriggerName: json['matchedTriggerName'],
      executedActions: (json['executedActions'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [],
      response: json['response'],
    );
  }
}

/// Execution log stats
class ExecutionLogStats {
  final int total;
  final int success;
  final int failed;
  final double avgExecutionTime;

  ExecutionLogStats({
    required this.total,
    required this.success,
    required this.failed,
    required this.avgExecutionTime,
  });

  factory ExecutionLogStats.fromJson(Map<String, dynamic> json) {
    return ExecutionLogStats(
      total: json['total'] ?? 0,
      success: json['success'] ?? 0,
      failed: json['failed'] ?? 0,
      avgExecutionTime: (json['avgExecutionTime'] ?? 0).toDouble(),
    );
  }
}

/// Prebuilt bot model - ready-to-use bots that can be activated
class PrebuiltBot {
  final String id;
  final String name;
  final String displayName;
  final String description;
  final String? avatarUrl;
  final String category;
  final List<String> features;
  final Map<String, dynamic> settings;
  final List<String> permissions;
  final bool isActivated;
  final String? userBotId;

  PrebuiltBot({
    required this.id,
    required this.name,
    required this.displayName,
    required this.description,
    this.avatarUrl,
    required this.category,
    this.features = const [],
    this.settings = const {},
    this.permissions = const [],
    this.isActivated = false,
    this.userBotId,
  });

  factory PrebuiltBot.fromJson(Map<String, dynamic> json) {
    return PrebuiltBot(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      displayName: json['displayName'] ?? json['name'] ?? '',
      description: json['description'] ?? '',
      avatarUrl: json['avatarUrl'],
      category: json['category'] ?? 'general',
      features: (json['features'] as List?)?.map((e) => e.toString()).toList() ?? [],
      settings: json['settings'] ?? {},
      permissions: (json['permissions'] as List?)?.map((e) => e.toString()).toList() ?? [],
      isActivated: json['isActivated'] ?? false,
      userBotId: json['userBotId'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'displayName': displayName,
    'description': description,
    if (avatarUrl != null) 'avatarUrl': avatarUrl,
    'category': category,
    'features': features,
    'settings': settings,
    'permissions': permissions,
    'isActivated': isActivated,
    if (userBotId != null) 'userBotId': userBotId,
  };
}

/// Activate prebuilt bot DTO
class ActivatePrebuiltBotDto {
  final String prebuiltBotId;
  final String? customDisplayName;
  final Map<String, dynamic>? customSettings;

  ActivatePrebuiltBotDto({
    required this.prebuiltBotId,
    this.customDisplayName,
    this.customSettings,
  });

  Map<String, dynamic> toJson() => {
    'prebuiltBotId': prebuiltBotId,
    if (customDisplayName != null) 'customDisplayName': customDisplayName,
    if (customSettings != null) 'customSettings': customSettings,
  };
}

// ==================== API SERVICE ====================

/// Bot API Service for all bot-related operations
class BotApiService {
  final BaseApiClient _apiClient = BaseApiClient.instance;

  // ==================== BOT CRUD ====================

  /// Get all bots in a workspace
  Future<ApiResponse<List<Bot>>> getBots(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/bots');

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> botsList;

        if (data is Map && data['data'] != null) {
          botsList = data['data'] as List;
        } else if (data is List) {
          botsList = data;
        } else {
          botsList = [];
        }

        final bots = botsList.map((json) => Bot.fromJson(json)).toList();
        return ApiResponse.success(bots);
      }

      return ApiResponse.error('Failed to fetch bots');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch bots');
    }
  }

  /// Get a single bot by ID
  Future<ApiResponse<Bot>> getBot(String workspaceId, String botId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/bots/$botId');

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(Bot.fromJson(data));
      }

      return ApiResponse.error('Failed to fetch bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch bot');
    }
  }

  /// Create a new bot
  Future<ApiResponse<Bot>> createBot(String workspaceId, CreateBotDto dto) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots',
        data: dto.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(Bot.fromJson(data));
      }

      return ApiResponse.error('Failed to create bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to create bot');
    }
  }

  /// Update a bot
  Future<ApiResponse<Bot>> updateBot(
    String workspaceId,
    String botId,
    UpdateBotDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/bots/$botId',
        data: dto.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(Bot.fromJson(data));
      }

      return ApiResponse.error('Failed to update bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to update bot');
    }
  }

  /// Delete a bot
  Future<ApiResponse<void>> deleteBot(String workspaceId, String botId) async {
    try {
      final response = await _apiClient.delete('/workspaces/$workspaceId/bots/$botId');

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to delete bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to delete bot');
    }
  }

  /// Regenerate webhook secret for a bot
  Future<ApiResponse<String>> regenerateWebhookSecret(
    String workspaceId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/regenerate-webhook-secret',
        data: {},
      );

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(data['webhookSecret'] ?? '');
      }

      return ApiResponse.error('Failed to regenerate webhook secret');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to regenerate webhook secret');
    }
  }

  // ==================== TRIGGERS ====================

  /// Get all triggers for a bot
  Future<ApiResponse<List<BotTrigger>>> getTriggers(
    String workspaceId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/$botId/triggers',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> triggersList;

        if (data is Map && data['data'] != null) {
          triggersList = data['data'] as List;
        } else if (data is List) {
          triggersList = data;
        } else {
          triggersList = [];
        }

        final triggers = triggersList.map((json) => BotTrigger.fromJson(json)).toList();
        return ApiResponse.success(triggers);
      }

      return ApiResponse.error('Failed to fetch triggers');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch triggers');
    }
  }

  /// Create a trigger
  Future<ApiResponse<BotTrigger>> createTrigger(
    String workspaceId,
    String botId,
    CreateTriggerDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/triggers',
        data: dto.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(BotTrigger.fromJson(data));
      }

      return ApiResponse.error('Failed to create trigger');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to create trigger');
    }
  }

  /// Update a trigger
  Future<ApiResponse<BotTrigger>> updateTrigger(
    String workspaceId,
    String botId,
    String triggerId,
    UpdateTriggerDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/bots/$botId/triggers/$triggerId',
        data: dto.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(BotTrigger.fromJson(data));
      }

      return ApiResponse.error('Failed to update trigger');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to update trigger');
    }
  }

  /// Delete a trigger
  Future<ApiResponse<void>> deleteTrigger(
    String workspaceId,
    String botId,
    String triggerId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/bots/$botId/triggers/$triggerId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to delete trigger');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to delete trigger');
    }
  }

  // ==================== ACTIONS ====================

  /// Get all actions for a bot
  Future<ApiResponse<List<BotAction>>> getActions(
    String workspaceId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/$botId/actions',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> actionsList;

        if (data is Map && data['data'] != null) {
          actionsList = data['data'] as List;
        } else if (data is List) {
          actionsList = data;
        } else {
          actionsList = [];
        }

        final actions = actionsList.map((json) => BotAction.fromJson(json)).toList();
        return ApiResponse.success(actions);
      }

      return ApiResponse.error('Failed to fetch actions');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch actions');
    }
  }

  /// Create an action
  Future<ApiResponse<BotAction>> createAction(
    String workspaceId,
    String botId,
    CreateActionDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/actions',
        data: dto.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(BotAction.fromJson(data));
      }

      return ApiResponse.error('Failed to create action');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to create action');
    }
  }

  /// Update an action
  Future<ApiResponse<BotAction>> updateAction(
    String workspaceId,
    String botId,
    String actionId,
    UpdateActionDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/bots/$botId/actions/$actionId',
        data: dto.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(BotAction.fromJson(data));
      }

      return ApiResponse.error('Failed to update action');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to update action');
    }
  }

  /// Delete an action
  Future<ApiResponse<void>> deleteAction(
    String workspaceId,
    String botId,
    String actionId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/bots/$botId/actions/$actionId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to delete action');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to delete action');
    }
  }

  /// Reorder actions
  Future<ApiResponse<void>> reorderActions(
    String workspaceId,
    String botId,
    List<String> actionIds,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/actions/reorder',
        data: {'actionIds': actionIds},
      );

      if (response.statusCode == 200) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to reorder actions');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to reorder actions');
    }
  }

  // ==================== INSTALLATIONS ====================

  /// Get all installations for a bot
  Future<ApiResponse<List<BotInstallation>>> getInstallations(
    String workspaceId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/$botId/installations',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> installationsList;

        if (data is Map && data['data'] != null) {
          installationsList = data['data'] as List;
        } else if (data is List) {
          installationsList = data;
        } else {
          installationsList = [];
        }

        final installations = installationsList
            .map((json) => BotInstallation.fromJson(json))
            .toList();
        return ApiResponse.success(installations);
      }

      return ApiResponse.error('Failed to fetch installations');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch installations');
    }
  }

  /// Get installed bots for a channel
  Future<ApiResponse<List<BotInstallation>>> getChannelBots(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/channels/$channelId/bots',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> installationsList;

        if (data is Map && data['data'] != null) {
          installationsList = data['data'] as List;
        } else if (data is List) {
          installationsList = data;
        } else {
          installationsList = [];
        }

        final installations = installationsList
            .map((json) => BotInstallation.fromJson(json))
            .toList();
        return ApiResponse.success(installations);
      }

      return ApiResponse.error('Failed to fetch channel bots');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch channel bots');
    }
  }

  /// Get installed bots for a conversation
  Future<ApiResponse<List<BotInstallation>>> getConversationBots(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/conversations/$conversationId/bots',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> installationsList;

        if (data is Map && data['data'] != null) {
          installationsList = data['data'] as List;
        } else if (data is List) {
          installationsList = data;
        } else {
          installationsList = [];
        }

        final installations = installationsList
            .map((json) => BotInstallation.fromJson(json))
            .toList();
        return ApiResponse.success(installations);
      }

      return ApiResponse.error('Failed to fetch conversation bots');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch conversation bots');
    }
  }

  /// Install a bot to a channel or conversation
  Future<ApiResponse<BotInstallation>> installBot(
    String workspaceId,
    String botId,
    InstallBotDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/install',
        data: dto.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(BotInstallation.fromJson(data));
      }

      return ApiResponse.error('Failed to install bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to install bot');
    }
  }

  /// Uninstall a bot from a channel or conversation
  Future<ApiResponse<void>> uninstallBot(
    String workspaceId,
    String botId, {
    String? channelId,
    String? conversationId,
  }) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/uninstall',
        data: {
          if (channelId != null) 'channelId': channelId,
          if (conversationId != null) 'conversationId': conversationId,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to uninstall bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to uninstall bot');
    }
  }

  // ==================== TESTING & LOGS ====================

  /// Test a bot with a message
  Future<ApiResponse<TestBotResponse>> testBot(
    String workspaceId,
    String botId,
    TestBotDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/test',
        data: dto.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(TestBotResponse.fromJson(data));
      }

      return ApiResponse.error('Failed to test bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to test bot');
    }
  }

  /// Get execution logs for a bot
  Future<ApiResponse<List<BotExecutionLog>>> getLogs(
    String workspaceId,
    String botId, {
    ExecutionStatus? status,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status.value;
      if (limit != null) queryParams['limit'] = limit;
      if (offset != null) queryParams['offset'] = offset;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/$botId/logs',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> logsList;

        if (data is Map && data['data'] != null) {
          logsList = data['data'] as List;
        } else if (data is List) {
          logsList = data;
        } else {
          logsList = [];
        }

        final logs = logsList.map((json) => BotExecutionLog.fromJson(json)).toList();
        return ApiResponse.success(logs);
      }

      return ApiResponse.error('Failed to fetch logs');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch logs');
    }
  }

  /// Get execution log stats for a bot
  Future<ApiResponse<ExecutionLogStats>> getLogStats(
    String workspaceId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/$botId/logs/stats',
      );

      if (response.statusCode == 200) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(ExecutionLogStats.fromJson(data));
      }

      return ApiResponse.error('Failed to fetch log stats');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch log stats');
    }
  }

  // ==================== PREBUILT BOTS ====================

  /// Get all prebuilt bots available for the workspace
  Future<ApiResponse<List<PrebuiltBot>>> getPrebuiltBots(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/bots/prebuilt');

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> botsList;

        if (data is Map && data['data'] != null) {
          botsList = data['data'] as List;
        } else if (data is List) {
          botsList = data;
        } else {
          botsList = [];
        }

        final bots = botsList.map((json) => PrebuiltBot.fromJson(json)).toList();
        return ApiResponse.success(bots);
      }

      return ApiResponse.error('Failed to fetch prebuilt bots');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch prebuilt bots');
    }
  }

  /// Activate a prebuilt bot for the workspace
  Future<ApiResponse<Bot>> activatePrebuiltBot(
    String workspaceId,
    ActivatePrebuiltBotDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/prebuilt/activate',
        data: dto.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data is Map && response.data['data'] != null
            ? response.data['data']
            : response.data;
        return ApiResponse.success(Bot.fromJson(data));
      }

      return ApiResponse.error('Failed to activate prebuilt bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to activate prebuilt bot');
    }
  }

  /// Deactivate a prebuilt bot
  Future<ApiResponse<void>> deactivatePrebuiltBot(
    String workspaceId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/bots/prebuilt/$botId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to deactivate prebuilt bot');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to deactivate prebuilt bot');
    }
  }

  // ==================== PROJECT BOT ASSIGNMENTS ====================

  /// Assign a bot to a project
  Future<ApiResponse<void>> assignBotToProject(
    String workspaceId,
    String botId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/bots/$botId/assign-to-project/$projectId',
        data: {},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to assign bot to project');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to assign bot to project');
    }
  }

  /// Unassign a bot from a project
  Future<ApiResponse<void>> unassignBotFromProject(
    String workspaceId,
    String botId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/bots/$botId/unassign-from-project/$projectId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to unassign bot from project');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to unassign bot from project');
    }
  }

  /// Get bots assigned to a project
  Future<ApiResponse<List<Bot>>> getProjectBots(
    String workspaceId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/projects/$projectId/bots',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> botsList;

        if (data is Map && data['data'] != null) {
          botsList = data['data'] as List;
        } else if (data is List) {
          botsList = data;
        } else {
          botsList = [];
        }

        final bots = botsList.map((json) => Bot.fromJson(json)).toList();
        return ApiResponse.success(bots);
      }

      return ApiResponse.error('Failed to fetch project bots');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch project bots');
    }
  }

  /// Get available bots for a project with assignment status
  Future<ApiResponse<List<Map<String, dynamic>>>> getAvailableBotsForProject(
    String workspaceId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/bots/projects/$projectId/available-bots',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> botsList;

        if (data is Map && data['data'] != null) {
          botsList = data['data'] as List;
        } else if (data is List) {
          botsList = data;
        } else {
          botsList = [];
        }

        final bots = botsList.map((json) => Map<String, dynamic>.from(json)).toList();
        return ApiResponse.success(bots);
      }

      return ApiResponse.error('Failed to fetch available bots for project');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch available bots for project');
    }
  }

  // ==================== EVENT BOT ASSIGNMENTS ====================

  /// Assign a bot to a calendar event
  Future<ApiResponse<Map<String, dynamic>>> assignBotToEvent(
    String workspaceId,
    String eventId,
    String botId, {
    Map<String, dynamic>? settings,
    bool isActive = true,
  }) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/events/$eventId/bots',
        data: {
          'botId': botId,
          if (settings != null) 'settings': settings,
          'isActive': isActive,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data is Map && data['data'] != null) {
          return ApiResponse.success(Map<String, dynamic>.from(data['data']));
        }
        return ApiResponse.success(Map<String, dynamic>.from(data));
      }

      return ApiResponse.error('Failed to assign bot to event');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to assign bot to event');
    }
  }

  /// Unassign a bot from a calendar event
  Future<ApiResponse<void>> unassignBotFromEvent(
    String workspaceId,
    String eventId,
    String botId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/calendar/events/$eventId/bots/$botId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(null);
      }

      return ApiResponse.error('Failed to unassign bot from event');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to unassign bot from event');
    }
  }

  /// Get bots assigned to a calendar event
  Future<ApiResponse<List<Map<String, dynamic>>>> getEventBots(
    String workspaceId,
    String eventId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/events/$eventId/bots',
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> botsList;

        if (data is Map && data['data'] != null) {
          botsList = data['data'] as List;
        } else if (data is List) {
          botsList = data;
        } else {
          botsList = [];
        }

        final bots = botsList.map((json) => Map<String, dynamic>.from(json)).toList();
        return ApiResponse.success(bots);
      }

      return ApiResponse.error('Failed to fetch event bots');
    } on DioException catch (e) {
      return ApiResponse.error(e.message ?? 'Failed to fetch event bots');
    }
  }
}
