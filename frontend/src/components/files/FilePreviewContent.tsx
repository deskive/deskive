/**
 * File Preview Content Component
 * Displays file preview based on file type
 */

import React from 'react';
import { Eye, File } from 'lucide-react';
import type { FileItem } from '../../types';

interface FilePreviewContentProps {
  file: FileItem | null;
}

export const FilePreviewContent: React.FC<FilePreviewContentProps> = ({ file }) => {
  if (!file) return null;

  const renderPreview = () => {
    if (file.type === 'file' && file.mimeType?.startsWith('text/') && file.content) {
      return (
        <div className="w-full">
          <pre className="text-sm text-foreground whitespace-pre-wrap">{file.content}</pre>
        </div>
      );
    }

    if (file.type === 'file' && file.mimeType?.startsWith('image/')) {
      // Handle both string and object URL formats
      let imageUrl: string | undefined;
      if (typeof file.url === 'object' && file.url !== null && 'publicUrl' in file.url) {
        imageUrl = (file.url as any).publicUrl;
      } else {
        imageUrl = file.url as string | undefined;
      }

      return (
        <div className="text-center">
          {imageUrl ? (
            <img
              src={imageUrl as string}
              alt={file.name}
              className="max-w-full h-auto rounded-lg"
            />
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">IMG</span>
              </div>
              <p className="text-sm text-muted-foreground">Image preview</p>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="text-center">
        <File className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {file.type === 'folder' ? 'Folder' : 'File'} preview not available
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview
        </h3>

        <div className="bg-muted/50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};
