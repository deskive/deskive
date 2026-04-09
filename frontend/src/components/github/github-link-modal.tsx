import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  GitPullRequest,
  CircleDot,
  ExternalLink,
  Github,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  githubApi,
  type GitHubRepository,
  type GitHubIssue,
  type GitHubIssueLink,
} from '@/lib/api/github-api';
import { formatUpdatedAt } from '@/lib/api/github-api';

interface GitHubLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  taskId: string;
  existingLinks?: GitHubIssueLink[];
  onLinkAdded?: (link: GitHubIssueLink) => void;
}

type Step = 'repo' | 'issue';

export function GitHubLinkModal({
  open,
  onOpenChange,
  workspaceId,
  taskId,
  existingLinks = [],
  onLinkAdded,
}: GitHubLinkModalProps) {
  const [step, setStep] = useState<Step>('repo');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repository selection
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);

  // Issue selection
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [issueFilter, setIssueFilter] = useState<'all' | 'issue' | 'pull_request'>('all');
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [autoUpdateStatus, setAutoUpdateStatus] = useState(false);

  // Load repositories when modal opens
  useEffect(() => {
    if (open) {
      loadRepositories();
    } else {
      // Reset state when modal closes
      setStep('repo');
      setSelectedRepo(null);
      setIssues([]);
      setRepoSearchQuery('');
      setIssueSearchQuery('');
      setError(null);
    }
  }, [open, workspaceId]);

  // Load issues when repository is selected or filters change
  useEffect(() => {
    if (selectedRepo) {
      loadIssues();
    }
  }, [selectedRepo, issueFilter, stateFilter]);

  const loadRepositories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await githubApi.listRepositories(workspaceId, { perPage: 100 });
      setRepositories(response.repositories);
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIssues = async () => {
    if (!selectedRepo) return;

    try {
      setIsLoading(true);
      setError(null);
      const [owner, repo] = selectedRepo.fullName.split('/');
      const response = await githubApi.listIssues(workspaceId, owner, repo, {
        type: issueFilter,
        state: stateFilter,
        perPage: 50,
      });
      setIssues(response.issues);
    } catch (err: any) {
      setError(err.message || 'Failed to load issues');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepoSelect = (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setStep('issue');
    setIssueSearchQuery('');
  };

  const handleLinkIssue = async (issue: GitHubIssue) => {
    if (!selectedRepo) return;

    // Check if already linked
    const isAlreadyLinked = existingLinks.some(
      link =>
        link.repoFullName === selectedRepo.fullName && link.issueNumber === issue.number
    );

    if (isAlreadyLinked) {
      setError('This issue is already linked to this task');
      return;
    }

    try {
      setIsLinking(true);
      setError(null);
      const [owner, repo] = selectedRepo.fullName.split('/');

      const link = await githubApi.linkIssueToTask(workspaceId, {
        taskId,
        repoOwner: owner,
        repoName: repo,
        issueNumber: issue.number,
        autoUpdateTaskStatus: autoUpdateStatus,
      });

      onLinkAdded?.(link);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to link issue');
    } finally {
      setIsLinking(false);
    }
  };

  // Filter repositories by search
  const filteredRepos = repositories.filter(
    repo =>
      repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(repoSearchQuery.toLowerCase())
  );

  // Filter issues by search
  const filteredIssues = issues.filter(
    issue =>
      issue.title.toLowerCase().includes(issueSearchQuery.toLowerCase()) ||
      `#${issue.number}`.includes(issueSearchQuery)
  );

  const getIssueIcon = (issue: GitHubIssue) => {
    if (issue.type === 'pull_request') {
      return issue.merged ? (
        <GitPullRequest className="w-4 h-4 text-purple-500" />
      ) : issue.state === 'closed' ? (
        <GitPullRequest className="w-4 h-4 text-red-500" />
      ) : (
        <GitPullRequest className="w-4 h-4 text-green-500" />
      );
    }
    return issue.state === 'closed' ? (
      <CircleDot className="w-4 h-4 text-purple-500" />
    ) : (
      <CircleDot className="w-4 h-4 text-green-500" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Link GitHub Issue or PR
          </DialogTitle>
          <DialogDescription>
            {step === 'repo'
              ? 'Select a repository to browse issues and pull requests'
              : `Select an issue or PR from ${selectedRepo?.fullName}`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {step === 'repo' ? (
          <>
            {/* Repository Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={repoSearchQuery}
                onChange={e => setRepoSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Repository List */}
            <ScrollArea className="flex-1 max-h-[400px] -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {repositories.length === 0
                    ? 'No repositories found. Make sure your GitHub account is connected.'
                    : 'No repositories match your search.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRepos.map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepoSelect(repo)}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-muted text-left transition-colors"
                    >
                      <Github className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{repo.fullName}</div>
                        {repo.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {repo.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {repo.private && (
                          <Badge variant="outline" className="text-xs">
                            Private
                          </Badge>
                        )}
                        <span>{repo.openIssuesCount} issues</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('repo');
                setSelectedRepo(null);
                setIssues([]);
              }}
              className="w-fit -ml-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
              Back to repositories
            </Button>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={issueSearchQuery}
                  onChange={e => setIssueSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={issueFilter}
                onValueChange={(v: 'all' | 'issue' | 'pull_request') => setIssueFilter(v)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="issue">Issues</SelectItem>
                  <SelectItem value="pull_request">PRs</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={stateFilter}
                onValueChange={(v: 'open' | 'closed' | 'all') => setStateFilter(v)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto-update option */}
            <div className="flex items-center space-x-2 py-2 border-b">
              <Checkbox
                id="autoUpdate"
                checked={autoUpdateStatus}
                onCheckedChange={(checked: boolean) => setAutoUpdateStatus(checked)}
              />
              <Label htmlFor="autoUpdate" className="text-sm cursor-pointer">
                Auto-complete task when issue/PR closes
              </Label>
            </div>

            {/* Issue List */}
            <ScrollArea className="flex-1 max-h-[350px] -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {issues.length === 0
                    ? 'No issues or PRs found in this repository.'
                    : 'No issues match your search.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredIssues.map(issue => {
                    const isLinked = existingLinks.some(
                      link =>
                        link.repoFullName === selectedRepo?.fullName &&
                        link.issueNumber === issue.number
                    );

                    return (
                      <button
                        key={issue.id}
                        onClick={() => handleLinkIssue(issue)}
                        disabled={isLinked || isLinking}
                        className={`w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors ${
                          isLinked
                            ? 'opacity-50 cursor-not-allowed bg-muted/50'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="mt-0.5">{getIssueIcon(issue)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{issue.title}</span>
                            {isLinked && (
                              <Badge variant="secondary" className="text-xs">
                                Linked
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>#{issue.number}</span>
                            <span>by {issue.authorLogin}</span>
                            <span>{formatUpdatedAt(issue.updatedAt)}</span>
                          </div>
                          {issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {issue.labels.slice(0, 3).map(label => (
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
                              {issue.labels.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{issue.labels.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <a
                          href={issue.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {isLinking && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Linking issue...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
