/**
 * Video Settings Store - User preferences and device settings
 * Clean modular store for video call settings
 */

import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { VideoDeviceSettings, MediaDevices } from '@/types/video'

interface VideoSettingsStore {
  // Settings
  callSettings: VideoDeviceSettings
  
  // Available devices
  availableDevices: MediaDevices
  
  // Selected devices
  selectedCamera: string | null
  selectedMicrophone: string | null
  selectedSpeaker: string | null
  
  // Video preferences
  defaultVideoEnabled: boolean
  defaultAudioEnabled: boolean
  autoJoinWithVideo: boolean
  autoJoinWithAudio: boolean
  
  // Quality settings
  videoQuality: 'low' | 'medium' | 'high'
  audioQuality: 'low' | 'medium' | 'high'
  
  // Advanced settings
  enableNoiseCancellation: boolean
  enableEchoCancellation: boolean
  enableAutoGainControl: boolean
  
  // UI preferences
  defaultLayout: 'gallery' | 'speaker' | 'sidebar'
  enableChatSounds: boolean
  enableJoinLeaveSounds: boolean
  enableKeyboardShortcuts: boolean
  
  // Accessibility
  enableCaptions: boolean
  captionLanguage: string
  highContrastMode: boolean
  
  // Bandwidth settings
  adaptiveQuality: boolean
  maxBandwidth: number
  
  // Privacy settings
  blurBackground: boolean
  backgroundImage: string | null
  
  // Actions
  updateCallSettings: (settings: Partial<VideoDeviceSettings>) => void
  updateDevices: (devices: MediaDevices) => void
  setSelectedCamera: (deviceId: string | null) => void
  setSelectedMicrophone: (deviceId: string | null) => void
  setSelectedSpeaker: (deviceId: string | null) => void
  setVideoQuality: (quality: 'low' | 'medium' | 'high') => void
  setAudioQuality: (quality: 'low' | 'medium' | 'high') => void
  setDefaultLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => void
  toggleNoiseCancellation: () => void
  toggleEchoCancellation: () => void
  toggleAutoGainControl: () => void
  toggleChatSounds: () => void
  toggleJoinLeaveSounds: () => void
  toggleKeyboardShortcuts: () => void
  toggleCaptions: () => void
  setCaptionLanguage: (language: string) => void
  toggleHighContrastMode: () => void
  toggleAdaptiveQuality: () => void
  setMaxBandwidth: (bandwidth: number) => void
  toggleBlurBackground: () => void
  setBackgroundImage: (imageUrl: string | null) => void
  
  // Device management
  requestDevicePermissions: () => Promise<boolean>
  refreshDevices: () => Promise<void>
  testCamera: (deviceId: string) => Promise<MediaStream>
  testMicrophone: (deviceId: string) => Promise<MediaStream>
  testSpeaker: (deviceId: string) => Promise<boolean>
  
  // Settings import/export
  exportSettings: () => string
  importSettings: (settingsJson: string) => boolean
  resetToDefaults: () => void
}

const defaultSettings: VideoDeviceSettings = {
  defaultMicrophone: undefined,
  defaultCamera: undefined,
  defaultSpeaker: undefined,
  autoJoinAudio: true,
  autoJoinVideo: true,
  enableNoiseCancellation: true,
  enableEchoCancellation: true,
  videoQuality: 'medium',
  recordingQuality: 'high',
}

export const useVideoSettingsStore = create<VideoSettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        callSettings: defaultSettings,
        
        availableDevices: {
          cameras: [],
          microphones: [],
          speakers: [],
        },
        
        selectedCamera: null,
        selectedMicrophone: null,
        selectedSpeaker: null,
        
        defaultVideoEnabled: true,
        defaultAudioEnabled: true,
        autoJoinWithVideo: true,
        autoJoinWithAudio: true,
        
        videoQuality: 'medium',
        audioQuality: 'medium',
        
        enableNoiseCancellation: true,
        enableEchoCancellation: true,
        enableAutoGainControl: true,
        
        defaultLayout: 'gallery',
        enableChatSounds: true,
        enableJoinLeaveSounds: true,
        enableKeyboardShortcuts: true,
        
        enableCaptions: false,
        captionLanguage: 'en',
        highContrastMode: false,
        
        adaptiveQuality: true,
        maxBandwidth: 1000,
        
        blurBackground: false,
        backgroundImage: null,

        // Actions
        updateCallSettings: (settings: Partial<VideoDeviceSettings>) => {
          set(state => ({
            callSettings: { ...state.callSettings, ...settings }
          }))
        },

        updateDevices: (devices: MediaDevices) => {
          set({ availableDevices: devices })
          
          // Auto-select first available device if none selected
          const state = get()
          if (!state.selectedCamera && devices.cameras.length > 0) {
            get().setSelectedCamera(devices.cameras[0].deviceId)
          }
          if (!state.selectedMicrophone && devices.microphones.length > 0) {
            get().setSelectedMicrophone(devices.microphones[0].deviceId)
          }
          if (!state.selectedSpeaker && devices.speakers.length > 0) {
            get().setSelectedSpeaker(devices.speakers[0].deviceId)
          }
        },

        setSelectedCamera: (deviceId: string | null) => {
          set({ selectedCamera: deviceId })
          get().updateCallSettings({ defaultCamera: deviceId || undefined })
        },

        setSelectedMicrophone: (deviceId: string | null) => {
          set({ selectedMicrophone: deviceId })
          get().updateCallSettings({ defaultMicrophone: deviceId || undefined })
        },

        setSelectedSpeaker: (deviceId: string | null) => {
          set({ selectedSpeaker: deviceId })
          get().updateCallSettings({ defaultSpeaker: deviceId || undefined })
        },

        setVideoQuality: (quality: 'low' | 'medium' | 'high') => {
          set({ videoQuality: quality })
          get().updateCallSettings({ videoQuality: quality })
        },

        setAudioQuality: (quality: 'low' | 'medium' | 'high') => {
          set({ audioQuality: quality })
        },

        setDefaultLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => {
          set({ defaultLayout: layout })
        },

        toggleNoiseCancellation: () => {
          const newValue = !get().enableNoiseCancellation
          set({ enableNoiseCancellation: newValue })
          get().updateCallSettings({ enableNoiseCancellation: newValue })
        },

        toggleEchoCancellation: () => {
          const newValue = !get().enableEchoCancellation
          set({ enableEchoCancellation: newValue })
          get().updateCallSettings({ enableEchoCancellation: newValue })
        },

        toggleAutoGainControl: () => {
          set(state => ({ enableAutoGainControl: !state.enableAutoGainControl }))
        },

        toggleChatSounds: () => {
          set(state => ({ enableChatSounds: !state.enableChatSounds }))
        },

        toggleJoinLeaveSounds: () => {
          set(state => ({ enableJoinLeaveSounds: !state.enableJoinLeaveSounds }))
        },

        toggleKeyboardShortcuts: () => {
          set(state => ({ enableKeyboardShortcuts: !state.enableKeyboardShortcuts }))
        },

        toggleCaptions: () => {
          set(state => ({ enableCaptions: !state.enableCaptions }))
        },

        setCaptionLanguage: (language: string) => {
          set({ captionLanguage: language })
        },

        toggleHighContrastMode: () => {
          set(state => ({ highContrastMode: !state.highContrastMode }))
        },

        toggleAdaptiveQuality: () => {
          set(state => ({ adaptiveQuality: !state.adaptiveQuality }))
        },

        setMaxBandwidth: (bandwidth: number) => {
          set({ maxBandwidth: bandwidth })
        },

        toggleBlurBackground: () => {
          set(state => ({ blurBackground: !state.blurBackground }))
        },

        setBackgroundImage: (imageUrl: string | null) => {
          set({ 
            backgroundImage: imageUrl,
            blurBackground: imageUrl ? false : get().blurBackground
          })
        },

        // Device management
        requestDevicePermissions: async (): Promise<boolean> => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true, 
              video: true 
            })
            
            // Stop the stream immediately, we just wanted permissions
            stream.getTracks().forEach(track => track.stop())
            
            // Refresh devices now that we have permissions
            await get().refreshDevices()
            
            return true
          } catch (error) {
            console.error('Permission denied:', error)
            return false
          }
        },

        refreshDevices: async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            
            const cameras = devices.filter(device => device.kind === 'videoinput')
            const microphones = devices.filter(device => device.kind === 'audioinput')
            const speakers = devices.filter(device => device.kind === 'audiooutput')
            
            get().updateDevices({ cameras, microphones, speakers })
          } catch (error) {
            console.error('Failed to enumerate devices:', error)
          }
        },

        testCamera: async (deviceId: string): Promise<MediaStream> => {
          return await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } }
          })
        },

        testMicrophone: async (deviceId: string): Promise<MediaStream> => {
          return await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId } }
          })
        },

        testSpeaker: async (deviceId: string): Promise<boolean> => {
          try {
            // Create a test audio element and try to set the sink
            const audio = new Audio()
            if ('setSinkId' in audio) {
              await (audio as any).setSinkId(deviceId)
              return true
            }
            return false
          } catch (error) {
            console.error('Speaker test failed:', error)
            return false
          }
        },

        // Settings import/export
        exportSettings: (): string => {
          const state = get()
          const exportData = {
            callSettings: state.callSettings,
            selectedCamera: state.selectedCamera,
            selectedMicrophone: state.selectedMicrophone,
            selectedSpeaker: state.selectedSpeaker,
            videoQuality: state.videoQuality,
            audioQuality: state.audioQuality,
            enableNoiseCancellation: state.enableNoiseCancellation,
            enableEchoCancellation: state.enableEchoCancellation,
            enableAutoGainControl: state.enableAutoGainControl,
            defaultLayout: state.defaultLayout,
            enableChatSounds: state.enableChatSounds,
            enableJoinLeaveSounds: state.enableJoinLeaveSounds,
            enableKeyboardShortcuts: state.enableKeyboardShortcuts,
            enableCaptions: state.enableCaptions,
            captionLanguage: state.captionLanguage,
            highContrastMode: state.highContrastMode,
            adaptiveQuality: state.adaptiveQuality,
            maxBandwidth: state.maxBandwidth,
            blurBackground: state.blurBackground,
            backgroundImage: state.backgroundImage,
          }
          
          return JSON.stringify(exportData, null, 2)
        },

        importSettings: (settingsJson: string): boolean => {
          try {
            const importData = JSON.parse(settingsJson)
            
            // Validate and apply settings
            if (importData.callSettings) {
              get().updateCallSettings(importData.callSettings)
            }
            
            set({
              selectedCamera: importData.selectedCamera || null,
              selectedMicrophone: importData.selectedMicrophone || null,
              selectedSpeaker: importData.selectedSpeaker || null,
              videoQuality: importData.videoQuality || 'medium',
              audioQuality: importData.audioQuality || 'medium',
              enableNoiseCancellation: importData.enableNoiseCancellation ?? true,
              enableEchoCancellation: importData.enableEchoCancellation ?? true,
              enableAutoGainControl: importData.enableAutoGainControl ?? true,
              defaultLayout: importData.defaultLayout || 'gallery',
              enableChatSounds: importData.enableChatSounds ?? true,
              enableJoinLeaveSounds: importData.enableJoinLeaveSounds ?? true,
              enableKeyboardShortcuts: importData.enableKeyboardShortcuts ?? true,
              enableCaptions: importData.enableCaptions ?? false,
              captionLanguage: importData.captionLanguage || 'en',
              highContrastMode: importData.highContrastMode ?? false,
              adaptiveQuality: importData.adaptiveQuality ?? true,
              maxBandwidth: importData.maxBandwidth || 1000,
              blurBackground: importData.blurBackground ?? false,
              backgroundImage: importData.backgroundImage || null,
            })
            
            return true
          } catch (error) {
            console.error('Failed to import settings:', error)
            return false
          }
        },

        resetToDefaults: () => {
          set({
            callSettings: defaultSettings,
            selectedCamera: null,
            selectedMicrophone: null,
            selectedSpeaker: null,
            defaultVideoEnabled: true,
            defaultAudioEnabled: true,
            autoJoinWithVideo: true,
            autoJoinWithAudio: true,
            videoQuality: 'medium',
            audioQuality: 'medium',
            enableNoiseCancellation: true,
            enableEchoCancellation: true,
            enableAutoGainControl: true,
            defaultLayout: 'gallery',
            enableChatSounds: true,
            enableJoinLeaveSounds: true,
            enableKeyboardShortcuts: true,
            enableCaptions: false,
            captionLanguage: 'en',
            highContrastMode: false,
            adaptiveQuality: true,
            maxBandwidth: 1000,
            blurBackground: false,
            backgroundImage: null,
          })
        },
      }),
      {
        name: 'video-settings-store',
        // Only persist user preferences, not device enumeration
        partialize: (state) => ({
          callSettings: state.callSettings,
          selectedCamera: state.selectedCamera,
          selectedMicrophone: state.selectedMicrophone,
          selectedSpeaker: state.selectedSpeaker,
          videoQuality: state.videoQuality,
          audioQuality: state.audioQuality,
          enableNoiseCancellation: state.enableNoiseCancellation,
          enableEchoCancellation: state.enableEchoCancellation,
          enableAutoGainControl: state.enableAutoGainControl,
          defaultLayout: state.defaultLayout,
          enableChatSounds: state.enableChatSounds,
          enableJoinLeaveSounds: state.enableJoinLeaveSounds,
          enableKeyboardShortcuts: state.enableKeyboardShortcuts,
          enableCaptions: state.enableCaptions,
          captionLanguage: state.captionLanguage,
          highContrastMode: state.highContrastMode,
          adaptiveQuality: state.adaptiveQuality,
          maxBandwidth: state.maxBandwidth,
          blurBackground: state.blurBackground,
          backgroundImage: state.backgroundImage,
        }),
      }
    ),
    { name: 'VideoSettingsStore' }
  )
)