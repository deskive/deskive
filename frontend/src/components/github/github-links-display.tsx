import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GitPullRequest,
  CircleDot,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Unlink,
  Loader2,
  Plus,
  Github,
} from 'lucide-react';
import { githubApi, type GitHubIssueLink, formatUpdatedAt } from '@/lib/api/github-api';
import { GitHubLinkModal } from './github-link-modal';

interface GitHubLinksDisplayProps {
  workspaceId: string;
  taskId: string;
  links: GitHubIssueLink[];
  onLinksChange?: (links: GitHubIssueLink[]) => void;
  compact?: boolean;
  showAddButton?: boolean;
}

export function GitHubLinksDisplay({
  workspaceId,
  taskId,
  links,
  onLinksChange,
  compact = false,
  showAddButton = true,
}: GitHubLinksDisplayProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [syncingLinkId, setSyncingLinkId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleSync = async (linkId: string) => {
    try {
      setSyncingLinkId(linkId);
      const updatedLink = await githubApi.syncIssueLink(workspaceId, linkId);
      onLinksChange?.(links.map(l => (l.id === linkId ? updatedLink : l)));
    } catch (error) {
      console.error('Failed to sync link:', error);
    } finally {
      setSyncingLinkId(null);
    }
  };

  const handleUnlink = async (linkId: string) => {
    try {
      setUnlinkingId(linkId);
      await githubApi.unlinkIssueFromTask(workspaceId, linkId);
      onLinksChange?.(links.filter(l => l.id !== linkId));
    } catch (error) {
      console.error('Failed to unlink:', error);
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleLinkAdded = (newLink: GitHubIssueLink) => {
    onLinksChange?.([...links, newLink]);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'closed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'merged':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getIcon = (link: GitHubIssueLink) => {
    if (link.issueType === 'pull_request') {
      return link.state === 'merged' ? (
        <GitPullRequest className="w-4 h-4 text-purple-500" />
      ) : link.state === 'closed' ? (
        <GitPullRequest className="w-4 h-4 text-red-500" />
      ) : (
        <GitPullRequest className="w-4 h-4 text-green-500" />
      );
    }
    return link.state === 'closed' ? (
      <CircleDot className="w-4 h-4 text-purple-500" />
    ) : (
      <CircleDot className="w-4 h-4 text-green-500" />
    );
  };

  if (compact) {
    // Compact view for task cards
    return (
      <div className="flex flex-wrap gap-1">
        {links.map(link => (
          <TooltipProvider key={link.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={link.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-muted hover:bg-muted/80 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  {getIcon(link)}
                  <span className="max-w-[100px] truncate">#{link.issueNumber}</span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">{link.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {link.repoFullName} #{link.issueNumber}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {showAddButton && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={e => {
                e.stopPropagation();
                setLinkModalOpen(true);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Link
            </Button>
            <GitHubLinkModal
              open={linkModalOpen}
              onOpenChange={setLinkModalOpen}
              workspaceId={workspaceId}
              taskId={taskId}
              existingLinks={links}
              onLinkAdded={handleLinkAdded}
            />
          </>
        )}
      </div>
    );
  }

  // Full view for task detail modal
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub Links
        </h3>
        {showAddButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkModalOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Link Issue/PR
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          No GitHub issues or PRs linked to this task.
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div
              key={link.id}
              className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5">{getIcon(link)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={link.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline truncate"
                  >
                    {link.title}
                  </a>
                  <Badge variant="outline" className={`text-xs ${getStateColor(link.state)}`}>
                    {link.state}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{link.repoFullName}</span>
                  <span>#{link.issueNumber}</span>
                  {link.authorLogin && <span>by {link.authorLogin}</span>}
                  {link.updatedAtGithub && (
                    <span>updated {formatUpdatedAt(link.updatedAtGithub)}</span>
                  )}
                </div>
                {link.labels && link.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {link.labels.slice(0, 4).map(label => (
                      <Badge
                        key={label.name}
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          borderColor: `#${label.color}`,
                          color: `#${label.color}`,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                    {link.labels.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{link.labels.length - 4}
                      </span>
                    )}
                  </div>
                )}
                {link.autoUpdateTaskStatus && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Task will auto-complete when this {link.issueType === 'pull_request' ? 'PR' : 'issue'} closes
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={link.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Open in GitHub</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleSync(link.id)}
                      disabled={syncingLinkId === link.id}
                    >
                      {syncingLinkId === link.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUnlink(link.id)}
                      disabled={unlinkingId === link.id}
                      className="text-destructive"
                    >
                      {unlinkingId === link.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      Unlink
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <GitHubLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        workspaceId={workspaceId}
        taskId={taskId}
        existingLinks={links}
        onLinkAdded={handleLinkAdded}
      />
    </div>
  );
}
