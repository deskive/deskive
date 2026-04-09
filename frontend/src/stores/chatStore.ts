import { create } from 'zustand';
import type { Channel } from '../lib/api/chat-api';

// Chat store - handles channels and conversations state
interface ChatStore {
  // Channels Data
  channels: Channel[];

  // Actions
  setChannels: (channels: Channel[]) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;

  // Get channel by ID
  getChannel: (channelId: string) => Channel | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  channels: [],

  // Actions
  setChannels: (channels) => {
    console.log('📥 [ChatStore] Setting channels:', channels.length, 'channels');
    set({ channels });
  },

  updateChannel: (channelId, updates) => {
    console.log('🔄 [ChatStore] Updating channel:', channelId, updates);
    set((state) => {
      console.log('📊 [ChatStore] Current state.channels:', state.channels.length, 'channels');
      const updatedChannels = state.channels.map(channel =>
        channel.id === channelId ? { ...channel, ...updates } : channel
      );
      console.log('✅ [ChatStore] Channels after update:', updatedChannels.length, 'channels');
      return { channels: updatedChannels };
    });
  },

  addChannel: (channel) => set((state) => ({
    channels: [...state.channels, channel]
  })),

  removeChannel: (channelId) => set((state) => ({
    channels: state.channels.filter(channel => channel.id !== channelId)
  })),

  getChannel: (channelId) => {
    return get().channels.find(channel => channel.id === channelId);
  }
}));
