/**
 * File Info Content Component
 * Displays detailed file information and quick actions
 */

import React, { useState } from 'react';
import { Info, Share, Download, Star } from 'lucide-react';
import type { FileItem } from '../../types';

interface FileInfoContentProps {
  file: FileItem | null;
  onFileUpdate?: (fileId: string, updates: any) => void;
  onFileDownload?: (fileId: string, fileName: string) => void;
}

export const FileInfoContent: React.FC<FileInfoContentProps> = ({
  file,
  onFileUpdate,
  onFileDownload,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleShare = () => {
    if (file.type === 'file') {
      const shareLink = `${window.location.origin}/files/${file.id}`;
      navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownload = () => {
    if (file.type === 'file' && onFileDownload) {
      onFileDownload(file.id, file.name);
    }
  };

  const handleStar = () => {
    if (onFileUpdate) {
      onFileUpdate(file.id, { starred: !file.starred });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" />
          File Information
        </h3>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Name</span>
            <span className="text-sm text-muted-foreground">{file.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Type</span>
            <span className="text-sm text-muted-foreground">
              {file.type === 'folder' ? 'Folder' : 'File'}
            </span>
          </div>
          {file.size && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Size</span>
              <span className="text-sm text-muted-foreground">{formatFileSize(file.size)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Created</span>
            <span className="text-sm text-muted-foreground">
              {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Modified</span>
            <span className="text-sm text-muted-foreground">
              {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          {file.sharePermissions && file.sharePermissions.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Shared with</span>
              <span className="text-sm text-muted-foreground">
                {file.sharePermissions.length} people
              </span>
            </div>
          )}
          {file.shareSettings?.isPublic && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Public link</span>
              <span className="px-2 py-1 bg-secondary rounded text-xs">Public</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-start px-4 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Share className="h-4 w-4 mr-2" />
            {copySuccess ? 'Link copied!' : 'Share'}
          </button>
          <button
            onClick={handleDownload}
            disabled={file.type === 'folder'}
            className="w-full flex items-center justify-start px-4 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>
          <button
            onClick={handleStar}
            className="w-full flex items-center justify-start px-4 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Star
              className={`h-4 w-4 mr-2 ${
                file.starred ? 'fill-current text-yellow-500' : ''
              }`}
            />
            {file.starred ? 'Unstar' : 'Star'}
          </button>
        </div>
      </div>
    </div>
  );
};
