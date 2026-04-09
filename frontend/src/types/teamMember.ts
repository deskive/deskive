/**
 * Team Member Types for Deskive
 *
 * Defines interfaces and types for workspace team member management
 */

import { MemberRole } from './workspace';

/**
 * Team member roles (using workspace MemberRole as base)
 */
export type TeamRole = MemberRole | 'developer' | 'designer' | 'qa';

/**
 * Team member availability status
 */
export type TeamMemberAvailability = 'available' | 'busy' | 'offline';

/**
 * Team member permissions
 */
export interface TeamMemberPermissions {
  canManageTeam?: boolean;
  canManageProjects?: boolean;
  canManageBilling?: boolean;
  canViewReports?: boolean;
  canAssignTasks?: boolean;
}

/**
 * Main team member interface
 */
export interface TeamMember {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  title?: string;
  permissions: TeamMemberPermissions;
  skills: string[];
  specializations?: string[];
  workload_percentage: number; // 0-100+
  availability: TeamMemberAvailability;
  online_status: boolean;
  current_projects: number;
  current_project_names?: string[];
  hourly_rate?: number;
  location?: string;
  timezone?: string;
  rating?: number;
  projects_completed?: number;
  hours_worked?: number;
  expertise?: string[];
  social_links?: {
    github?: string;
    linkedin?: string;
    website?: string;
  };
  joined_date: string;
  created_at: string;
  updated_at: string;
  is_owner?: boolean;
}

/**
 * Data for creating a new team member
 */
export interface CreateTeamMemberData {
  email: string;
  role: TeamRole;
  permissions?: TeamMemberPermissions;
  skills?: string[];
  hourly_rate?: number;
  title?: string;
}

/**
 * Data for updating a team member
 */
export interface UpdateTeamMemberData {
  role?: TeamRole;
  permissions?: TeamMemberPermissions;
  skills?: string[];
  workload_percentage?: number;
  availability?: TeamMemberAvailability;
  hourly_rate?: number;
  title?: string;
  specializations?: string[];
  location?: string;
  timezone?: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    website?: string;
  };
}

/**
 * Team member assignment to project
 */
export interface TeamMemberAssignment {
  id: string;
  team_member_id: string;
  project_id: string;
  assigned_date: string;
  role_in_project?: string;
  hours_allocated?: number;
}

/**
 * Team member statistics
 */
export interface TeamMemberStats {
  total_members: number;
  online_members: number;
  available_members: number;
  active_projects: number;
  average_utilization: number;
}

/**
 * API Response for team members list
 */
export interface TeamMembersResponse {
  data: TeamMember[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * API Response for single team member
 */
export interface TeamMemberResponse {
  data: TeamMember;
}

/**
 * Team member filter options
 */
export interface TeamMemberFilters {
  role?: TeamRole;
  availability?: TeamMemberAvailability;
  skills?: string[];
  minWorkload?: number;
  maxWorkload?: number;
}
