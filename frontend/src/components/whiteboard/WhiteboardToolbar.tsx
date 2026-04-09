/**
 * Whiteboard Toolbar Component
 * Contains all drawing tools, color picker, and stroke width controls
 */

import { useState } from 'react'
import {
  Pen,
  Pencil,
  Paintbrush,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  MousePointer,
  Palette,
  Settings
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Separator } from '../ui/separator'
import { cn } from '../../lib/utils'
import { 
  type DrawingTool, 
  COLORS, 
  STROKE_WIDTHS 
} from '@/lib/api/whiteboard-api'

interface WhiteboardToolbarProps {
  currentTool: DrawingTool
  currentColor: string
  currentStrokeWidth: number
  onToolChange: (tool: DrawingTool) => void
  onColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  className?: string
}

export function WhiteboardToolbar({
  currentTool,
  currentColor,
  currentStrokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  className
}: WhiteboardToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showStrokeSettings, setShowStrokeSettings] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')

  // Tool configurations
  const tools = [
    { id: 'select' as DrawingTool, icon: MousePointer, label: 'Select', shortcut: 'V' },
    { id: 'pen' as DrawingTool, icon: Pen, label: 'Pen', shortcut: 'P' },
    { id: 'pencil' as DrawingTool, icon: Pencil, label: 'Pencil', shortcut: 'N' },
    { id: 'brush' as DrawingTool, icon: Paintbrush, label: 'Brush', shortcut: 'B' },
    { id: 'eraser' as DrawingTool, icon: Eraser, label: 'Eraser', shortcut: 'E' },
  ]

  const shapeTools = [
    { id: 'rectangle' as DrawingTool, icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle' as DrawingTool, icon: Circle, label: 'Circle', shortcut: 'O' },
    { id: 'line' as DrawingTool, icon: Minus, label: 'Line', shortcut: 'L' },
    { id: 'arrow' as DrawingTool, icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
  ]

  const utilityTools = [
    { id: 'text' as DrawingTool, icon: Type, label: 'Text', shortcut: 'T' },
  ]

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onColorChange(color)
    setShowColorPicker(false)
  }

  const renderToolButton = (tool: { id: DrawingTool, icon: any, label: string, shortcut: string }) => {
    const Icon = tool.icon
    const isActive = currentTool === tool.id

    return (
      <Button
        key={tool.id}
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={() => onToolChange(tool.id)}
        className={cn(
          "w-14 h-14 flex flex-col items-center justify-center gap-1 hover:bg-gray-100",
          isActive ? "bg-blue-100 hover:bg-blue-200 text-blue-600" : "text-gray-700 hover:text-gray-900"
        )}
        title={`${tool.label} (${tool.shortcut})`}
      >
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-medium">{tool.shortcut}</span>
      </Button>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2 p-3 h-full overflow-y-auto", className)}>
      {/* Drawing Tools */}
      <div className="space-y-1">
        {tools.map(renderToolButton)}
      </div>

      <Separator />

      {/* Shape Tools */}
      <div className="space-y-1">
        {shapeTools.map(renderToolButton)}
      </div>

      <Separator />

      {/* Utility Tools */}
      <div className="space-y-1">
        {utilityTools.map(renderToolButton)}
      </div>

      <Separator />

      {/* Color Picker */}
      <div className="space-y-2">
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-14 h-14 flex flex-col items-center justify-center gap-1 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
              title="Color Picker"
            >
              <div
                className="w-6 h-6 rounded border-2 border-gray-300"
                style={{ backgroundColor: currentColor }}
              />
              <Palette className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" className="w-64 p-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Choose Color</h4>
              
              {/* Color Presets */}
              <div className="grid grid-cols-5 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                      currentColor === color ? "border-gray-400 ring-2 ring-blue-500" : "border-gray-300"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onColorChange(color)
                      setShowColorPicker(false)
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Custom Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onBlur={() => onColorChange(customColor)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onColorChange(customColor)
                        setShowColorPicker(false)
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Stroke Width */}
        <Popover open={showStrokeSettings} onOpenChange={setShowStrokeSettings}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-14 h-14 flex flex-col items-center justify-center gap-1 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
              title="Stroke Settings"
            >
              <div className="flex flex-col items-center">
                <div
                  className="bg-gray-800 rounded-full"
                  style={{
                    width: `${Math.min(currentStrokeWidth * 2, 16)}px`,
                    height: `${Math.min(currentStrokeWidth * 2, 16)}px`
                  }}
                />
                <Settings className="h-3 w-3 mt-1" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" className="w-48 p-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Stroke Settings</h4>
              
              {/* Stroke Width Presets */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Width</label>
                <div className="space-y-1">
                  {STROKE_WIDTHS.map((width) => (
                    <button
                      key={width}
                      className={cn(
                        "w-full h-8 flex items-center justify-center rounded border-2 transition-all hover:bg-gray-50",
                        currentStrokeWidth === width ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      )}
                      onClick={() => {
                        onStrokeWidthChange(width)
                        setShowStrokeSettings(false)
                      }}
                    >
                      <div 
                        className="bg-gray-800 rounded-full"
                        style={{ 
                          width: `${Math.min(width * 2, 20)}px`, 
                          height: `${width}px` 
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Stroke Width */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Custom Width</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={currentStrokeWidth}
                    onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={currentStrokeWidth}
                    onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
                    className="w-12 px-1 py-1 text-xs border border-gray-300 rounded text-center"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* Tool Info */}
      <div className="mt-auto">
        <div className="text-center">
          <div className="text-xs font-medium text-gray-600 mb-1">
            {tools.find(t => t.id === currentTool)?.label ||
             shapeTools.find(t => t.id === currentTool)?.label ||
             utilityTools.find(t => t.id === currentTool)?.label ||
             'Unknown'}
          </div>
          <div className="text-[10px] text-gray-400">
            {currentColor} • {currentStrokeWidth}px
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-2 p-2 bg-gray-50 rounded text-[10px] text-gray-500">
        <div className="font-medium mb-1">Shortcuts:</div>
        <div>Ctrl+Z: Undo</div>
        <div>Ctrl+Y: Redo</div>
        <div>Ctrl+S: Save</div>
        <div>Ctrl+E: Export</div>
        <div>Ctrl+ +/-: Zoom</div>
      </div>
    </div>
  )
}