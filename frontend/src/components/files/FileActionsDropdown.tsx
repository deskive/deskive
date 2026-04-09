/**
 * File Actions Dropdown
 * Context menu for file/folder operations
 */

import React from 'react';
import { useIntl } from 'react-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import {
  MoreVertical,
  Download,
  Trash2,
  Edit2,
  Copy,
  Scissors,
  Clipboard,
  Star,
  Share2,
  Info,
  FolderOpen,
  FileText,
  RotateCcw,
  Upload,
  MessageSquare,
  CloudOff,
} from 'lucide-react';

interface FileActionsDropdownProps {
  fileId: string;
  fileType: 'file' | 'folder';
  fileName: string;
  isStarred?: boolean;
  isShared?: boolean;
  isOffline?: boolean;
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onToggleStar?: () => void;
  onRestore?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onInfo?: () => void;
  onComments?: () => void;
  onExportToDrive?: () => void;
  onExportToDropbox?: () => void;
  onToggleOffline?: () => void;
  canPaste?: boolean;
  isTrashView?: boolean;
  isSearchView?: boolean;
  isSharedWithMeView?: boolean;
  allowCutCopyPaste?: boolean;
  isGoogleDriveConnected?: boolean;
  isDropboxConnected?: boolean;
}

export function FileActionsDropdown({
  fileId,
  fileType,
  fileName,
  isStarred = false,
  isShared = false,
  isOffline = false,
  onOpen,
  onRename,
  onDelete,
  onCut,
  onCopy,
  onPaste,
  onToggleStar,
  onRestore,
  onShare,
  onDownload,
  onInfo,
  onComments,
  onExportToDrive,
  onExportToDropbox,
  onToggleOffline,
  canPaste = false,
  isTrashView = false,
  isSearchView = false,
  isSharedWithMeView = false,
  allowCutCopyPaste = true,
  isGoogleDriveConnected = false,
  isDropboxConnected = false,
}: FileActionsDropdownProps) {
  const intl = useIntl();

  const handleAction = (action: (() => void) | undefined) => {
    return () => {
      if (action) {
        action();
      }
    };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Shared With Me View - only show Preview, Download, Comments, and Properties */}
        {isSharedWithMeView && (
          <>
            {fileType === 'file' && (
              <>
                <DropdownMenuItem onSelect={handleAction(onOpen)}>
                  <FileText className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.preview' })}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAction(onDownload)}>
                  <Download className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.download' })}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAction(onComments)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.comments', defaultMessage: 'Comments' })}
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuItem onSelect={handleAction(onInfo)}>
              <Info className="mr-2 h-4 w-4" />
              {intl.formatMessage({ id: 'modules.files.contextMenu.properties' })}
            </DropdownMenuItem>
          </>
        )}

        {/* Regular views (not shared with me) */}
        {!isSharedWithMeView && (
          <>
            {/* Restore button - only show in trash view */}
            {isTrashView && onRestore && (
              <>
                <DropdownMenuItem onSelect={handleAction(onRestore)} className="text-green-600 font-medium">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.restore' })}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {fileType === 'folder' && !isTrashView && (
              <>
                <DropdownMenuItem onSelect={handleAction(onOpen)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.open' })}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {fileType === 'file' && !isTrashView && (
              <>
                <DropdownMenuItem onSelect={handleAction(onOpen)}>
                  <FileText className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.preview' })}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAction(onDownload)}>
                  <Download className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.download' })}
                </DropdownMenuItem>
                {onToggleOffline && (
                  <DropdownMenuItem onSelect={handleAction(onToggleOffline)}>
                    <CloudOff className={`mr-2 h-4 w-4 ${isOffline ? 'text-primary' : ''}`} />
                    {isOffline
                      ? intl.formatMessage({ id: 'modules.files.contextMenu.removeOffline', defaultMessage: 'Remove from offline' })
                      : intl.formatMessage({ id: 'modules.files.contextMenu.makeOffline', defaultMessage: 'Make available offline' })}
                  </DropdownMenuItem>
                )}
                {isGoogleDriveConnected && onExportToDrive && (
                  <DropdownMenuItem onSelect={handleAction(onExportToDrive)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {intl.formatMessage({ id: 'modules.files.contextMenu.exportToDrive', defaultMessage: 'Export to Google Drive' })}
                  </DropdownMenuItem>
                )}
                {isDropboxConnected && onExportToDropbox && (
                  <DropdownMenuItem onSelect={handleAction(onExportToDropbox)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {intl.formatMessage({ id: 'modules.files.contextMenu.exportToDropbox', defaultMessage: 'Export to Dropbox' })}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}

            {!isTrashView && (
              <>
                {/* Hide Cut, Copy, Paste in special views (search, recent, starred, etc.) */}
                {allowCutCopyPaste && (
                  <>
                    <DropdownMenuItem onSelect={handleAction(onCut)}>
                      <Scissors className="mr-2 h-4 w-4" />
                      {intl.formatMessage({ id: 'modules.files.contextMenu.cut' })}
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={handleAction(onCopy)}>
                      <Copy className="mr-2 h-4 w-4" />
                      {intl.formatMessage({ id: 'modules.files.contextMenu.copy' })}
                    </DropdownMenuItem>

                    {fileType === 'folder' && (
                      <DropdownMenuItem onSelect={handleAction(onPaste)} disabled={!canPaste}>
                        <Clipboard className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'modules.files.contextMenu.paste' })}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onSelect={handleAction(onRename)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.rename' })}
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={handleAction(onToggleStar)}>
                  <Star className={`mr-2 h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
                  {isStarred ? intl.formatMessage({ id: 'modules.files.contextMenu.unstar' }) : intl.formatMessage({ id: 'modules.files.contextMenu.star' })}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Only show share option for files, not folders */}
                {fileType === 'file' && (
                  <DropdownMenuItem onSelect={handleAction(onShare)}>
                    <Share2 className={`mr-2 h-4 w-4 ${isShared ? 'text-blue-500' : ''}`} />
                    {isShared ? intl.formatMessage({ id: 'modules.files.contextMenu.manageSharing' }) : intl.formatMessage({ id: 'modules.files.contextMenu.share' })}
                  </DropdownMenuItem>
                )}

                {/* Comments - only for files */}
                {fileType === 'file' && (
                  <DropdownMenuItem onSelect={handleAction(onComments)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {intl.formatMessage({ id: 'modules.files.contextMenu.comments', defaultMessage: 'Comments' })}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onSelect={handleAction(onInfo)}>
                  <Info className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.properties' })}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={handleAction(onDelete)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.moveToTrash' })}
                </DropdownMenuItem>
              </>
            )}

            {isTrashView && (
              <>
                <DropdownMenuItem onSelect={handleAction(onInfo)}>
                  <Info className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.properties' })}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={handleAction(onDelete)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.files.contextMenu.deletePermanently' })}
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
