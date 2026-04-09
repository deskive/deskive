/**
 * Search Utility Functions
 * Helper functions for search operations
 */

/**
 * Highlight search terms in text
 */
export function highlightText(text: string, highlights: string[]): string {
  if (!highlights?.length) return text;

  let highlightedText = text;
  highlights.forEach(highlight => {
    const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
    );
  });

  return highlightedText;
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate relevance score based on query and content
 */
export function calculateRelevance(query: string, content: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();

  // Exact match = high score
  if (contentLower === queryLower) return 1.0;

  // Contains exact query = medium-high score
  if (contentLower.includes(queryLower)) return 0.8;

  // Word-by-word matching
  const queryWords = queryLower.split(/\s+/);
  const contentWords = contentLower.split(/\s+/);

  const matchingWords = queryWords.filter(qw =>
    contentWords.some(cw => cw.includes(qw) || qw.includes(cw))
  );

  return matchingWords.length / queryWords.length * 0.6;
}

/**
 * Sort results by relevance score
 */
export function sortByRelevance<T extends { relevanceScore?: number }>(results: T[]): T[] {
  return [...results].sort((a, b) =>
    (b.relevanceScore || 0) - (a.relevanceScore || 0)
  );
}

/**
 * Sort results by date (newest first)
 */
export function sortByDate<T extends { updatedAt: string | Date }>(results: T[]): T[] {
  return [...results].sort((a, b) => {
    const dateA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt) : a.updatedAt;
    const dateB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt;
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Group results by type
 */
export function groupByType<T extends { type: string }>(results: T[]): Record<string, T[]> {
  return results.reduce((acc, result) => {
    const type = result.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract search query from various input formats
 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .toLowerCase();
}

/**
 * Check if filters are active
 */
export function hasActiveFilters(filters: Record<string, any>): boolean {
  return Object.keys(filters).length > 0 &&
    Object.values(filters).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => v !== undefined && v !== null);
      }
      return value !== undefined && value !== null && value !== '';
    });
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get file type category from extension
 */
export function getFileTypeCategory(extension: string): string {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv'];
  const presentationExts = ['ppt', 'pptx'];
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'css', 'html'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

  if (imageExts.includes(extension)) return 'image';
  if (videoExts.includes(extension)) return 'video';
  if (audioExts.includes(extension)) return 'audio';
  if (documentExts.includes(extension)) return 'document';
  if (spreadsheetExts.includes(extension)) return 'spreadsheet';
  if (presentationExts.includes(extension)) return 'presentation';
  if (codeExts.includes(extension)) return 'code';
  if (archiveExts.includes(extension)) return 'archive';

  return 'other';
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get icon name for file type
 */
export function getFileIcon(fileType: string): string {
  const category = getFileTypeCategory(fileType);

  const icons: Record<string, string> = {
    image: 'Image',
    video: 'Video',
    audio: 'Music',
    document: 'FileText',
    spreadsheet: 'Sheet',
    presentation: 'Presentation',
    code: 'Code',
    archive: 'Archive',
    other: 'File',
  };

  return icons[category] || 'File';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse filter query string
 */
export function parseFilterQuery(filterString: string): Record<string, any> {
  const filters: Record<string, any> = {};

  // Match patterns like "type:pdf", "author:john", "tag:important"
  const matches = filterString.matchAll(/(\w+):(\S+)/g);

  for (const match of matches) {
    const [, key, value] = match;
    if (!filters[key]) {
      filters[key] = [];
    }
    filters[key].push(value);
  }

  return filters;
}

/**
 * Format search results count
 */
export function formatResultsCount(count: number): string {
  if (count === 0) return 'No results';
  if (count === 1) return '1 result';
  if (count < 1000) return `${count} results`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K results`;
  return `${(count / 1000000).toFixed(1)}M results`;
}

/**
 * Check if query is likely a command
 */
export function isCommand(query: string): boolean {
  return query.startsWith('/') || query.startsWith('@');
}

/**
 * Extract mentions from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  return hashtags;
}

/**
 * Format date to relative time (e.g., "2 minutes ago", "3 hours ago")
 */
export function formatRelativeTime(date: string | Date | undefined): string {
  if (!date) {
    return 'Unknown';
  }

  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;

  // Check if targetDate is valid
  if (isNaN(targetDate.getTime())) {
    return 'Unknown';
  }

  const seconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}
