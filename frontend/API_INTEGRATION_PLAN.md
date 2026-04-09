# Deskive Frontend API Integration Plan

## Overview

This document outlines the comprehensive plan for integrating the Deskive frontend with the backend API using React Query (TanStack Query). The integration follows a modular pattern with separate API files for each feature module.

## Architecture

### 1. Core Setup

#### Fetch Wrapper (`src/lib/fetch.ts`)
A centralized fetch wrapper that handles:
- JWT token management
- Request/response interceptors
- Error handling
- Auth redirects

```typescript
// src/lib/fetch.ts
interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  silentAuthFailure?: boolean;
}

export async function fetchWithAuth(
  path: string,
  options: FetchOptions = {}
): Promise<Response> {
  const url = `${import.meta.env.VITE_API_URL}${path}`;
  const requireAuth = options.requireAuth ?? true;
  
  // Get token from localStorage or auth context
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth && !options.silentAuthFailure) {
    window.location.href = '/auth/login';
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (response.status === 401 && requireAuth && !options.silentAuthFailure) {
      localStorage.removeItem('auth_token');
      window.location.href = '/auth/login';
    }
    
    return response;
  } catch (error) {
    console.error(`API request to ${path} failed:`, error);
    throw error;
  }
}
```

#### API Configuration (`src/lib/config.ts`)
```typescript
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
```

### 2. Module-Based API Structure

Each feature module will have its own API file in `src/lib/api/`:

```
src/lib/api/
├── auth-api.ts
├── workspace-api.ts
├── chat-api.ts
├── projects-api.ts
├── files-api.ts
├── calendar-api.ts
├── notes-api.ts
├── video-call-api.ts
├── search-api.ts
├── analytics-api.ts
├── monitoring-api.ts
├── settings-api.ts
├── integrations-api.ts
├── whiteboard-api.ts
├── admin-api.ts
└── blog-api.ts
```

### 3. API Module Pattern

Each API module follows this pattern:

```typescript
// Example: src/lib/api/chat-api.ts
import { fetchWithAuth } from '@/lib/fetch';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { 
  Channel, 
  Message, 
  CreateChannelRequest,
  SendMessageRequest 
} from '@/types/chat';

// Query Keys
export const chatKeys = {
  all: ['chat'] as const,
  channels: () => [...chatKeys.all, 'channels'] as const,
  channel: (id: string) => [...chatKeys.channels(), id] as const,
  messages: (channelId: string) => [...chatKeys.channel(channelId), 'messages'] as const,
  message: (channelId: string, messageId: string) => [...chatKeys.messages(channelId), messageId] as const,
};

// API Functions
export const chatApi = {
  // Channels
  async getChannels(workspaceId: string): Promise<Channel[]> {
    const response = await fetchWithAuth(`/workspaces/${workspaceId}/channels`);
    if (!response.ok) throw new Error('Failed to fetch channels');
    return response.json();
  },

  async createChannel(workspaceId: string, data: CreateChannelRequest): Promise<Channel> {
    const response = await fetchWithAuth(`/workspaces/${workspaceId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create channel');
    return response.json();
  },

  // Messages
  async getMessages(channelId: string, page = 1, limit = 50): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const response = await fetchWithAuth(
      `/channels/${channelId}/messages?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  async sendMessage(channelId: string, data: SendMessageRequest): Promise<Message> {
    const response = await fetchWithAuth(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },
};

// React Query Hooks
export const useChatChannels = (workspaceId: string) => {
  return useQuery({
    queryKey: chatKeys.channels(),
    queryFn: () => chatApi.getChannels(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateChannelRequest }) =>
      chatApi.createChannel(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
    },
  });
};

export const useMessages = (channelId: string) => {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(channelId),
    queryFn: ({ pageParam = 1 }) => chatApi.getMessages(channelId, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    enabled: !!channelId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: SendMessageRequest }) =>
      chatApi.sendMessage(channelId, data),
    onSuccess: (newMessage, { channelId }) => {
      // Optimistic update
      queryClient.setQueryData(chatKeys.messages(channelId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                messages: [newMessage, ...page.messages],
              };
            }
            return page;
          }),
        };
      });
    },
  });
};
```

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)

1. **Create Fetch Wrapper**
   - [ ] Implement `src/lib/fetch.ts` with auth handling
   - [ ] Create `src/lib/config.ts` for API configuration
   - [ ] Set up error types in `src/types/api.ts`

2. **Configure React Query**
   - [ ] Update QueryClient configuration in App.tsx
   - [ ] Create query key factories
   - [ ] Set up global error handling

### Phase 2: Authentication & Core APIs (Day 2)

3. **Auth API Module**
   - [ ] Create `src/lib/api/auth-api.ts`
   - [ ] Implement login, register, logout, refresh token
   - [ ] Create auth hooks (useLogin, useRegister, etc.)
   - [ ] Update AuthContext to use React Query

4. **Workspace API Module**
   - [ ] Create `src/lib/api/workspace-api.ts`
   - [ ] Implement CRUD operations for workspaces
   - [ ] Create workspace hooks
   - [ ] Update WorkspaceContext

### Phase 3: Feature APIs (Days 3-5)

5. **Communication APIs**
   - [ ] Chat API (`chat-api.ts`)
   - [ ] Video Call API (`video-call-api.ts`)
   - [ ] WebSocket integration updates

6. **Content Management APIs**
   - [ ] Projects API (`projects-api.ts`)
   - [ ] Files API (`files-api.ts`)
   - [ ] Notes API (`notes-api.ts`)

7. **Productivity APIs**
   - [ ] Calendar API (`calendar-api.ts`)
   - [ ] Search API (`search-api.ts`)
   - [ ] Analytics API (`analytics-api.ts`)

8. **System APIs**
   - [ ] Settings API (`settings-api.ts`)
   - [ ] Integrations API (`integrations-api.ts`)
   - [ ] Monitoring API (`monitoring-api.ts`)
   - [ ] Admin API (`admin-api.ts`)

### Phase 4: Advanced Features (Days 6-7)

9. **Collaborative Features**
   - [ ] Whiteboard API (`whiteboard-api.ts`)
   - [ ] Real-time sync updates

10. **Public Features**
    - [ ] Blog API (`blog-api.ts`)
    - [ ] Public data fetching

### Phase 5: Optimization & Testing (Days 8-10)

11. **Performance Optimization**
    - [ ] Implement request deduplication
    - [ ] Add response caching strategies
    - [ ] Optimize bundle splitting

12. **Error Handling**
    - [ ] Global error boundary updates
    - [ ] Retry logic configuration
    - [ ] Offline support

13. **Testing**
    - [ ] Unit tests for API modules
    - [ ] Integration tests for hooks
    - [ ] E2E tests for critical flows

## API Module Template

```typescript
// Template: src/lib/api/[module]-api.ts
import { fetchWithAuth } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { /* Types */ } from '@/types/[module]';

// Query Keys
export const [module]Keys = {
  all: ['[module]'] as const,
  lists: () => [...[module]Keys.all, 'list'] as const,
  list: (filters: string) => [...[module]Keys.lists(), { filters }] as const,
  details: () => [...[module]Keys.all, 'detail'] as const,
  detail: (id: string) => [...[module]Keys.details(), id] as const,
};

// API Functions
export const [module]Api = {
  async getList(params?: any): Promise<any[]> {
    const response = await fetchWithAuth('/[module]', { params });
    if (!response.ok) throw new Error('Failed to fetch [module]');
    return response.json();
  },

  async getById(id: string): Promise<any> {
    const response = await fetchWithAuth(`/[module]/${id}`);
    if (!response.ok) throw new Error('Failed to fetch [module]');
    return response.json();
  },

  async create(data: any): Promise<any> {
    const response = await fetchWithAuth('/[module]', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create [module]');
    return response.json();
  },

  async update(id: string, data: any): Promise<any> {
    const response = await fetchWithAuth(`/[module]/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update [module]');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithAuth(`/[module]/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete [module]');
  },
};

// React Query Hooks
export const use[Module]List = (params?: any) => {
  return useQuery({
    queryKey: [module]Keys.list(JSON.stringify(params)),
    queryFn: () => [module]Api.getList(params),
  });
};

export const use[Module] = (id: string) => {
  return useQuery({
    queryKey: [module]Keys.detail(id),
    queryFn: () => [module]Api.getById(id),
    enabled: !!id,
  });
};

export const useCreate[Module] = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: [module]Api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [module]Keys.lists() });
    },
  });
};

export const useUpdate[Module] = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      [module]Api.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [module]Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: [module]Keys.lists() });
    },
  });
};

export const useDelete[Module] = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: [module]Api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [module]Keys.lists() });
    },
  });
};
```

## Best Practices

1. **Query Key Management**
   - Use factory functions for query keys
   - Include all dependencies in keys
   - Use hierarchical structure for easy invalidation

2. **Error Handling**
   - Implement retry logic for transient failures
   - Show user-friendly error messages
   - Log errors for debugging

3. **Optimistic Updates**
   - Use for instant UI feedback
   - Rollback on failure
   - Maintain consistency with server state

4. **Performance**
   - Use `staleTime` and `cacheTime` appropriately
   - Implement pagination for large datasets
   - Use `select` to transform data efficiently

5. **Type Safety**
   - Define all request/response types
   - Use generic types for reusable patterns
   - Avoid `any` types

## Migration Strategy

1. **Start with Auth**: Migrate authentication first as it's foundational
2. **Core Features Next**: Workspace, Chat, Projects
3. **Gradual Migration**: Keep existing services working during migration
4. **Feature Flags**: Use flags to switch between old and new implementations
5. **Testing**: Comprehensive testing before removing old code

## Success Criteria

- [ ] All API calls use the new fetch wrapper
- [ ] React Query handles all server state
- [ ] Consistent error handling across the app
- [ ] Type-safe API interfaces
- [ ] Optimistic updates for better UX
- [ ] Comprehensive test coverage
- [ ] Performance metrics improved
- [ ] Zero runtime errors in production

## Timeline

- **Week 1**: Core infrastructure + Authentication + 3 main modules
- **Week 2**: Remaining feature modules + optimization
- **Week 3**: Testing + migration completion + deployment

This plan ensures a systematic, maintainable approach to API integration that leverages React Query's powerful features for optimal developer experience and application performance.