/**
 * Feature Announcement Types
 * Types for the feature announcement modal system
 */

export interface FeatureData {
  id: string;
  title: string;
  description: string;
  videoSrc?: string;
  thumbnailSrc?: string;
  isNew: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  addedDate: string;
  version: string;
}

export interface FeaturesConfig {
  features: FeatureData[];
  modalVersion: string;
}

export interface SeenFeaturesRecord {
  seenFeatures: string[];
  lastSeenVersion: string;
  lastChecked: string;
}

export type FeatureCategory = 'recent' | 'popular' | 'featured' | 'new';
