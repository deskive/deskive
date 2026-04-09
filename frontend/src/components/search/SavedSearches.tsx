import { useState } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Share2,
  Bell,
  Copy,
  MoreHorizontal,
  Plus,
  X,
  Tag,
  FolderOpen,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog';
import type { SavedSearch } from '../../types/search';
import { cn, formatRelativeTime } from '../../lib/utils';
import { toast } from 'sonner';

interface SavedSearchesProps {
  savedSearches: SavedSearch[];
  onSelect: (search: SavedSearch) => void;
  onClose: () => void;
}

export function SavedSearches({ savedSearches, onSelect, onClose }: SavedSearchesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Placeholder functions for API operations (to be connected to backend later)
  const updateSavedSearch = async (id: string, updates: Partial<SavedSearch>) => {
    // TODO: Connect to backend API
    console.log('Update saved search:', id, updates);
    return Promise.resolve();
  };

  const deleteSavedSearch = async (id: string) => {
    // TODO: Connect to backend API
    console.log('Delete saved search:', id);
    return Promise.resolve();
  };

  const shareSavedSearch = async (id: string, userIds: string[]) => {
    // TODO: Connect to backend API
    console.log('Share saved search:', id, userIds);
    return Promise.resolve();
  };

  const filteredSearches = savedSearches.filter(search =>
    search.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    search.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
    search.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (search: SavedSearch) => {
    setEditingSearch(search);
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingSearch) return;

    try {
      await updateSavedSearch(editingSearch.id, {
        name: editingSearch.name,
        tags: editingSearch.tags,
        isNotificationEnabled: editingSearch.isNotificationEnabled,
      });
      setIsEditDialogOpen(false);
      setEditingSearch(null);
      toast.success('Search updated successfully');
    } catch (error) {
      toast.error('Failed to update search');
    }
  };

  const handleDelete = async (searchId: string) => {
    try {
      await deleteSavedSearch(searchId);
      toast.success('Search deleted successfully');
    } catch (error) {
      toast.error('Failed to delete search');
    }
  };

  const handleShare = async (search: SavedSearch) => {
    try {
      // TODO: Implement user selection for sharing
      await shareSavedSearch(search.id, []);
      toast.success('Search shared successfully');
    } catch (error) {
      toast.error('Failed to share search');
    }
  };

  const handleCopy = (search: SavedSearch) => {
    const searchUrl = `${window.location.origin}/search?q=${encodeURIComponent(search.query)}&type=${search.type}&mode=${search.mode}`;
    navigator.clipboard.writeText(searchUrl);
    toast.success('Search URL copied to clipboard');
  };

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'files':
        return FolderOpen;
      case 'calendar':
        return Calendar;
      default:
        return Search;
    }
  };

  const getSearchModeColor = (mode: string) => {
    switch (mode) {
      case 'semantic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'full-text':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'hybrid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Saved Searches</h1>
            <p className="text-muted-foreground">
              Manage and organize your saved search queries
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved searches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Saved Searches Grid */}
        {filteredSearches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {savedSearches.length === 0 ? 'No saved searches yet' : 'No matching searches'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {savedSearches.length === 0
                ? 'Save your frequent searches to access them quickly later'
                : 'Try a different search term or clear the filter'
              }
            </p>
            {savedSearches.length === 0 && (
              <Button onClick={onClose}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first saved search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSearches.map((search) => {
              const TypeIcon = getSearchTypeIcon(search.type);

              return (
                <Card key={search.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">{search.name}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            "{search.query}"
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelect(search)}>
                            <Search className="h-4 w-4 mr-2" />
                            Run Search
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(search)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(search)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(search)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete saved search?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The saved search "{search.name}" will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(search.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Search details */}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {search.type}
                        </Badge>
                        <Badge className={cn("text-xs", getSearchModeColor(search.mode))}>
                          {search.mode}
                        </Badge>
                        {search.isNotificationEnabled && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-2 w-2 mr-1" />
                            Alerts
                          </Badge>
                        )}
                      </div>

                      {/* Tags */}
                      {search.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {search.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {search.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{search.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatRelativeTime(search.updatedAt)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => onSelect(search)}
                        >
                          Run Search
                        </Button>
                      </div>

                      {/* Shared indicator */}
                      {search.sharedWith && search.sharedWith.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Share2 className="h-3 w-3" />
                          <span>Shared with {search.sharedWith.length} {search.sharedWith.length === 1 ? 'person' : 'people'}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Saved Search</DialogTitle>
              <DialogDescription>
                Update the name, tags, and notification settings for this saved search.
              </DialogDescription>
            </DialogHeader>

            {editingSearch && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search-name">Search Name</Label>
                  <Input
                    id="search-name"
                    value={editingSearch.name}
                    onChange={(e) => setEditingSearch({
                      ...editingSearch,
                      name: e.target.value
                    })}
                    placeholder="Enter search name..."
                  />
                </div>

                <div>
                  <Label htmlFor="search-query">Query (read-only)</Label>
                  <Input
                    id="search-query"
                    value={editingSearch.query}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="search-tags">Tags (comma-separated)</Label>
                  <Input
                    id="search-tags"
                    value={editingSearch.tags.join(', ')}
                    onChange={(e) => setEditingSearch({
                      ...editingSearch,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                    placeholder="project, important, daily..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notifications"
                    checked={editingSearch.isNotificationEnabled}
                    onCheckedChange={(checked) => setEditingSearch({
                      ...editingSearch,
                      isNotificationEnabled: checked
                    })}
                  />
                  <Label htmlFor="notifications">Enable notifications for new matching content</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
