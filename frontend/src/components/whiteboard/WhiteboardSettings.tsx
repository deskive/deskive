/**
 * Whiteboard Settings Component
 * Configuration dialog for whiteboard preferences and session settings
 */

import { useState } from 'react'
import { 
  Settings, 
  Palette, 
  Grid3X3, 
  Ruler, 
  Users, 
  Lock, 
  Unlock,
  Save,
  Download,
  Upload,
  Trash2,
  Eye,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { cn } from '../../lib/utils'
import type { WhiteboardSession } from '@/lib/api/whiteboard-api'

interface WhiteboardSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: WhiteboardSession | null
  className?: string
}

export function WhiteboardSettings({
  open,
  onOpenChange,
  session,
  className
}: WhiteboardSettingsProps) {
  const [settings, setSettings] = useState({
    // Canvas settings
    backgroundColor: session?.state?.backgroundColor || '#FFFFFF',
    showGrid: true,
    gridStyle: 'lines' as 'lines' | 'dots',
    gridSize: 20,
    gridColor: '#E5E5E5',
    gridOpacity: 0.5,
    
    // Session settings
    sessionName: session?.name || 'Untitled Whiteboard',
    isLocked: session?.isLocked || false,
    autoSave: true,
    autoSaveInterval: 30, // seconds
    
    // Collaboration settings
    showCursors: true,
    showParticipantNames: true,
    allowAnonymousJoin: false,
    maxParticipants: 20,
    
    // Export settings
    exportQuality: 0.8,
    exportScale: 1,
    includeBackground: true,
    
    // Performance settings
    smoothDrawing: true,
    pressureSensitive: false,
    optimizeForTouch: false,
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = () => {
    // Here you would save the settings to the whiteboard service
    console.log('Saving settings:', settings)
    onOpenChange(false)
  }

  const handleResetSettings = () => {
    setSettings({
      backgroundColor: '#FFFFFF',
      showGrid: true,
      gridStyle: 'lines',
      gridSize: 20,
      gridColor: '#E5E5E5',
      gridOpacity: 0.5,
      sessionName: 'Untitled Whiteboard',
      isLocked: false,
      autoSave: true,
      autoSaveInterval: 30,
      showCursors: true,
      showParticipantNames: true,
      allowAnonymousJoin: false,
      maxParticipants: 20,
      exportQuality: 0.8,
      exportScale: 1,
      includeBackground: true,
      smoothDrawing: true,
      pressureSensitive: false,
      optimizeForTouch: false,
    })
  }

  const backgroundPresets = [
    { name: 'White', color: '#FFFFFF' },
    { name: 'Light Gray', color: '#F8F9FA' },
    { name: 'Dark Gray', color: '#343A40' },
    { name: 'Black', color: '#000000' },
    { name: 'Light Blue', color: '#E3F2FD' },
    { name: 'Light Green', color: '#E8F5E8' },
    { name: 'Light Yellow', color: '#FFFDE7' },
    { name: 'Light Pink', color: '#FCE4EC' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-3xl max-h-[80vh] overflow-hidden", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Whiteboard Settings
          </DialogTitle>
          <DialogDescription>
            Configure your whiteboard preferences and session settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="canvas" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-96">
            <TabsContent value="canvas" className="space-y-6">
              {/* Background Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <h3 className="font-medium">Background</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Background Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={settings.backgroundColor}
                        onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                        className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        value={settings.backgroundColor}
                        onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Quick Presets</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {backgroundPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => handleSettingChange('backgroundColor', preset.color)}
                          className={cn(
                            "p-2 text-xs rounded border-2 transition-all hover:scale-105",
                            settings.backgroundColor === preset.color
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        >
                          <span className={cn(
                            "block",
                            ['#FFFFFF', '#F8F9FA', '#FFFDE7'].includes(preset.color)
                              ? 'text-gray-700'
                              : 'text-white'
                          )}>
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Grid Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  <h3 className="font-medium">Grid</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Grid</Label>
                    <Switch
                      checked={settings.showGrid}
                      onCheckedChange={(checked) => handleSettingChange('showGrid', checked)}
                    />
                  </div>

                  {settings.showGrid && (
                    <>
                      <div>
                        <Label className="text-sm">Grid Style</Label>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSettingChange('gridStyle', 'lines')}
                            className={cn(
                              "flex-1 px-3 py-2 text-sm rounded border-2 transition-all",
                              settings.gridStyle === 'lines'
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            )}
                          >
                            Lines
                          </button>
                          <button
                            onClick={() => handleSettingChange('gridStyle', 'dots')}
                            className={cn(
                              "flex-1 px-3 py-2 text-sm rounded border-2 transition-all",
                              settings.gridStyle === 'dots'
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            )}
                          >
                            Dots
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Grid Size</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <input
                            type="range"
                            min="10"
                            max="50"
                            value={settings.gridSize}
                            onChange={(e) => handleSettingChange('gridSize', parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-mono w-8 text-center">
                            {settings.gridSize}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Grid Color</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <input
                            type="color"
                            value={settings.gridColor}
                            onChange={(e) => handleSettingChange('gridColor', e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            value={settings.gridColor}
                            onChange={(e) => handleSettingChange('gridColor', e.target.value)}
                            placeholder="#E5E5E5"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Grid Opacity</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.1"
                            value={settings.gridOpacity}
                            onChange={(e) => handleSettingChange('gridOpacity', parseFloat(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-mono w-8 text-center">
                            {Math.round(settings.gridOpacity * 100)}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="session" className="space-y-6">
              {/* Session Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <h3 className="font-medium">Session Information</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Session Name</Label>
                    <Input
                      value={settings.sessionName}
                      onChange={(e) => handleSettingChange('sessionName', e.target.value)}
                      placeholder="Enter session name"
                      className="mt-1"
                    />
                  </div>

                  {session && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Session ID:</span>
                        <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                          {session.id}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <div className="text-xs mt-1">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Security Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {settings.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  <h3 className="font-medium">Security</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Lock Session</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Prevent new participants from joining
                      </p>
                    </div>
                    <Switch
                      checked={settings.isLocked}
                      onCheckedChange={(checked) => handleSettingChange('isLocked', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Auto-Save Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <h3 className="font-medium">Auto-Save</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable Auto-Save</Label>
                    <Switch
                      checked={settings.autoSave}
                      onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
                    />
                  </div>

                  {settings.autoSave && (
                    <div>
                      <Label className="text-sm">Save Interval (seconds)</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="10"
                          value={settings.autoSaveInterval}
                          onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12 text-center">
                          {settings.autoSaveInterval}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="collaboration" className="space-y-6">
              {/* Collaboration Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <h3 className="font-medium">Participants</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Maximum Participants</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={settings.maxParticipants}
                        onChange={(e) => handleSettingChange('maxParticipants', parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-8 text-center">
                        {settings.maxParticipants}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Allow Anonymous Join</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Let users join without authentication
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowAnonymousJoin}
                      onCheckedChange={(checked) => handleSettingChange('allowAnonymousJoin', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Display Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <h3 className="font-medium">Display</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Other Cursors</Label>
                    <Switch
                      checked={settings.showCursors}
                      onCheckedChange={(checked) => handleSettingChange('showCursors', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Participant Names</Label>
                    <Switch
                      checked={settings.showParticipantNames}
                      onCheckedChange={(checked) => handleSettingChange('showParticipantNames', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              {/* Performance Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  <h3 className="font-medium">Performance</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Smooth Drawing</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Use curve interpolation for smoother lines
                      </p>
                    </div>
                    <Switch
                      checked={settings.smoothDrawing}
                      onCheckedChange={(checked) => handleSettingChange('smoothDrawing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Pressure Sensitive</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Vary stroke width based on pressure (stylus)
                      </p>
                    </div>
                    <Switch
                      checked={settings.pressureSensitive}
                      onCheckedChange={(checked) => handleSettingChange('pressureSensitive', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Optimize for Touch</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Better touch and mobile experience
                      </p>
                    </div>
                    <Switch
                      checked={settings.optimizeForTouch}
                      onCheckedChange={(checked) => handleSettingChange('optimizeForTouch', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Export Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <h3 className="font-medium">Export Defaults</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Export Quality</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={settings.exportQuality}
                        onChange={(e) => handleSettingChange('exportQuality', parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-8 text-center">
                        {Math.round(settings.exportQuality * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Export Scale</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={settings.exportScale}
                        onChange={(e) => handleSettingChange('exportScale', parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-8 text-center">
                        {settings.exportScale}x
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Include Background</Label>
                    <Switch
                      checked={settings.includeBackground}
                      onCheckedChange={(checked) => handleSettingChange('includeBackground', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <h3 className="font-medium text-red-500">Danger Zone</h3>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" size="sm" onClick={handleResetSettings}>
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}