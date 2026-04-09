/**
 * useFeatureAnnouncement Hook
 * Manages feature announcement modal state and cookie tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FeatureData, FeaturesConfig, FeatureCategory } from '../types/features';
import featuresConfig from '../config/features.json';

const COOKIE_NAME = 'deskive_modal_seen';
const COOKIE_DAYS = 365; // Cookie expires in 1 year
const RECENT_DAYS_THRESHOLD = 30;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function hasSeenModal(version: string): boolean {
  const cookieValue = getCookie(COOKIE_NAME);
  return cookieValue === version;
}

function markModalAsSeen(version: string): void {
  setCookie(COOKIE_NAME, version, COOKIE_DAYS);
}

function isRecentFeature(addedDate: string): boolean {
  const featureDate = new Date(addedDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - featureDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= RECENT_DAYS_THRESHOLD;
}

export function useFeatureAnnouncement() {
  const [config] = useState<FeaturesConfig>(() => {
    const cfg = featuresConfig as FeaturesConfig;
    return {
      ...cfg,
      features: cfg?.features || [],
    };
  });
  const [unseenNewFeatures, setUnseenNewFeatures] = useState<FeatureData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  const unseenNewFeaturesRef = useRef<FeatureData[]>([]);

  useEffect(() => {
    // Check if user has already seen this version of the modal
    if (hasSeenModal(config.modalVersion)) {
      return;
    }

    const features = config?.features || [];
    const newFeatures = features.filter((feature) => feature.isNew);
    setUnseenNewFeatures(newFeatures);
    unseenNewFeaturesRef.current = newFeatures;

    if (newFeatures.length > 0) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [config?.features, config.modalVersion]);

  const closeModal = useCallback(() => {
    markModalAsSeen(config.modalVersion);
    setIsModalOpen(false);
    setCurrentFeatureIndex(0);
  }, [config.modalVersion]);

  const nextFeature = useCallback(() => {
    if (currentFeatureIndex < unseenNewFeatures.length - 1) {
      setCurrentFeatureIndex((prev) => prev + 1);
    }
  }, [currentFeatureIndex, unseenNewFeatures.length]);

  const prevFeature = useCallback(() => {
    if (currentFeatureIndex > 0) {
      setCurrentFeatureIndex((prev) => prev - 1);
    }
  }, [currentFeatureIndex]);

  const goToFeature = useCallback((index: number) => {
    if (index >= 0 && index < unseenNewFeatures.length) {
      setCurrentFeatureIndex(index);
    }
  }, [unseenNewFeatures.length]);

  const getFeaturesByCategory = useCallback(
    (category: FeatureCategory): FeatureData[] => {
      switch (category) {
        case 'recent':
          return config.features.filter((f) => isRecentFeature(f.addedDate));
        case 'popular':
          return config.features.filter((f) => f.isPopular);
        case 'featured':
          return config.features.filter((f) => f.isFeatured);
        case 'new':
          return config.features.filter((f) => f.isNew);
        default:
          return [];
      }
    },
    [config.features]
  );

  const currentFeature = unseenNewFeatures[currentFeatureIndex] || null;

  return {
    allFeatures: config.features,
    unseenNewFeatures,
    currentFeature,
    currentFeatureIndex,
    totalUnseenFeatures: unseenNewFeatures.length,
    isModalOpen,
    closeModal,
    nextFeature,
    prevFeature,
    goToFeature,
    getFeaturesByCategory,
    setIsModalOpen,
  };
}
