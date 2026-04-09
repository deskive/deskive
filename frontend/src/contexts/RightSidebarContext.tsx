import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ChatData {
  messages: any[];
  hasSelectedChat: boolean;
  channelName?: string;
  channelDescription?: string;
  isPrivate?: boolean;
  memberCount?: number;
  chatType?: 'channel' | 'conversation';
  channelId?: string;
}

interface RightSidebarContextType {
  isMinimized: boolean;
  toggleMinimized: () => void;
  chatData: ChatData;
  setChatData: (data: ChatData) => void;
}

const RightSidebarContext = createContext<RightSidebarContextType | undefined>(undefined);

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatData, setChatDataInternal] = useState<ChatData>({
    messages: [],
    hasSelectedChat: false,
  });

  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const setChatData = useCallback((data: ChatData) => {
    setChatDataInternal(data);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isMinimized,
    toggleMinimized,
    chatData,
    setChatData
  }), [isMinimized, toggleMinimized, chatData, setChatData]);

  return (
    <RightSidebarContext.Provider value={contextValue}>
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebar must be used within RightSidebarProvider');
  }
  return context;
}
