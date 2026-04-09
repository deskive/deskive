/**
 * Files Filters Component
 * Advanced filter panel for files
 */

import { useState } from 'react';
import {
  Filter,
  X,
  Calendar,
  Tag,
  User,
  HardDrive,
  Image,
  Video,
  Music,
  FileText,
  File,
  Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export interface FileFilters {
  fileTypes: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  sizeRange: {
    min?: number;
    max?: number;
  };
  authors: string[];
  tags: string[];
  isFavorite?: boolean;
  hasAIAnalysis?: boolean;
  sortBy: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

interface FilesFiltersProps {
  filters: FileFilters;
  onFiltersChange: (filters: FileFilters) => void;
  availableAuthors: Array<{ id: string; name: string; imageUrl?: string }>;
  availableTags: string[];
  isOpen: boolean;
  onToggle: () => void;
}

const FILE_TYPE_OPTIONS = [
  { id: 'image', label: 'Images', icon: Image, mimetypes: ['image/'] },
  { id: 'video', label: 'Videos', icon: Video, mimetypes: ['video/'] },
  { id: 'audio', label: 'Audio', icon: Music, mimetypes: ['audio/'] },
  { id: 'document', label: 'Documents', icon: FileText, mimetypes: ['application/pdf', 'application/msword', 'application/vnd.openxml'] },
  { id: 'text', label: 'Text Files', icon: File, mimetypes: ['text/'] },
];

const SIZE_PRESETS = [
  { label: 'Small (< 1MB)', min: 0, max: 1024 * 1024 },
  { label: 'Medium (1-10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: 'Large (10-100MB)', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { label: 'Very Large (> 100MB)', min: 100 * 1024 * 1024, max: undefined },
];

const DATE_PRESETS = [
  { label: 'Today', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export function FilesFilters({
  filters,
  onFiltersChange,
  availableAuthors,
  availableTags,
  isOpen,
  onToggle,
}: FilesFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FileFilters>(filters);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customSizeRange, setCustomSizeRange] = useState(false);

  const updateFilters = (newFilters: Partial<FileFilters>) => {
    const updated = { ...localFilters, ...newFilters };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const toggleFileType = (typeId: string) => {
    const newTypes = localFilters.fileTypes.includes(typeId)
      ? localFilters.fileTypes.filter(t => t !== typeId)
      : [...localFilters.fileTypes, typeId];
    updateFilters({ fileTypes: newTypes });
  };

  const toggleAuthor = (authorId: string) => {
    const newAuthors = localFilters.authors.includes(authorId)
      ? localFilters.authors.filter(a => a !== authorId)
      : [...localFilters.authors, authorId];
    updateFilters({ authors: newAuthors });
  };

  const toggleTag = (tag: string) => {
    const newTags = localFilters.tags.includes(tag)
      ? localFilters.tags.filter(t => t !== tag)
      : [...localFilters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const setDatePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    updateFilters({ dateRange: { from, to } });
    setShowDatePicker(false);
  };

  const setSizePreset = (preset: typeof SIZE_PRESETS[0]) => {
    updateFilters({
      sizeRange: {
        min: preset.min,
        max: preset.max
      }
    });
    setCustomSizeRange(false);
  };

  const clearAllFilters = () => {
    const clearedFilters: FileFilters = {
      fileTypes: [],
      dateRange: {},
      sizeRange: {},
      authors: [],
      tags: [],
      isFavorite: undefined,
      hasAIAnalysis: undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.fileTypes.length > 0) count++;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.sizeRange.min !== undefined || localFilters.sizeRange.max !== undefined) count++;
    if (localFilters.authors.length > 0) count++;
    if (localFilters.tags.length > 0) count++;
    if (localFilters.isFavorite !== undefined) count++;
    if (localFilters.hasAIAnalysis !== undefined) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={onToggle}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="w-full max-h-[80vh] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 overflow-y-auto flex-1">
        {/* File Types */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <File className="h-4 w-4" />
            File Types
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {FILE_TYPE_OPTIONS.map((type) => {
              const IconComponent = type.icon;
              const isSelected = localFilters.fileTypes.includes(type.id);
              return (
                <div
                  key={type.id}
                  className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleFileType(type.id)}
                >
                  <Checkbox checked={isSelected} />
                  <IconComponent className="h-4 w-4" />
                  <span className="text-sm">{type.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setDatePreset(preset.days)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Custom Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{
                    from: localFilters.dateRange.from,
                    to: localFilters.dateRange.to,
                  }}
                  onSelect={(range: any) => {
                    updateFilters({
                      dateRange: {
                        from: range?.from,
                        to: range?.to
                      }
                    });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {(localFilters.dateRange.from || localFilters.dateRange.to) && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {localFilters.dateRange.from?.toLocaleDateString()} - {localFilters.dateRange.to?.toLocaleDateString()}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilters({ dateRange: {} })}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* File Size */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            File Size
          </Label>
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {SIZE_PRESETS.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setSizePreset(preset)}
                  className="text-xs justify-start"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomSizeRange(true)}
              className="w-full text-xs"
            >
              Custom Size Range
            </Button>
            {customSizeRange && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Min Size</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="text-xs"
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) * 1024 * 1024 : undefined;
                      updateFilters({
                        sizeRange: { ...localFilters.sizeRange, min: value }
                      });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Size</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    className="text-xs"
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) * 1024 * 1024 : undefined;
                      updateFilters({
                        sizeRange: { ...localFilters.sizeRange, max: value }
                      });
                    }}
                  />
                </div>
              </div>
            )}
            {(localFilters.sizeRange.min !== undefined || localFilters.sizeRange.max !== undefined) && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {localFilters.sizeRange.min ? formatFileSize(localFilters.sizeRange.min) : '0'} - {' '}
                  {localFilters.sizeRange.max ? formatFileSize(localFilters.sizeRange.max) : '∞'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilters({ sizeRange: {} })}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Authors */}
        {availableAuthors.length > 0 && (
          <>
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Authors
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableAuthors.map((author) => {
                  const isSelected = localFilters.authors.includes(author.id);
                  return (
                    <div
                      key={author.id}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => toggleAuthor(author.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <span className="text-sm">{author.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Tags */}
        {availableTags.length > 0 && (
          <>
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {availableTags.map((tag) => {
                  const isSelected = localFilters.tags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Special Filters */}
        <div className="space-y-3">
          <Label>Special Filters</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="favorites"
                checked={localFilters.isFavorite === true}
                onCheckedChange={(checked) =>
                  updateFilters({ isFavorite: checked ? true : undefined })
                }
              />
              <Label htmlFor="favorites" className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                Favorites only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ai-analysis"
                checked={localFilters.hasAIAnalysis === true}
                onCheckedChange={(checked) =>
                  updateFilters({ hasAIAnalysis: checked ? true : undefined })
                }
              />
              <Label htmlFor="ai-analysis" className="text-sm">
                Has AI Analysis
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Sort Options */}
        <div className="space-y-3">
          <Label>Sort By</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={localFilters.sortBy}
              onValueChange={(value: any) => updateFilters({ sortBy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="updatedAt">Modified Date</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={localFilters.sortOrder}
              onValueChange={(value: any) => updateFilters({ sortOrder: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
