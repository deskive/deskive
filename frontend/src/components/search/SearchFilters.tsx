import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar as CalendarIcon, User, Tag, FolderOpen, FileType, Star, Share, Clock, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { SearchFilters } from '../../types/search';
import { cn } from '../../lib/utils';
import { useWorkspaceMembers } from '../../lib/api/workspace-api';
import { useProjects } from '../../lib/api/projects-api';

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  searchType: string;
}

export function SearchFilters({ filters, onFiltersChange, searchType }: SearchFiltersProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Fetch workspace members for author filter
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '');

  // Fetch workspace projects for project filter
  const { data: projectsResponse } = useProjects(workspaceId || '');
  const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || []);

  // Filter authors based on search query
  const filteredAuthors = workspaceMembers.filter(member => {
    const userName = member.user?.name || member.name;
    const userEmail = member.user?.email || member.email;
    return (
      userName?.toLowerCase().includes(authorSearchQuery.toLowerCase()) ||
      userEmail?.toLowerCase().includes(authorSearchQuery.toLowerCase())
    );
  });

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const removeFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-4">
      {/* Filter Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} active</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.dateRange && (
            <Badge variant="outline" className="gap-1">
              <CalendarIcon className="h-3 w-3" />
              Date: {filters.dateRange.from?.toLocaleDateString()} - {filters.dateRange.to?.toLocaleDateString()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('dateRange')}
              />
            </Badge>
          )}

          {filters.authors?.map(author => (
            <Badge key={author} variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {author}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('authors', filters.authors?.filter(a => a !== author))}
              />
            </Badge>
          ))}

          {filters.projects?.map(project => (
            <Badge key={project} variant="outline" className="gap-1">
              <FolderOpen className="h-3 w-3" />
              {project}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('projects', filters.projects?.filter(p => p !== project))}
              />
            </Badge>
          ))}

          {filters.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('tags', filters.tags?.filter(t => t !== tag))}
              />
            </Badge>
          ))}

          {filters.fileTypes?.map(fileType => (
            <Badge key={fileType} variant="outline" className="gap-1">
              <FileType className="h-3 w-3" />
              {fileType.toUpperCase()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('fileTypes', filters.fileTypes?.filter(f => f !== fileType))}
              />
            </Badge>
          ))}

          {filters.hasAttachments && (
            <Badge variant="outline" className="gap-1">
              <FileType className="h-3 w-3" />
              Has attachments
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('hasAttachments')}
              />
            </Badge>
          )}

          {filters.isShared && (
            <Badge variant="outline" className="gap-1">
              <Share className="h-3 w-3" />
              Shared
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('isShared')}
              />
            </Badge>
          )}

          {filters.isStarred && (
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3" />
              Starred
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('isStarred')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Filter Options */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filters.dateRange ? "default" : "outline"}
              size="sm"
              className="justify-start"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <h4 className="font-medium">Date Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={filters.dateRange?.from?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateFilter('dateRange', {
                      ...filters.dateRange,
                      from: e.target.value ? new Date(e.target.value) : undefined
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={filters.dateRange?.to?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateFilter('dateRange', {
                      ...filters.dateRange,
                      to: e.target.value ? new Date(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {['Today', 'Yesterday', 'Last 7 days', 'Last 30 days'].map(preset => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const now = new Date();
                      let from: Date;
                      switch (preset) {
                        case 'Today':
                          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          break;
                        case 'Yesterday':
                          from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                          break;
                        case 'Last 7 days':
                          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                          break;
                        case 'Last 30 days':
                          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                          break;
                        default:
                          from = now;
                      }
                      updateFilter('dateRange', { from, to: now });
                    }}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Authors */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filters.authors?.length ? "default" : "outline"}
              size="sm"
              className="justify-start gap-2"
            >
              <User className="h-4 w-4" />
              Author
              {filters.authors?.length && (
                <Badge variant="secondary" className="h-4 px-1 text-xs">
                  {filters.authors.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-medium">Filter by Author</h4>
              <Input
                placeholder="Search authors..."
                value={authorSearchQuery}
                onChange={(e) => setAuthorSearchQuery(e.target.value)}
              />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredAuthors.length > 0 ? (
                  filteredAuthors.map(member => {
                    const userName = member.user?.name || member.name;
                    const userEmail = member.user?.email || member.email;
                    const authorName = userName || userEmail || '';
                    return (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={member.id}
                          checked={filters.authors?.includes(authorName) || false}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFilter('authors', [...(filters.authors || []), authorName]);
                            } else {
                              updateFilter('authors', filters.authors?.filter(a => a !== authorName));
                            }
                          }}
                        />
                        <Label htmlFor={member.id} className="flex flex-col gap-0.5">
                          <span>{userName || 'Unknown'}</span>
                          {userEmail && userName && (
                            <span className="text-xs text-muted-foreground">{userEmail}</span>
                          )}
                        </Label>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {authorSearchQuery ? 'No members found' : 'No workspace members'}
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Projects */}
        {(searchType === 'all' || searchType === 'projects') && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filters.projects?.length ? "default" : "outline"}
                size="sm"
                className="justify-start gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Project
                {filters.projects?.length && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                    {filters.projects.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <h4 className="font-medium">Filter by Project</h4>
                <Input
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map(project => {
                      const projectName = project.name;
                      return (
                        <div key={project.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={project.id}
                            checked={filters.projects?.includes(projectName) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFilter('projects', [...(filters.projects || []), projectName]);
                              } else {
                                updateFilter('projects', filters.projects?.filter(p => p !== projectName));
                              }
                            }}
                          />
                          <Label htmlFor={project.id}>
                            {projectName}
                          </Label>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {projectSearchQuery ? 'No projects found' : 'No workspace projects'}
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* File Types */}
        {(searchType === 'all' || searchType === 'files') && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filters.fileTypes?.length ? "default" : "outline"}
                size="sm"
                className="justify-start gap-2"
              >
                <FileType className="h-4 w-4" />
                File Type
                {filters.fileTypes?.length && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                    {filters.fileTypes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <h4 className="font-medium">Filter by File Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'jpg', 'png', 'gif', 'mp4', 'avi', 'mp3', 'wav', 'zip', 'rar'].map(fileType => (
                    <div key={fileType} className="flex items-center space-x-2">
                      <Checkbox
                        id={fileType}
                        checked={filters.fileTypes?.includes(fileType) || false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilter('fileTypes', [...(filters.fileTypes || []), fileType]);
                          } else {
                            updateFilter('fileTypes', filters.fileTypes?.filter(f => f !== fileType));
                          }
                        }}
                      />
                      <Label htmlFor={fileType} className="text-xs uppercase">
                        {fileType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Quick Filters */}
        <Button
          variant={filters.hasAttachments ? "default" : "outline"}
          size="sm"
          className="justify-start"
          onClick={() => updateFilter('hasAttachments', !filters.hasAttachments)}
        >
          <FileType className="h-4 w-4 mr-2" />
          Has Files
        </Button>

        <Button
          variant={filters.isStarred ? "default" : "outline"}
          size="sm"
          className="justify-start"
          onClick={() => updateFilter('isStarred', !filters.isStarred)}
        >
          <Star className="h-4 w-4 mr-2" />
          Starred
        </Button>

        <Button
          variant={filters.isShared ? "default" : "outline"}
          size="sm"
          className="justify-start"
          onClick={() => updateFilter('isShared', !filters.isShared)}
        >
          <Share className="h-4 w-4 mr-2" />
          Shared
        </Button>

        {/* Recent Filter */}
        <Button
          variant={filters.dateRange?.from &&
                   filters.dateRange.from.getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000) ? "default" : "outline"}
          size="sm"
          className="justify-start"
          onClick={() => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (filters.dateRange?.from && filters.dateRange.from.getTime() > weekAgo.getTime()) {
              // If recent is already active, clear it
              removeFilter('dateRange');
            } else {
              // Set to last 7 days
              updateFilter('dateRange', { from: weekAgo, to: now });
            }
          }}
        >
          <Clock className="h-4 w-4 mr-2" />
          Recent
        </Button>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-muted-foreground"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Minimum relevance score</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Content length</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Any length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (&lt; 500 chars)</SelectItem>
                    <SelectItem value="medium">Medium (500-2000 chars)</SelectItem>
                    <SelectItem value="long">Long (&gt; 2000 chars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
