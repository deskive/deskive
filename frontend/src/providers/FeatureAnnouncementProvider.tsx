/**
 * FeatureAnnouncementProvider
 * Provides feature announcement context and renders the modal
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useFeatureAnnouncement } from '../hooks/useFeatureAnnouncement';
import { FeatureAnnouncementModal } from '../components/modals/FeatureAnnouncementModal';
import type { FeatureData, FeatureCategory } from '../types/features';

interface FeatureAnnouncementContextValue {
  allFeatures: FeatureData[];
  unseenNewFeatures: FeatureData[];
  getFeaturesByCategory: (category: FeatureCategory) => FeatureData[];
  showModal: () => void;
}

const FeatureAnnouncementContext = createContext<FeatureAnnouncementContextValue | null>(null);

export function useFeatureAnnouncementContext() {
  const context = useContext(FeatureAnnouncementContext);
  if (!context) {
    throw new Error(
      'useFeatureAnnouncementContext must be used within a FeatureAnnouncementProvider'
    );
  }
  return context;
}

interface FeatureAnnouncementProviderProps {
  children: ReactNode;
}

export function FeatureAnnouncementProvider({ children }: FeatureAnnouncementProviderProps) {
  const {
    allFeatures,
    unseenNewFeatures,
    currentFeature,
    currentFeatureIndex,
    totalUnseenFeatures,
    isModalOpen,
    closeModal,
    nextFeature,
    prevFeature,
    goToFeature,
    getFeaturesByCategory,
    setIsModalOpen,
  } = useFeatureAnnouncement();

  const showModal = () => {
    if (unseenNewFeatures.length > 0) {
      setIsModalOpen(true);
    }
  };

  const contextValue: FeatureAnnouncementContextValue = {
    allFeatures,
    unseenNewFeatures,
    getFeaturesByCategory,
    showModal,
  };

  return (
    <FeatureAnnouncementContext.Provider value={contextValue}>
      {children}
      <FeatureAnnouncementModal
        isOpen={isModalOpen}
        onClose={closeModal}
        currentFeature={currentFeature}
        currentIndex={currentFeatureIndex}
        totalFeatures={totalUnseenFeatures}
        onNext={nextFeature}
        onPrev={prevFeature}
        onGoTo={goToFeature}
      />
    </FeatureAnnouncementContext.Provider>
  );
}
