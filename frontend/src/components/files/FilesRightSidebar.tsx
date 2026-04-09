/**
 * Files Right Sidebar
 * Displays storage stats, file info, preview, activity, and comments
 */

import React from 'react';
import { Cloud, Info, Eye, Activity, MessageSquare } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useFilesSidebar } from '../../contexts/FilesSidebarContext';
import { FileInfoContent } from './FileInfoContent';
import { FilePreviewContent } from './FilePreviewContent';
import { FileActivityContent } from './FileActivityContent';
import { StorageContent } from './StorageContent';
import { FileCommentsPanel } from './FileCommentsPanel';

interface FilesRightSidebarProps {
  files: any[];
  onFileUpdate?: (fileId: string, updates: any) => void;
  onFileDownload?: (fileId: string, fileName: string) => void;
  onFileDelete?: (fileId: string) => void;
  onCreateFolder?: (name: string) => void;
  onUploadFiles?: () => void;
}

export const FilesRightSidebar: React.FC<FilesRightSidebarProps> = ({
  files,
  onFileUpdate,
  onFileDownload,
  onFileDelete,
  onCreateFolder,
  onUploadFiles,
}) => {
  const { content, selectedFile, setContent } = useFilesSidebar();
  const intl = useIntl();

  const renderContent = () => {
    switch (content) {
      case 'info':
        return (
          <FileInfoContent
            file={selectedFile}
            onFileUpdate={onFileUpdate}
            onFileDownload={onFileDownload}
          />
        );
      case 'preview':
        return <FilePreviewContent file={selectedFile} />;
      case 'activity':
        return <FileActivityContent file={selectedFile} />;
      case 'comments':
        return selectedFile ? (
          <FileCommentsPanel fileId={selectedFile.id} fileName={selectedFile.name} />
        ) : null;
      case 'storage':
      default:
        return (
          <StorageContent
            files={files}
            onCreateFolder={onCreateFolder}
            onUploadFiles={onUploadFiles}
          />
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setContent('storage')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
              content === 'storage'
                ? 'gradient-primary-active'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Cloud className="h-3 w-3" />
            <span>{intl.formatMessage({ id: 'modules.files.sidebar.storage', defaultMessage: 'Storage' })}</span>
          </button>
          {selectedFile && (
            <>
              <button
                onClick={() => setContent('info')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  content === 'info'
                    ? 'gradient-primary-active'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Info className="h-3 w-3" />
                <span>{intl.formatMessage({ id: 'modules.files.sidebar.info', defaultMessage: 'Info' })}</span>
              </button>
              <button
                onClick={() => setContent('preview')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  content === 'preview'
                    ? 'gradient-primary-active'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>{intl.formatMessage({ id: 'modules.files.sidebar.preview', defaultMessage: 'Preview' })}</span>
              </button>
              <button
                onClick={() => setContent('activity')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  content === 'activity'
                    ? 'gradient-primary-active'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>{intl.formatMessage({ id: 'modules.files.sidebar.activity', defaultMessage: 'Activity' })}</span>
              </button>
              <button
                onClick={() => setContent('comments')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  content === 'comments'
                    ? 'gradient-primary-active'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                <span>{intl.formatMessage({ id: 'modules.files.sidebar.comments', defaultMessage: 'Comments' })}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};
