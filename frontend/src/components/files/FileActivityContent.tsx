/**
 * File Activity Content Component
 * Displays file activity timeline
 */

import React from 'react';
import { Activity, File as FileIcon, Clock, Share } from 'lucide-react';
import type { FileItem } from '../../types';

interface FileActivityContentProps {
  file: FileItem | null;
}

export const FileActivityContent: React.FC<FileActivityContentProps> = ({ file }) => {
  if (!file) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <FileIcon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Created</div>
              <div className="text-xs text-muted-foreground">
                {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Last modified</div>
              <div className="text-xs text-muted-foreground">
                {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>

          {file.sharePermissions && file.sharePermissions.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Share className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Shared</div>
                <div className="text-xs text-muted-foreground">
                  With {file.sharePermissions.length} people
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
