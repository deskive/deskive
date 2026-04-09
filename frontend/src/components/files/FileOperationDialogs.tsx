/**
 * File Operation Dialogs
 * Dialogs for file operations: create, rename, delete, preview, properties
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { filesService, useMarkFileAsOpened } from '@/lib/api/files-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Folder } from 'lucide-react';
import type { FileItem } from '../../types';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Rename Dialog
interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
  itemType: 'file' | 'folder';
}

export function RenameDialog({
  isOpen,
  onClose,
  onRename,
  currentName,
  itemType,
}: RenameDialogProps) {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== currentName) {
      onRename(newName.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename {itemType}</DialogTitle>
            <DialogDescription>
              Enter a new name for this {itemType}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                onFocus={(e) => {
                  const lastDotIndex = e.target.value.lastIndexOf('.');
                  if (itemType === 'file' && lastDotIndex > 0) {
                    e.target.setSelectionRange(0, lastDotIndex);
                  } else {
                    e.target.select();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newName.trim() || newName === currentName}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Dialog
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
  itemName?: string;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  itemName,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move to trash?</AlertDialogTitle>
          <AlertDialogDescription>
            {itemCount === 1 ? (
              <>Are you sure you want to move "{itemName}" to trash?</>
            ) : (
              <>Are you sure you want to move {itemCount} items to trash?</>
            )}
            {' '}You can restore items from the trash later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Move to trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Create Folder Dialog
interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  onCreate,
}: CreateFolderDialogProps) {
  const intl = useIntl();
  const [folderName, setFolderName] = useState(
    intl.formatMessage({ id: 'modules.files.dialogs.createFolder.namePlaceholder', defaultMessage: 'New folder' })
  );
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim(), description.trim() || undefined);
      onClose();
      setFolderName(intl.formatMessage({ id: 'modules.files.dialogs.createFolder.namePlaceholder', defaultMessage: 'New folder' }));
      setDescription('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({ id: 'modules.files.dialogs.createFolder.title', defaultMessage: 'Create new folder' })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'modules.files.dialogs.createFolder.description', defaultMessage: 'Enter a name and optional description for the new folder.' })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">
                {intl.formatMessage({ id: 'modules.files.dialogs.createFolder.nameLabel', defaultMessage: 'Folder name' })}
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={intl.formatMessage({ id: 'modules.files.dialogs.createFolder.namePlaceholder', defaultMessage: 'New folder' })}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="folder-description">
                {intl.formatMessage({ id: 'modules.files.dialogs.createFolder.descriptionLabel', defaultMessage: 'Description (optional)' })}
              </Label>
              <Textarea
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={intl.formatMessage({ id: 'modules.files.dialogs.createFolder.descriptionPlaceholder', defaultMessage: 'Add a description for this folder...' })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {intl.formatMessage({ id: 'modules.files.buttons.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button type="submit" disabled={!folderName.trim()}>
              {intl.formatMessage({ id: 'modules.files.buttons.create', defaultMessage: 'Create' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// File Preview Dialog
interface FilePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  isLoading?: boolean;
}

export function FilePreviewDialog({ isOpen, onClose, file, isLoading = false }: FilePreviewDialogProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const markFileAsOpenedMutation = useMarkFileAsOpened();

  // Mark file as opened when preview opens
  useEffect(() => {
    if (isOpen && file && file.type === 'file' && workspaceId) {
      // Call API mutation to mark as opened and invalidate recent files cache
      markFileAsOpenedMutation.mutate({ workspaceId, fileId: file.id });
    }
  }, [isOpen, file, workspaceId]);

  // Support both camelCase (frontend) and snake_case (API response) property names
  const mimeType = file?.mimeType || file?.mime_type;

  const isImage = mimeType?.startsWith('image/') ||
    (file?.name && /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name));

  const isVideo = mimeType?.startsWith('video/') ||
    (file?.name && /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name));

  const isAudio = mimeType?.startsWith('audio/') ||
    (file?.name && /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name));

  const isPDF = mimeType === 'application/pdf' || file?.name?.endsWith('.pdf');

  const isTextFile = mimeType?.startsWith('text/') ||
    mimeType === 'application/json' ||
    file?.name?.endsWith('.txt') ||
    file?.name?.endsWith('.json') ||
    file?.name?.endsWith('.md');

  const getFileUrl = (): string => {
    if (!file) return '';
    // Use the file URL if available
    if (file.url) {
      // Handle both string and object formats
      if (typeof file.url === 'object' && file.url !== null && 'publicUrl' in file.url) {
        return (file.url as any).publicUrl;
      }
      return file.url as string;
    }
    // Fallback to constructing URL from file ID
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    return `${baseURL}/api/v1/files/${file.id}/download`;
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p>Loading file...</p>
    </div>
  );

  const renderPreview = () => {
    if (!file) return null;

    if (isImage) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden">
          <img
            src={getFileUrl()}
            alt={file.name}
            className="max-w-full max-h-[600px] object-contain"
            onError={(e) => {
              console.error('Image failed to load:', getFileUrl());
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<p class="text-muted-foreground">Failed to load image</p>';
            }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="flex items-center justify-center w-full">
          <video
            src={getFileUrl()}
            controls
            className="max-w-full max-h-[600px] rounded-md"
            onError={(e) => {
              console.error('Video failed to load:', getFileUrl());
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="flex items-center justify-center w-full py-12">
          <audio
            src={getFileUrl()}
            controls
            className="w-full max-w-md"
            onError={(e) => {
              console.error('Audio failed to load:', getFileUrl());
            }}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="w-full h-[600px]">
          <iframe
            src={getFileUrl()}
            className="w-full h-full rounded-md border"
            title={file.name}
          />
        </div>
      );
    }

    if (isTextFile) {
      return (
        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
          <pre className="text-sm">{file.content || 'No content'}</pre>
        </ScrollArea>
      );
    }

    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <p>Preview not available for this file type</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isLoading ? 'Loading...' : (file?.name || 'File Preview')}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-200px)] overflow-auto">
          {isLoading ? renderLoading() : renderPreview()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// File Properties Dialog
interface FilePropertiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
}

export function FilePropertiesDialog({ isOpen, onClose, file }: FilePropertiesDialogProps) {
  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {file.type === 'folder' ? (
              <Folder className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Properties
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right text-muted-foreground">Name</Label>
            <div className="col-span-2 font-medium">{file.name}</div>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right text-muted-foreground">Type</Label>
            <div className="col-span-2">
              {file.type === 'folder' ? 'Folder' : file.mimeType || 'File'}
            </div>
          </div>

          {file.type === 'file' && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right text-muted-foreground">Size</Label>
              <div className="col-span-2">{formatFileSize(file.size || 0)}</div>
            </div>
          )}

          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right text-muted-foreground">Created</Label>
            <div className="col-span-2">
              {file.createdAt ? new Date(file.createdAt).toLocaleString() : 'Unknown'}
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right text-muted-foreground">Modified</Label>
            <div className="col-span-2">
              {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : 'Unknown'}
            </div>
          </div>

          {file.starred && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right text-muted-foreground">Status</Label>
              <div className="col-span-2">⭐ Starred</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
