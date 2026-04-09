/**
 * Storage Stats Hook
 * Calculates storage statistics from files
 */

import { useMemo } from 'react';
import type { FileItem } from '../../types';

interface StorageStats {
  totalSize: number;
  maxStorage: number;
  usagePercentage: number;
  availableSpace: number;
  totalFiles: number;
  fileTypeCounts: {
    documents: number;
    images: number;
    spreadsheets: number;
    videos: number;
    audio: number;
    pdfs: number;
  };
}

export function useStorageStats(files: FileItem[] = []): StorageStats {
  return useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const maxStorage = 10 * 1024 * 1024 * 1024; // 10 GB default
    const usagePercentage = Math.min((totalSize / maxStorage) * 100, 100);
    const availableSpace = Math.max(maxStorage - totalSize, 0);
    const totalFiles = files.length;

    // Count files by type
    const fileTypeCounts = files.reduce(
      (counts, file) => {
        const mimeType = file.mimeType || '';

        if (mimeType.includes('pdf')) {
          counts.pdfs++;
        } else if (mimeType.startsWith('image/')) {
          counts.images++;
        } else if (mimeType.startsWith('video/')) {
          counts.videos++;
        } else if (mimeType.startsWith('audio/')) {
          counts.audio++;
        } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
          counts.spreadsheets++;
        } else if (
          mimeType.includes('document') ||
          mimeType.includes('msword') ||
          mimeType.includes('text/')
        ) {
          counts.documents++;
        }

        return counts;
      },
      {
        documents: 0,
        images: 0,
        spreadsheets: 0,
        videos: 0,
        audio: 0,
        pdfs: 0,
      }
    );

    return {
      totalSize,
      maxStorage,
      usagePercentage,
      availableSpace,
      totalFiles,
      fileTypeCounts,
    };
  }, [files]);
}
