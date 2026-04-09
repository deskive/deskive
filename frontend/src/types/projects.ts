export enum ProjectType {
  KANBAN = 'KANBAN',
  SCRUM = 'SCRUM',
  BUG_TRACKING = 'BUG_TRACKING',
  FEATURE_DEVELOPMENT = 'FEATURE_DEVELOPMENT',
  RESEARCH = 'RESEARCH'
}

export interface CreateProjectRequest {
  name: string
  description?: string
  key?: string
  type?: ProjectType
  workspaceId: string
  leadId?: string
  defaultAssigneeId?: string
  color?: string
  isPublic?: boolean
  settings?: {
    allowSubtasks?: boolean
    allowEpics?: boolean
    allowSprints?: boolean
    enableTimeTracking?: boolean
    enableStoryPoints?: boolean
    defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH'
    autoAssignReporter?: boolean
  }
}
