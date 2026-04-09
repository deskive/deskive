/**
 * Files Right Sidebar Wrapper
 * Wrapper component that provides files context to the sidebar
 */

import React from 'react';
import { FilesRightSidebar } from './FilesRightSidebar';
import { FilesSidebarProvider } from '../../contexts/FilesSidebarContext';

export const FilesRightSidebarWrapper: React.FC = () => {
  // Mock handlers for the sidebar - these will be replaced with actual implementations
  // when the files page passes real data through context
  const handleFileUpdate = (fileId: string, updates: any) => {
    console.log('File update:', fileId, updates);
  };

  const handleFileDownload = (fileId: string, fileName: string) => {
    console.log('File download:', fileId, fileName);
  };

  const handleFileDelete = (fileId: string) => {
    console.log('File delete:', fileId);
  };

  const handleCreateFolder = (name: string) => {
    console.log('Create folder:', name);
  };

  const handleUploadFiles = () => {
    console.log('Upload files');
    window.dispatchEvent(new CustomEvent('openFileUpload'));
  };

  return (
    <FilesSidebarProvider>
      <FilesRightSidebar
        files={[]}
        onFileUpdate={handleFileUpdate}
        onFileDownload={handleFileDownload}
        onFileDelete={handleFileDelete}
        onCreateFolder={handleCreateFolder}
        onUploadFiles={handleUploadFiles}
      />
    </FilesSidebarProvider>
  );
};
