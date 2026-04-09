import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../fetch';

// ==================== INTERFACES ====================

export interface EventBotAssignment {
  id: string;
  eventId: string;
  botId: string;
  userId: string;
  workspaceId: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Enriched fields
  botName?: string;
  botDisplayName?: string;
  botDescription?: string;
  botAvatarUrl?: string;
  botStatus?: string;
}

export interface AssignBotToEventRequest {
  botId: string;
  settings?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateBotAssignmentRequest {
  settings?: Record<string, any>;
  isActive?: boolean;
}

// ==================== QUERY KEYS ====================

export const eventBotAssignmentsKeys = {
  all: ['event-bot-assignments'] as const,
  forEvent: (eventId: string) => [...eventBotAssignmentsKeys.all, 'event', eventId] as const,
};

// ==================== API FUNCTIONS ====================

export const eventBotAssignmentsApi = {
  async getBotsForEvent(workspaceId: string, eventId: string): Promise<EventBotAssignment[]> {
    const response = await api.get<{ data: EventBotAssignment[] }>(
      `/workspaces/${workspaceId}/calendar/events/${eventId}/bots`
    );
    return response.data;
  },

  async assignBotToEvent(
    workspaceId: string,
    eventId: string,
    data: AssignBotToEventRequest
  ): Promise<EventBotAssignment> {
    const response = await api.post<{ data: EventBotAssignment }>(
      `/workspaces/${workspaceId}/calendar/events/${eventId}/bots`,
      data
    );
    return response.data;
  },

  async unassignBotFromEvent(
    workspaceId: string,
    eventId: string,
    botId: string
  ): Promise<void> {
    await api.delete(
      `/workspaces/${workspaceId}/calendar/events/${eventId}/bots/${botId}`
    );
  },

  async updateBotAssignment(
    workspaceId: string,
    eventId: string,
    botId: string,
    data: UpdateBotAssignmentRequest
  ): Promise<EventBotAssignment> {
    const response = await api.patch<{ data: EventBotAssignment }>(
      `/workspaces/${workspaceId}/calendar/events/${eventId}/bots/${botId}`,
      data
    );
    return response.data;
  },
};

// ==================== REACT QUERY HOOKS ====================

export const useEventBotAssignments = (workspaceId: string, eventId: string) => {
  return useQuery({
    queryKey: eventBotAssignmentsKeys.forEvent(eventId),
    queryFn: () => eventBotAssignmentsApi.getBotsForEvent(workspaceId, eventId),
    enabled: !!workspaceId && !!eventId,
  });
};

export const useAssignBotToEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      eventId,
      data,
    }: {
      workspaceId: string;
      eventId: string;
      data: AssignBotToEventRequest;
    }) => eventBotAssignmentsApi.assignBotToEvent(workspaceId, eventId, data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: eventBotAssignmentsKeys.forEvent(eventId),
      });
    },
  });
};

export const useUnassignBotFromEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      eventId,
      botId,
    }: {
      workspaceId: string;
      eventId: string;
      botId: string;
    }) => eventBotAssignmentsApi.unassignBotFromEvent(workspaceId, eventId, botId),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: eventBotAssignmentsKeys.forEvent(eventId),
      });
    },
  });
};

export const useUpdateBotAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      eventId,
      botId,
      data,
    }: {
      workspaceId: string;
      eventId: string;
      botId: string;
      data: UpdateBotAssignmentRequest;
    }) => eventBotAssignmentsApi.updateBotAssignment(workspaceId, eventId, botId, data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: eventBotAssignmentsKeys.forEvent(eventId),
      });
    },
  });
};
