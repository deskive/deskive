/**
 * Folder Context Menu
 * Right-click context menu for folder area
 */

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  FolderPlus,
  Upload,
  Clipboard,
  FileText,
  FileCode,
  Plus,
} from 'lucide-react';

interface FolderContextMenuProps {
  children: React.ReactNode;
  onCreateFolder?: () => void;
  onUploadFiles?: () => void;
  onPaste?: () => void;
  onCreateFile?: (type: 'text' | 'json' | 'markdown') => void;
  canPaste?: boolean;
}

export function FolderContextMenu({
  children,
  onCreateFolder,
  onUploadFiles,
  onPaste,
  onCreateFile,
  canPaste = false,
}: FolderContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={onCreateFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New folder
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="mr-2 h-4 w-4" />
            New file
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => onCreateFile?.('text')}>
              <FileText className="mr-2 h-4 w-4" />
              Text document (.txt)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCreateFile?.('json')}>
              <FileCode className="mr-2 h-4 w-4" />
              JSON file (.json)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCreateFile?.('markdown')}>
              <FileText className="mr-2 h-4 w-4" />
              Markdown file (.md)
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onUploadFiles}>
          <Upload className="mr-2 h-4 w-4" />
          Upload files
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
          <Clipboard className="mr-2 h-4 w-4" />
          Paste
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
