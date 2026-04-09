import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  MessageSquare,
  FileText,
  Users,
  Clock,
  Zap,
  ArrowRight,
  ExternalLink,
  Calendar,
  Video,
  FolderOpen,
  StickyNote,
  Star,
  Share2,
  MoreHorizontal,
  Sparkles,
  Tag,
  Cloud,
  Mail
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Card, CardContent } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { formatRelativeTime } from '../../lib/search/searchUtils';
import type {
  SearchResults as SearchResultsType,
  SearchResult,
  MessageSearchResult,
  FileSearchResult,
  FolderSearchResult,
  ProjectSearchResult,
  NoteSearchResult,
  CalendarSearchResult,
  VideoSearchResult,
  EmailSearchResult,
  SearchType,
  SearchSource
} from '../../types/search';
import { useWorkspaceMembers } from '../../lib/api/workspace-api';
import { useProjects } from '../../lib/api/projects-api';
import { useFilesAndFolders } from '../../lib/api/files-api';
import { chatService } from '../../lib/api/chat-api';

interface SearchResultsProps {
  results: SearchResultsType;
  searchType: SearchType;
  isLoading: boolean;
  searchQuery: string;
  onSearchTypeChange?: (type: SearchType) => void;
}

export function SearchResults({ results, searchType, isLoading, searchQuery, onSearchTypeChange }: SearchResultsProps) {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Fetch workspace stats for overview card (same as dashboard)
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '');
  const { data: projectsResponse } = useProjects(workspaceId || '');
  const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || []);
  const { data: files = [] } = useFilesAndFolders(workspaceId || '', null);

  // Fetch messages count
  const [messagesCount, setMessagesCount] = useState(0);
  useEffect(() => {
    if (workspaceId) {
      chatService.getConversations(workspaceId)
        .then(conversations => {
          if (conversations.length === 0) {
            setMessagesCount(0);
            return;
          }
          Promise.all(
            conversations.map(conversation =>
              chatService.getConversationMessages(workspaceId, conversation.id, { limit: 1000 })
            )
          ).then(messagesArrays => {
            const totalMessages = messagesArrays.reduce((total, response) => {
              const messages = response.data || [];
              return total + messages.length;
            }, 0);
            setMessagesCount(totalMessages);
          }).catch(() => setMessagesCount(0));
        })
        .catch(() => setMessagesCount(0));
    }
  }, [workspaceId]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'message': return MessageSquare;
      case 'file': return FileText;
      case 'folder': return FolderOpen;
      case 'project': return FolderOpen;
      case 'note': return StickyNote;
      case 'calendar': return Calendar;
      case 'video': return Video;
      case 'email': return Mail;
      default: return FileText;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-600';
      case 'file': return 'text-green-600';
      case 'folder': return 'text-orange-600';
      case 'project': return 'text-purple-600';
      case 'note': return 'text-yellow-600';
      case 'calendar': return 'text-red-600';
      case 'video': return 'text-indigo-600';
      case 'email': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  // Strip HTML tags from text
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const highlightText = (text: string, highlights?: string[]) => {
    if (!text) return text;

    // Strip HTML tags first
    const cleanText = stripHtml(text);

    if (!highlights?.length) return cleanText;

    let highlightedText = cleanText;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const allResults = searchType === 'all'
    ? Object.values(results).flat().filter((r): r is SearchResult => Boolean(r))
    : (results[searchType === 'videos' ? 'videos' : searchType] || []);

  if (!searchQuery) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">
              {intl.formatMessage({ id: 'modules.search.dashboard.title', defaultMessage: 'Search Dashboard' })}
            </h2>
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'modules.search.dashboard.description', defaultMessage: 'Discover content, find what you need, and explore your workspace.' })}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Workspace Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">
                    {intl.formatMessage({ id: 'modules.search.dashboard.workspaceOverview', defaultMessage: 'Workspace Overview' })}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        {intl.formatMessage({ id: 'modules.search.dashboard.messages', defaultMessage: 'Messages' })}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{messagesCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {intl.formatMessage({ id: 'modules.search.dashboard.files', defaultMessage: 'Files' })}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{files.length.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">
                        {intl.formatMessage({ id: 'modules.search.dashboard.projects', defaultMessage: 'Projects' })}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{projects.length.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">
                        {intl.formatMessage({ id: 'modules.search.dashboard.teamMembers', defaultMessage: 'Team Members' })}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{workspaceMembers.length.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {/* <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">New document uploaded</p>
                      <p className="text-xs text-muted-foreground">Q3 Marketing Strategy.pdf • 2 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Message in #general</p>
                      <p className="text-xs text-muted-foreground">Sarah: "Great work on the demo!" • 5 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Meeting scheduled</p>
                      <p className="text-xs text-muted-foreground">Sprint Planning • Tomorrow 10:00 AM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            {/* Search Suggestions */}
            {/*  <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">AI Suggestions</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg cursor-pointer hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium">📊 Show me this week's project updates</p>
                    <p className="text-xs text-muted-foreground mt-1">Find recent progress reports and status updates</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg cursor-pointer hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium">💡 What decisions were made in recent meetings?</p>
                    <p className="text-xs text-muted-foreground mt-1">Search meeting notes for action items</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg cursor-pointer hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium">🔍 Find files I haven't opened recently</p>
                    <p className="text-xs text-muted-foreground mt-1">Discover forgotten documents</p>
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>

          {/* Search Tips */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold">Search Tips</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Use quotes for exact phrases</p>
                  <p className="text-muted-foreground">"product launch"</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Filter by file type</p>
                  <p className="text-muted-foreground">type:pdf budget</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Search by author</p>
                  <p className="text-muted-foreground">from:john design</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Use AI for context</p>
                  <p className="text-muted-foreground">Enable AI mode for smarter results</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (allResults.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        {/* Results by Type */}
        {searchType === 'all' ? (
          <div className="space-y-8">
            {Object.entries(results).map(([type, typeResults]) => {
              if (!typeResults?.length) return null;

              const Icon = getResultIcon(type);
              const colorClass = getResultColor(type);

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={cn("h-5 w-5", colorClass)} />
                    <h3 className="text-lg font-semibold capitalize">{type}s</h3>
                    <Badge variant="outline">{typeResults.length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {type !== "all" ? (
                      typeResults.slice(0, 5).map((result) => (
                        <ResultCard
                          key={result.id}
                          result={result}
                          searchQuery={searchQuery}
                          highlightText={highlightText}
                          workspaceId={workspaceId || ''}
                        />
                      ))
                    ) : (
                      typeResults.map((result) => (
                        <ResultCard
                          key={result.id}
                          result={result}
                          searchQuery={searchQuery}
                          highlightText={highlightText}
                          workspaceId={workspaceId || ''}
                        />
                      ))
                    )}


                    {typeResults.length > 5 && type !== 'all' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => onSearchTypeChange?.(type as SearchType)}
                      >
                        View all {typeResults.length} {type}s
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {allResults.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                searchQuery={searchQuery}
                highlightText={highlightText}
                workspaceId={workspaceId || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultCardProps {
  result: SearchResult;
  searchQuery: string;
  highlightText: (text: string, highlights?: string[]) => React.ReactElement | string;
  workspaceId: string;
}

function ResultCard({ result, searchQuery, highlightText, workspaceId }: ResultCardProps) {
  const navigate = useNavigate();
  const Icon = getResultIcon(result.type);

  const handleResultClick = () => {
    const basePath = `/workspaces/${workspaceId}`;

    // If external source, open external URL
    if (result.source !== 'deskive' && result.externalUrl) {
      window.open(result.externalUrl, '_blank');
      return;
    }

    switch (result.type) {
      case 'project':
        navigate(`${basePath}/projects/${result.id}`);
        break;
      case 'message':
        // Navigate to chat with channel
        const messageResult = result as MessageSearchResult;
        navigate(`${basePath}/chat?channel=${messageResult.channel}`);
        break;
      case 'file':
        // Navigate to files with parent folder opened
        const fileResult = result as FileSearchResult;
        const parentFolderId = fileResult.parentId || 'root';
        navigate(`${basePath}/files/all-files/${parentFolderId}`);
        break;
      case 'folder':
        // Navigate to files with folder opened
        navigate(`${basePath}/files/all-files/${result.id}`);
        break;
      case 'note':
        // Navigate to notes with note opened
        navigate(`${basePath}/notes/${result.id}`);
        break;
      case 'calendar':
        // Navigate to calendar with event
        navigate(`${basePath}/calendar?eventId=${result.id}`);
        break;
      case 'video':
        // Navigate to video call/recording
        navigate(`${basePath}/calls?videoId=${result.id}`);
        break;
      default:
        break;
    }
  };

  // Get source badge info
  const getSourceBadge = (source: SearchSource) => {
    switch (source) {
      case 'google-drive':
        return { label: 'Google Drive', icon: Cloud, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'google-calendar':
        return { label: 'Google Calendar', icon: Calendar, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      case 'gmail':
        return { label: 'Gmail', icon: Mail, className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' };
      case 'smtp-imap':
        return { label: 'Email', icon: Mail, className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' };
      default:
        return null;
    }
  };

  const sourceBadge = getSourceBadge(result.source);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleResultClick}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className={cn("p-2 rounded-lg", getResultBgColor(result.type))}>
            <Icon className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">
                    {highlightText(result.title, result.highlights)}
                  </h4>
                  {sourceBadge && (
                    <Badge variant="secondary" className={cn("text-xs px-1.5 py-0 h-5 flex items-center gap-1", sourceBadge.className)}>
                      <sourceBadge.icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{sourceBadge.label}</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {highlightText(result.snippet, result.highlights)}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Star className="h-4 w-4 mr-2" />
                    Star
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={result.author?.imageUrl || undefined} />
                  <AvatarFallback>{result.author?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <span>{result.author?.name || 'Unknown'}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(result.updatedAt)}</span>
              </div>

              {result.workspace && (
                <div className="flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  <span>{result.workspace}</span>
                </div>
              )}

              {result.relevanceScore && (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>{Math.round(result.relevanceScore * 100)}%</span>
                </div>
              )}
            </div>

            {/* Tags and metadata */}
            {result.metadata?.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.metadata.tags.slice(0, 3).map((tag: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="h-2 w-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getResultIcon(type: string) {
  switch (type) {
    case 'message': return MessageSquare;
    case 'file': return FileText;
    case 'folder': return FolderOpen;
    case 'project': return FolderOpen;
    case 'note': return StickyNote;
    case 'calendar': return Calendar;
    case 'video': return Video;
    default: return FileText;
  }
}

function getResultColor(type: string) {
  switch (type) {
    case 'message': return 'text-blue-600';
    case 'file': return 'text-green-600';
    case 'folder': return 'text-orange-600';
    case 'project': return 'text-purple-600';
    case 'note': return 'text-yellow-600';
    case 'calendar': return 'text-red-600';
    case 'video': return 'text-indigo-600';
    default: return 'text-gray-600';
  }
}

function getResultBgColor(type: string) {
  switch (type) {
    case 'message': return 'bg-blue-600';
    case 'file': return 'bg-green-600';
    case 'folder': return 'bg-orange-600';
    case 'project': return 'bg-purple-600';
    case 'note': return 'bg-yellow-600';
    case 'calendar': return 'bg-red-600';
    case 'video': return 'bg-indigo-600';
    case 'email': return 'bg-pink-600';
    default: return 'bg-gray-600';
  }
}
