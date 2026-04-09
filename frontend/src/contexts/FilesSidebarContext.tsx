/**
 * Files Sidebar Context
 * Manages the state of the files right sidebar
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { FileItem, FilesSidebarContentType } from '../types';

interface FilesSidebarContextValue {
  content: FilesSidebarContentType;
  selectedFile: FileItem | null;
  setContent: (content: FilesSidebarContentType) => void;
  setSelectedFile: (file: FileItem | null) => void;
}

const FilesSidebarContext = createContext<FilesSidebarContextValue | undefined>(undefined);

export const useFilesSidebar = () => {
  const context = useContext(FilesSidebarContext);
  if (!context) {
    throw new Error('useFilesSidebar must be used within FilesSidebarProvider');
  }
  return context;
};

interface FilesSidebarProviderProps {
  children: ReactNode;
}

export const FilesSidebarProvider: React.FC<FilesSidebarProviderProps> = ({ children }) => {
  const [content, setContent] = useState<FilesSidebarContentType>('storage');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  // Memoize setters to prevent unnecessary re-renders
  const memoizedSetContent = useCallback((newContent: FilesSidebarContentType) => {
    setContent(newContent);
  }, []);

  const memoizedSetSelectedFile = useCallback((file: FileItem | null) => {
    setSelectedFile(file);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value: FilesSidebarContextValue = useMemo(() => ({
    content,
    selectedFile,
    setContent: memoizedSetContent,
    setSelectedFile: memoizedSetSelectedFile,
  }), [content, selectedFile, memoizedSetContent, memoizedSetSelectedFile]);

  return (
    <FilesSidebarContext.Provider value={value}>
      {children}
    </FilesSidebarContext.Provider>
  );
};
