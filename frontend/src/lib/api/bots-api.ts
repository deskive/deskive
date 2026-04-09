import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../fetch';

// ==================== ENUMS (as const objects for value access) ====================

export const BotStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type BotStatus = typeof BotStatus[keyof typeof BotStatus];

export const BotType = {
  CUSTOM: 'custom',
  AI_ASSISTANT: 'ai_assistant',
  WEBHOOK: 'webhook',
  PREBUILT: 'prebuilt',
} as const;
export type BotType = typeof BotType[keyof typeof BotType];

export const TriggerType = {
  KEYWORD: 'keyword',
  REGEX: 'regex',
  SCHEDULE: 'schedule',
  WEBHOOK: 'webhook',
  MENTION: 'mention',
  ANY_MESSAGE: 'any_message',
} as const;
export type TriggerType = typeof TriggerType[keyof typeof TriggerType];

export const ActionType = {
  SEND_MESSAGE: 'send_message',
  SEND_AI_MESSAGE: 'send_ai_message',
  AI_AUTOPILOT: 'ai_autopilot',
  CREATE_TASK: 'create_task',
  CREATE_EVENT: 'create_event',
  CALL_WEBHOOK: 'call_webhook',
  SEND_EMAIL: 'send_email',
} as const;
export type ActionType = typeof ActionType[keyof typeof ActionType];

export const FailurePolicy = {
  CONTINUE: 'continue',
  STOP: 'stop',
  RETRY: 'retry',
} as const;
export type FailurePolicy = typeof FailurePolicy[keyof typeof FailurePolicy];

export const MatchType = {
  EXACT: 'exact',
  CONTAINS: 'contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
} as const;
export type MatchType = typeof MatchType[keyof typeof MatchType];

export const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;
export type ExecutionStatus = typeof ExecutionStatus[keyof typeof ExecutionStatus];

export interface BotSettings {
  rateLimit?: number;
  responseDelay?: number;
  maxExecutionDepth?: number;
}

export interface Bot {
  id: string;
  workspaceId: string;
  name: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  status: BotStatus;
  botType: BotType;
  settings: BotSettings;
  permissions: string[];
  webhookSecret?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields (from joins)
  triggerCount?: number;
  actionCount?: number;
}

export interface BotTrigger {
  id: string;
  botId: string;
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  isActive: boolean;
  priority: number;
  cooldownSeconds: number;
  conditions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BotAction {
  id: string;
  botId: string;
  triggerId?: string;
  name: string;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  executionOrder: number;
  isActive: boolean;
  failurePolicy: FailurePolicy;
  createdAt: string;
  updatedAt: string;
}

export interface BotInstallation {
  id: string;
  botId: string;
  channelId?: string;
  conversationId?: string;
  installedBy: string;
  isActive: boolean;
  settingsOverride: Record<string, any>;
  installedAt: string;
  uninstalledAt?: string;
}

export interface BotExecutionLog {
  id: string;
  botId: string;
  triggerId?: string;
  actionId?: string;
  installationId?: string;
  channelId?: string;
  conversationId?: string;
  messageId?: string;
  triggeredByUser?: string;
  triggerType?: string;
  triggerData: Record<string, any>;
  actionType?: string;
  actionInput: Record<string, any>;
  actionOutput: Record<string, any>;
  status: ExecutionStatus;
  errorMessage?: string;
  executionTimeMs?: number;
  createdAt: string;
}

// Request DTOs
export interface CreateBotRequest {
  name: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  status?: BotStatus;
  botType?: BotType;
  settings?: BotSettings;
  permissions?: string[];
  isPublic?: boolean;
}

export interface UpdateBotRequest {
  name?: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  status?: BotStatus;
  botType?: BotType;
  settings?: BotSettings;
  permissions?: string[];
  isPublic?: boolean;
}

export interface CreateTriggerRequest {
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  isActive?: boolean;
  priority?: number;
  cooldownSeconds?: number;
  conditions?: Record<string, any>;
}

export interface UpdateTriggerRequest {
  name?: string;
  triggerType?: TriggerType;
  triggerConfig?: Record<string, any>;
  isActive?: boolean;
  priority?: number;
  cooldownSeconds?: number;
  conditions?: Record<string, any>;
}

export interface CreateActionRequest {
  name: string;
  triggerId?: string;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  executionOrder?: number;
  isActive?: boolean;
  failurePolicy?: FailurePolicy;
}

export interface UpdateActionRequest {
  name?: string;
  triggerId?: string;
  actionType?: ActionType;
  actionConfig?: Record<string, any>;
  executionOrder?: number;
  isActive?: boolean;
  failurePolicy?: FailurePolicy;
}

export interface InstallBotRequest {
  channelId?: string;
  conversationId?: string;
  settingsOverride?: Record<string, any>;
}

export interface UninstallBotRequest {
  channelId?: string;
  conversationId?: string;
}

export interface TestBotRequest {
  testMessage: string;
  channelId?: string;
  conversationId?: string;
  executeActions?: boolean;
}

export interface TestBotResponse {
  triggersMatched: boolean;
  matchedTriggers: string[];
  actionsToExecute: {
    actionId: string;
    actionType: string;
    actionName: string;
    wouldExecute: boolean;
  }[];
  executionResults?: {
    actionId: string;
    success: boolean;
    output?: any;
    error?: string;
  }[];
}

export interface PrebuiltBot {
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatarUrl?: string;
  botType: 'prebuilt';
  status: 'active';
  category: string;
  features: string[];
  settings: Record<string, any>;
  permissions: string[];
  isActivated?: boolean;
  userBotId?: string | null;
}

export interface ActivatePrebuiltBotRequest {
  prebuiltBotId: string;
  customDisplayName?: string;
  customSettings?: Record<string, any>;
}

// ==================== QUERY KEYS ====================

export const botsKeys = {
  all: ['bots'] as const,
  list: (workspaceId: string) => [...botsKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, botId: string) => [...botsKeys.all, 'detail', workspaceId, botId] as const,
  triggers: (botId: string) => [...botsKeys.all, 'triggers', botId] as const,
  actions: (botId: string) => [...botsKeys.all, 'actions', botId] as const,
  installations: (botId: string) => [...botsKeys.all, 'installations', botId] as const,
  logs: (botId: string) => [...botsKeys.all, 'logs', botId] as const,
  prebuilt: (workspaceId: string) => [...botsKeys.all, 'prebuilt', workspaceId] as const,
};

// ==================== API FUNCTIONS ====================

export const botsApi = {
  // Bots CRUD
  async getBots(workspaceId: string): Promise<Bot[]> {
    const response = await api.get<{ data: Bot[] }>(`/workspaces/${workspaceId}/bots`);
    return response.data;
  },

  async getBot(workspaceId: string, botId: string): Promise<Bot> {
    const response = await api.get<{ data: Bot }>(`/workspaces/${workspaceId}/bots/${botId}`);
    return response.data;
  },

  async createBot(workspaceId: string, data: CreateBotRequest): Promise<Bot> {
    const response = await api.post<{ data: Bot }>(`/workspaces/${workspaceId}/bots`, data);
    return response.data;
  },

  async updateBot(workspaceId: string, botId: string, data: UpdateBotRequest): Promise<Bot> {
    const response = await api.patch<{ data: Bot }>(`/workspaces/${workspaceId}/bots/${botId}`, data);
    return response.data;
  },

  async deleteBot(workspaceId: string, botId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/bots/${botId}`);
  },

  async regenerateWebhookSecret(workspaceId: string, botId: string): Promise<string> {
    const response = await api.post<{ data: { webhookSecret: string } }>(`/workspaces/${workspaceId}/bots/${botId}/regenerate-webhook-secret`, {});
    return response.data.webhookSecret;
  },

  // Triggers
  async getTriggers(workspaceId: string, botId: string): Promise<BotTrigger[]> {
    const response = await api.get<{ data: BotTrigger[] }>(`/workspaces/${workspaceId}/bots/${botId}/triggers`);
    return response.data;
  },

  async createTrigger(workspaceId: string, botId: string, data: CreateTriggerRequest): Promise<BotTrigger> {
    const response = await api.post<{ data: BotTrigger }>(`/workspaces/${workspaceId}/bots/${botId}/triggers`, data);
    return response.data;
  },

  async updateTrigger(workspaceId: string, botId: string, triggerId: string, data: UpdateTriggerRequest): Promise<BotTrigger> {
    const response = await api.patch<{ data: BotTrigger }>(`/workspaces/${workspaceId}/bots/${botId}/triggers/${triggerId}`, data);
    return response.data;
  },

  async deleteTrigger(workspaceId: string, botId: string, triggerId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/bots/${botId}/triggers/${triggerId}`);
  },

  // Actions
  async getActions(workspaceId: string, botId: string): Promise<BotAction[]> {
    const response = await api.get<{ data: BotAction[] }>(`/workspaces/${workspaceId}/bots/${botId}/actions`);
    return response.data;
  },

  async createAction(workspaceId: string, botId: string, data: CreateActionRequest): Promise<BotAction> {
    const response = await api.post<{ data: BotAction }>(`/workspaces/${workspaceId}/bots/${botId}/actions`, data);
    return response.data;
  },

  async updateAction(workspaceId: string, botId: string, actionId: string, data: UpdateActionRequest): Promise<BotAction> {
    const response = await api.patch<{ data: BotAction }>(`/workspaces/${workspaceId}/bots/${botId}/actions/${actionId}`, data);
    return response.data;
  },

  async deleteAction(workspaceId: string, botId: string, actionId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/bots/${botId}/actions/${actionId}`);
  },

  async reorderActions(workspaceId: string, botId: string, actionIds: string[]): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/bots/${botId}/actions/reorder`, { actionIds });
  },

  // Installations
  async getInstallations(workspaceId: string, botId: string): Promise<BotInstallation[]> {
    const response = await api.get<{ data: BotInstallation[] }>(`/workspaces/${workspaceId}/bots/${botId}/installations`);
    return response.data;
  },

  async installBot(workspaceId: string, botId: string, data: InstallBotRequest): Promise<BotInstallation> {
    const response = await api.post<{ data: BotInstallation }>(`/workspaces/${workspaceId}/bots/${botId}/install`, data);
    return response.data;
  },

  async uninstallBot(workspaceId: string, botId: string, data: UninstallBotRequest): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/bots/${botId}/uninstall`, data);
  },

  // Testing & Logs
  async testBot(workspaceId: string, botId: string, data: TestBotRequest): Promise<TestBotResponse> {
    const response = await api.post<{ data: TestBotResponse }>(`/workspaces/${workspaceId}/bots/${botId}/test`, data);
    return response.data;
  },

  async getLogs(workspaceId: string, botId: string, params?: {
    triggerId?: string;
    actionId?: string;
    status?: string;
    channelId?: string;
    conversationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<BotExecutionLog[]> {
    const queryParams = new URLSearchParams();
    if (params?.triggerId) queryParams.append('triggerId', params.triggerId);
    if (params?.actionId) queryParams.append('actionId', params.actionId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.channelId) queryParams.append('channelId', params.channelId);
    if (params?.conversationId) queryParams.append('conversationId', params.conversationId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/workspaces/${workspaceId}/bots/${botId}/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<{ data: BotExecutionLog[] }>(url);
    return response.data;
  },

  // Prebuilt Bots
  async getPrebuiltBots(workspaceId: string): Promise<PrebuiltBot[]> {
    const response = await api.get<{ data: PrebuiltBot[] }>(`/workspaces/${workspaceId}/bots/prebuilt`);
    return response.data;
  },

  async activatePrebuiltBot(workspaceId: string, data: ActivatePrebuiltBotRequest): Promise<Bot> {
    const response = await api.post<{ data: Bot }>(`/workspaces/${workspaceId}/bots/prebuilt/activate`, data);
    return response.data;
  },

  async deactivatePrebuiltBot(workspaceId: string, botId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/bots/prebuilt/${botId}`);
  },

  // Project Bot Assignments
  async assignBotToProject(workspaceId: string, botId: string, projectId: string): Promise<any> {
    const response = await api.post<{ data: any }>(`/workspaces/${workspaceId}/bots/${botId}/assign-to-project/${projectId}`, {});
    return response.data;
  },

  async unassignBotFromProject(workspaceId: string, botId: string, projectId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/bots/${botId}/unassign-from-project/${projectId}`);
  },

  async getProjectBots(workspaceId: string, projectId: string): Promise<Bot[]> {
    const response = await api.get<{ data: Bot[] }>(`/workspaces/${workspaceId}/bots/projects/${projectId}/bots`);
    return response.data;
  },

  async getAvailableBotsForProject(workspaceId: string, projectId: string): Promise<(Bot & { isAssigned: boolean })[]> {
    const response = await api.get<{ data: (Bot & { isAssigned: boolean })[] }>(`/workspaces/${workspaceId}/bots/projects/${projectId}/available-bots`);
    return response.data;
  },
};

// ==================== REACT QUERY HOOKS ====================

// Bots
export const useBots = (workspaceId: string) => {
  return useQuery({
    queryKey: botsKeys.list(workspaceId),
    queryFn: () => botsApi.getBots(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useBot = (workspaceId: string, botId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: botsKeys.detail(workspaceId, botId),
    queryFn: () => botsApi.getBot(workspaceId, botId),
    enabled: options?.enabled !== false && !!workspaceId && !!botId,
  });
};

export const useCreateBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateBotRequest }) =>
      botsApi.createBot(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.list(workspaceId) });
    },
  });
};

export const useUpdateBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, data }: { workspaceId: string; botId: string; data: UpdateBotRequest }) =>
      botsApi.updateBot(workspaceId, botId, data),
    onSuccess: (_, { workspaceId, botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: botsKeys.detail(workspaceId, botId) });
    },
  });
};

export const useDeleteBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId }: { workspaceId: string; botId: string }) =>
      botsApi.deleteBot(workspaceId, botId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.list(workspaceId) });
    },
  });
};

// Triggers
export const useBotTriggers = (workspaceId: string, botId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: botsKeys.triggers(botId),
    queryFn: () => botsApi.getTriggers(workspaceId, botId),
    enabled: options?.enabled !== false && !!workspaceId && !!botId,
  });
};

export const useCreateTrigger = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, data }: { workspaceId: string; botId: string; data: CreateTriggerRequest }) =>
      botsApi.createTrigger(workspaceId, botId, data),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.triggers(botId) });
    },
  });
};

export const useUpdateTrigger = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, triggerId, data }: { workspaceId: string; botId: string; triggerId: string; data: UpdateTriggerRequest }) =>
      botsApi.updateTrigger(workspaceId, botId, triggerId, data),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.triggers(botId) });
    },
  });
};

export const useDeleteTrigger = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, triggerId }: { workspaceId: string; botId: string; triggerId: string }) =>
      botsApi.deleteTrigger(workspaceId, botId, triggerId),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.triggers(botId) });
    },
  });
};

// Actions
export const useBotActions = (workspaceId: string, botId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: botsKeys.actions(botId),
    queryFn: () => botsApi.getActions(workspaceId, botId),
    enabled: options?.enabled !== false && !!workspaceId && !!botId,
  });
};

export const useCreateAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, data }: { workspaceId: string; botId: string; data: CreateActionRequest }) =>
      botsApi.createAction(workspaceId, botId, data),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.actions(botId) });
    },
  });
};

export const useUpdateAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, actionId, data }: { workspaceId: string; botId: string; actionId: string; data: UpdateActionRequest }) =>
      botsApi.updateAction(workspaceId, botId, actionId, data),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.actions(botId) });
    },
  });
};

export const useDeleteAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, actionId }: { workspaceId: string; botId: string; actionId: string }) =>
      botsApi.deleteAction(workspaceId, botId, actionId),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.actions(botId) });
    },
  });
};

// Installations
export const useBotInstallations = (workspaceId: string, botId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: botsKeys.installations(botId),
    queryFn: () => botsApi.getInstallations(workspaceId, botId),
    enabled: options?.enabled !== false && !!workspaceId && !!botId,
  });
};

export const useInstallBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, data }: { workspaceId: string; botId: string; data: InstallBotRequest }) =>
      botsApi.installBot(workspaceId, botId, data),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.installations(botId) });
    },
  });
};

export const useUninstallBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, data }: { workspaceId: string; botId: string; data: UninstallBotRequest }) =>
      botsApi.uninstallBot(workspaceId, botId, data),
    onSuccess: (_, { botId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.installations(botId) });
    },
  });
};

// Testing & Logs
export const useTestBot = () => {
  return useMutation({
    mutationFn: ({ workspaceId, botId, data }: { workspaceId: string; botId: string; data: TestBotRequest }) =>
      botsApi.testBot(workspaceId, botId, data),
  });
};

export const useBotLogs = (workspaceId: string, botId: string, params?: {
  triggerId?: string;
  actionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: [...botsKeys.logs(botId), params],
    queryFn: () => botsApi.getLogs(workspaceId, botId, params),
    enabled: !!workspaceId && !!botId,
  });
};

// Prebuilt Bots
export const usePrebuiltBots = (workspaceId: string) => {
  return useQuery({
    queryKey: botsKeys.prebuilt(workspaceId),
    queryFn: () => botsApi.getPrebuiltBots(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useActivatePrebuiltBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: ActivatePrebuiltBotRequest }) =>
      botsApi.activatePrebuiltBot(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.prebuilt(workspaceId) });
      queryClient.invalidateQueries({ queryKey: botsKeys.list(workspaceId) });
    },
  });
};

export const useDeactivatePrebuiltBot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId }: { workspaceId: string; botId: string }) =>
      botsApi.deactivatePrebuiltBot(workspaceId, botId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: botsKeys.prebuilt(workspaceId) });
      queryClient.invalidateQueries({ queryKey: botsKeys.list(workspaceId) });
    },
  });
};

// Project Bot Assignments
export const useProjectBots = (workspaceId: string, projectId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...botsKeys.all, 'project', projectId],
    queryFn: () => botsApi.getProjectBots(workspaceId, projectId),
    enabled: options?.enabled !== false && !!workspaceId && !!projectId,
  });
};

export const useAvailableBotsForProject = (workspaceId: string, projectId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...botsKeys.all, 'project', projectId, 'available'],
    queryFn: () => botsApi.getAvailableBotsForProject(workspaceId, projectId),
    enabled: options?.enabled !== false && !!workspaceId && !!projectId,
  });
};

export const useAssignBotToProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, projectId }: { workspaceId: string; botId: string; projectId: string }) =>
      botsApi.assignBotToProject(workspaceId, botId, projectId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...botsKeys.all, 'project', projectId] });
    },
  });
};

export const useUnassignBotFromProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, botId, projectId }: { workspaceId: string; botId: string; projectId: string }) =>
      botsApi.unassignBotFromProject(workspaceId, botId, projectId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...botsKeys.all, 'project', projectId] });
    },
  });
};

// Backward compatibility export
export const botsService = botsApi;
