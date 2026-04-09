/**
 * File Comments Modal
 * Modal dialog for viewing and managing file comments
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileCommentsPanel } from './FileCommentsPanel';

interface FileCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export function FileCommentsModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}: FileCommentsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-lg">Comments - {fileName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <FileCommentsPanel fileId={fileId} fileName={fileName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
