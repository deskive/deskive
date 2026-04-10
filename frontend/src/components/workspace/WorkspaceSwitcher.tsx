/**
 * Workspace Switcher Component
 * Dropdown for switching between workspaces (follows TeamAtOnce design)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useIntl } from 'react-intl';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  Plus,
  Check,
  Building2,
  Settings,
  Users,
  BarChart3,
  Crown,
  Sparkles,
  User,
  Shield,
  Bell,
  CreditCard
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to get plan badge styling
const getPlanBadgeConfig = (plan: string | undefined) => {
  switch (plan?.toLowerCase()) {
    case 'enterprise':
      return {
        label: 'Enterprise',
        className: 'gradient-primary text-white border-0 shadow-sm',
        icon: Sparkles
      };
    case 'professional':
      return {
        label: 'Pro',
        className: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0 shadow-sm',
        icon: Crown
      };
    case 'starter':
      return {
        label: 'Starter',
        className: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm',
        icon: null
      };
    case 'free':
    default:
      return {
        label: 'Free',
        className: 'bg-muted text-muted-foreground border-border',
        icon: null
      };
  }
};

export const WorkspaceSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();

  // Fetch subscription for current workspace
  const { data: subscription } = useSubscription(currentWorkspace?.id || '');

  // Debug logging
  useEffect(() => {
   
  }, [currentWorkspace, workspaces, isLoading]);

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      navigate(`/workspaces/${workspaceId}/dashboard`);
    }
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    navigate('/create-workspace');
  };

  const handleQuickAction = (action: 'profile' | 'security' | 'notifications' | 'team' | 'billing' | 'workspace' | 'analytics') => {
    if (!currentWorkspace) return;
    setIsOpen(false);

    if (action === 'analytics') {
      navigate(`/workspaces/${currentWorkspace.id}/analytics`);
      return;
    }

    // All settings-related actions
    navigate(`/workspaces/${currentWorkspace.id}/settings?tab=${action}`);
  };

  // Show loading skeleton while workspaces are being fetched
  if (!currentWorkspace && isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg animate-pulse">
        <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0" />
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="w-4 h-4 bg-muted rounded" />
      </div>
    );
  }

  // Hide completely if no workspace and not loading (shouldn't happen in workspace routes)
  if (!currentWorkspace) {
    return null;
  }

  // Get workspace initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get plan badge config
  const planConfig = getPlanBadgeConfig(subscription?.plan);
  const PlanIcon = planConfig.icon;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
        >
          {/* Workspace Icon */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            {currentWorkspace.logo ? (
              <img
                src={currentWorkspace.logo}
                alt={currentWorkspace.name}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {getInitials(currentWorkspace.name)}
              </span>
            )}
          </div>

          {/* Workspace Name */}
          <span className="text-sm font-medium text-foreground max-w-[150px] truncate">
            {currentWorkspace.name}
          </span>

          {/* Plan Badge */}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 font-medium flex items-center gap-1",
              planConfig.className
            )}
          >
            {PlanIcon && <PlanIcon className="w-3 h-3" />}
            {planConfig.label}
          </Badge>

          {/* Dropdown Icon */}
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[500px] p-0">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {intl.formatMessage(
                      { id: 'workspace.yourWorkspaces' },
                      { count: workspaces.length }
                    )}
                  </h3>
                  <button
                    onClick={handleCreateWorkspace}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {intl.formatMessage({ id: 'workspace.newWorkspace' })}
                  </button>
                </div>
              </div>

              {/* Workspaces List */}
              <div className="max-h-64 overflow-y-auto py-2">
                {workspaces.map((workspace) => {
                  const isSelected = currentWorkspace?.id === workspace.id;
                  const isOwner = workspace.user_role === 'owner';

                  return (
                    <button
                      key={workspace.id}
                      onClick={() => handleWorkspaceChange(workspace.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors",
                        isSelected && "bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-blue-600"
                      )}
                    >
                      {/* Workspace Icon */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                        {workspace.logo ? (
                          <img
                            src={workspace.logo}
                            alt={workspace.name}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {getInitials(workspace.name)}
                          </span>
                        )}
                      </div>

                      {/* Workspace Info */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {workspace.name}
                          </p>
                          {isOwner && (
                            <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        {/* <p className="text-xs text-muted-foreground">
                          {workspace.member_count || 0} members • {workspace.project_count || 0} projects
                        </p> */}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="border-t px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {intl.formatMessage({ id: 'workspace.quickActions' })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickAction('profile')}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{intl.formatMessage({ id: 'sidebar.settings.profile', defaultMessage: 'Profile' })}</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('security')}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{intl.formatMessage({ id: 'sidebar.settings.security', defaultMessage: 'Security' })}</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('notifications')}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{intl.formatMessage({ id: 'sidebar.settings.notifications', defaultMessage: 'Notifications' })}</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('team')}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{intl.formatMessage({ id: 'sidebar.settings.team', defaultMessage: 'Team' })}</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('billing')}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{intl.formatMessage({ id: 'sidebar.settings.billing', defaultMessage: 'Billing' })}</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('workspace')}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{intl.formatMessage({ id: 'sidebar.settings.workspace', defaultMessage: 'Workspace' })}</span>
                  </button>
                </div>
              </div>

              {/* Create Workspace Button */}
              <div className="border-t px-4 py-3">
                <button
                  onClick={handleCreateWorkspace}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-gradient-primary font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{intl.formatMessage({ id: 'workspace.createNewWorkspace' })}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSwitcher;
