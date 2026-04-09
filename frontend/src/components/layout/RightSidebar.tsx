import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { cn } from '../../lib/utils';
import type { ViewType } from './NavigationRail';
import { ChatRightSidebar } from '../chat/ChatRightSidebar';
import { Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { VideoRightSidebar } from '@/components/video-call';
import { NotesRightSidebar } from '../notes/RightSidebar';
import { ProjectsRightSidebar } from '../projects/ProjectsRightSidebar';
import { CalendarRightSidebar } from '../calendar/CalendarRightSidebar';
import { FilesRightSidebarWrapper } from '../files/FilesRightSidebarWrapper';
import { DashboardRightSidebar } from '../dashboard/DashboardRightSidebar';
import { SearchRightSidebar } from '../search/SearchRightSidebar';

interface RightSidebarProps {
  currentView: ViewType;
  isCollapsed: boolean;
  isMinimized?: boolean;
  onToggleMinimized?: () => void;
  workspaceId?: string;
  projectsData?: {
    projects: any[];
    allTasks: any[];
  };
  chatData?: {
    messages: any[];
    hasSelectedChat: boolean;
    channelName?: string;
    channelDescription?: string;
    isPrivate?: boolean;
    memberCount?: number;
    chatType?: 'channel' | 'conversation';
    channelId?: string;
  };
  dashboardData?: any;
}

export function RightSidebar({
  currentView,
  isCollapsed,
  isMinimized = false,
  onToggleMinimized,
  workspaceId,
  projectsData,
  chatData,
  dashboardData
}: RightSidebarProps) {
  const intl = useIntl();
  // Get projectId from URL params
  const { projectId } = useParams<{ projectId?: string }>();

  const renderSidebarContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatRightSidebar
          isCollapsed={isMinimized}
          messages={chatData?.messages || []}
          hasSelectedChat={chatData?.hasSelectedChat || false}
          channelName={chatData?.channelName}
          channelDescription={chatData?.channelDescription}
          isPrivate={chatData?.isPrivate}
          memberCount={chatData?.memberCount}
          chatType={chatData?.chatType}
          channelId={chatData?.channelId}
          workspaceId={workspaceId}
        />;
      case 'video':
        return <VideoRightSidebar />;
      case 'notes':
        return <NotesRightSidebar />;
      case 'projects':
        return <ProjectsRightSidebar
          projects={projectsData?.projects || []}
          allTasks={projectsData?.allTasks || []}
          workspaceId={workspaceId}
          selectedProjectId={projectId}
        />;
      case 'calendar':
        return <CalendarRightSidebar />;
      case 'files':
        return <FilesRightSidebarWrapper />;
      case 'dashboard':
        return null; // Hide sidebar for dashboard
      case 'settings':
        return null; // Hide sidebar for settings
      case 'email':
        return null; // Hide sidebar for email - email has its own detail view
      case 'apps':
        return null; // Hide sidebar for apps
      case 'more':
        return null; // Hide sidebar for more
      case 'search':
        return <SearchRightSidebar />;

      case 'integrations':
      case 'analytics':
      case 'monitoring':
      default:
        return <DefaultRightSidebar currentView={currentView} />;
    }
  };

  const renderHeader = () => {
    if (currentView !== 'chat' || !isMinimized) return null;

    return (
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">
            {intl.formatMessage({ id: 'layout.rightSidebar.aiSummaries', defaultMessage: 'AI Summaries' })}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMinimized}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Force collapse for views that don't need a right sidebar
  const shouldForceCollapse = currentView === 'email' || currentView === 'apps' || currentView === 'more' || currentView === 'dashboard' || currentView === 'settings';
  const effectiveCollapsed = isCollapsed || shouldForceCollapse;

  return (
    <aside
      className={cn(
        "bg-card/80 backdrop-blur-xl border-l border-border flex flex-col transition-all duration-300",
        effectiveCollapsed ? "w-0 overflow-hidden" : "w-80"
      )}
    >
      {renderHeader()}
      {renderSidebarContent()}
    </aside>
  );
}

function DefaultRightSidebar({ currentView }: { currentView: ViewType }) {
  const intl = useIntl();

  const getViewLabel = (view: ViewType) => {
    const viewTranslationKeys: Record<ViewType, { id: string; defaultMessage: string }> = {
      dashboard: { id: 'navigation.dashboard', defaultMessage: 'Dashboard' },
      chat: { id: 'navigation.messages', defaultMessage: 'Chat' },
      projects: { id: 'navigation.projects', defaultMessage: 'Projects' },
      notes: { id: 'navigation.notes', defaultMessage: 'Notes' },
      calendar: { id: 'navigation.calendar', defaultMessage: 'Calendar' },
      video: { id: 'navigation.videoCall', defaultMessage: 'Video' },
      files: { id: 'navigation.files', defaultMessage: 'Files' },
      whiteboard: { id: 'navigation.whiteboard', defaultMessage: 'Whiteboard' },
      email: { id: 'navigation.email', defaultMessage: 'Email' },
      bots: { id: 'navigation.bots', defaultMessage: 'Bots' },
      search: { id: 'navigation.search', defaultMessage: 'Search' },
      settings: { id: 'navigation.settings', defaultMessage: 'Settings' },
      integrations: { id: 'navigation.integrations', defaultMessage: 'Integrations' },
      analytics: { id: 'navigation.analytics', defaultMessage: 'Analytics' },
      monitoring: { id: 'navigation.monitoring', defaultMessage: 'Monitoring' },
      apps: { id: 'navigation.apps', defaultMessage: 'Apps' },
      more: { id: 'navigation.more', defaultMessage: 'More' }
    };
    const translation = viewTranslationKeys[view];
    return translation ? intl.formatMessage(translation) : intl.formatMessage({ id: 'common.info', defaultMessage: 'Info' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <h3 className="text-lg font-semibold text-foreground mb-5">
        {intl.formatMessage(
          { id: 'layout.rightSidebar.info', defaultMessage: '{view} Info' },
          { view: getViewLabel(currentView) }
        )}
      </h3>
      <p className="text-sm text-muted-foreground">
        {intl.formatMessage({ id: 'layout.rightSidebar.selectItem', defaultMessage: 'Select an item to view details' })}
      </p>
    </div>
  );
}
