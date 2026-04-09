/**
 * Whiteboard Canvas Component
 * Core drawing canvas with real-time collaboration support
 */

import React, { 
  forwardRef, 
  useEffect, 
  useRef, 
  useImperativeHandle, 
  useCallback, 
  useState 
} from 'react'
import { cn } from '../../lib/utils'
import { 
  whiteboardService, 
  type DrawingPoint, 
  type DrawingStroke, 
  type WhiteboardShape, 
  type TextAnnotation,
  type CursorPosition
} from '@/lib/api/whiteboard-api'

interface WhiteboardCanvasProps {
  className?: string
  showGrid?: boolean
  gridStyle?: 'lines' | 'dots'
  zoom?: number
  panX?: number
  panY?: number
  cursors?: Map<string, CursorPosition>
}

export const WhiteboardCanvas = forwardRef<HTMLCanvasElement, WhiteboardCanvasProps>(({
  className,
  showGrid = true,
  gridStyle = 'lines',
  zoom = 1,
  panX = 0,
  panY = 0,
  cursors = new Map()
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([])
  const [isShapeMode, setIsShapeMode] = useState(false)
  const [shapeStart, setShapeStart] = useState<DrawingPoint | null>(null)
  const [_isTextMode, setIsTextMode] = useState(false)
  const [textInput, setTextInput] = useState<{
    position: DrawingPoint
    element: HTMLInputElement
  } | null>(null)

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })

  // Expose canvas ref to parent
  useImperativeHandle(ref, () => canvasRef.current!)

  // Initialize canvas and setup event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    const container = containerRef.current

    if (!canvas || !overlayCanvas || !container) return

    // Set initial canvas size
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect()
      const devicePixelRatio = window.devicePixelRatio || 1
      
      // Set display size (CSS size)
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      overlayCanvas.style.width = rect.width + 'px'
      overlayCanvas.style.height = rect.height + 'px'
      
      // Set actual size in memory (scaled for device pixel ratio)
      canvas.width = rect.width * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      overlayCanvas.width = rect.width * devicePixelRatio
      overlayCanvas.height = rect.height * devicePixelRatio
      
      // Scale the context to ensure correct drawing operations
      const ctx = canvas.getContext('2d')!
      const overlayCtx = overlayCanvas.getContext('2d')!
      
      ctx.scale(devicePixelRatio, devicePixelRatio)
      overlayCtx.scale(devicePixelRatio, devicePixelRatio)
      
      setCanvasSize({ width: rect.width, height: rect.height })
    }

    updateCanvasSize()

    const resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(container)

    // Draw initial content
    redrawCanvas()

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Redraw canvas when session or drawing state changes
  useEffect(() => {
    redrawCanvas()
  }, [zoom, panX, panY, showGrid, gridStyle])

  // Handle tool changes
  useEffect(() => {
    const handleToolChange = (tool: string) => {
      const isShape = ['rectangle', 'circle', 'line', 'arrow'].includes(tool)
      const isText = tool === 'text'
      
      setIsShapeMode(isShape)
      setIsTextMode(isText)
      
      // Update cursor style
      if (containerRef.current) {
        const cursor = tool === 'eraser' ? 'not-allowed' : 
                      tool === 'text' ? 'text' :
                      tool === 'select' ? 'move' :
                      'crosshair'
        containerRef.current.style.cursor = cursor
      }
    }

    whiteboardService.on('tool_changed', handleToolChange)
    return () => whiteboardService.off('tool_changed', handleToolChange)
  }, [])

  // Set up real-time collaboration listeners
  useEffect(() => {
    const handleRemoteStrokeStart = () => {
      // Remote user started drawing - we'll handle this in redrawCanvas
    }

    const handleRemoteStrokeUpdate = () => {
      // Remote user is drawing - update in real-time
      redrawCanvas()
    }

    const handleRemoteStrokeComplete = () => {
      // Remote user completed stroke - redraw canvas
      redrawCanvas()
    }

    const handleRemoteShapeCreated = () => {
      redrawCanvas()
    }

    const handleRemoteTextCreated = () => {
      redrawCanvas()
    }

    const handleRemoteElementDeleted = () => {
      redrawCanvas()
    }

    const handleRemoteBoardCleared = () => {
      redrawCanvas()
    }

    const handleBoardUpdated = () => {
      redrawCanvas()
    }

    // Subscribe to events
    whiteboardService.on('remote_stroke_start', handleRemoteStrokeStart)
    whiteboardService.on('remote_stroke_update', handleRemoteStrokeUpdate)
    whiteboardService.on('remote_stroke_complete', handleRemoteStrokeComplete)
    whiteboardService.on('remote_shape_created', handleRemoteShapeCreated)
    whiteboardService.on('remote_text_created', handleRemoteTextCreated)
    whiteboardService.on('remote_element_deleted', handleRemoteElementDeleted)
    whiteboardService.on('remote_board_cleared', handleRemoteBoardCleared)
    whiteboardService.on('board_updated', handleBoardUpdated)
    whiteboardService.on('stroke_completed', handleBoardUpdated)
    whiteboardService.on('shape_created', handleBoardUpdated)
    whiteboardService.on('text_created', handleBoardUpdated)

    return () => {
      whiteboardService.off('remote_stroke_start', handleRemoteStrokeStart)
      whiteboardService.off('remote_stroke_update', handleRemoteStrokeUpdate)
      whiteboardService.off('remote_stroke_complete', handleRemoteStrokeComplete)
      whiteboardService.off('remote_shape_created', handleRemoteShapeCreated)
      whiteboardService.off('remote_text_created', handleRemoteTextCreated)
      whiteboardService.off('remote_element_deleted', handleRemoteElementDeleted)
      whiteboardService.off('remote_board_cleared', handleRemoteBoardCleared)
      whiteboardService.off('board_updated', handleBoardUpdated)
      whiteboardService.off('stroke_completed', handleBoardUpdated)
      whiteboardService.off('shape_created', handleBoardUpdated)
      whiteboardService.off('text_created', handleBoardUpdated)
    }
  }, [])

  // Convert screen coordinates to canvas coordinates
  const getCanvasPoint = useCallback((clientX: number, clientY: number): DrawingPoint => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return { x: 0, y: 0 }

    const rect = container.getBoundingClientRect()
    const x = (clientX - rect.left - panX) / zoom
    const y = (clientY - rect.top - panY) / zoom

    return { x, y, timestamp: Date.now() }
  }, [zoom, panX, panY])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only handle left click

    const point = getCanvasPoint(e.clientX, e.clientY)
    const currentTool = whiteboardService.getCurrentTool()

    if (currentTool === 'text') {
      handleTextClick(point)
    } else if (isShapeMode) {
      setShapeStart(point)
      setIsDrawing(true)
    } else if (currentTool !== 'select') {
      whiteboardService.startStroke(point)
      setCurrentStroke([point])
      setIsDrawing(true)
    }

    e.preventDefault()
  }, [getCanvasPoint, isShapeMode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    
    // Update cursor position for collaboration
    whiteboardService.updateCursor(point)

    if (!isDrawing) return

    const currentTool = whiteboardService.getCurrentTool()

    if (isShapeMode && shapeStart) {
      // Preview shape while drawing
      drawShapePreview(shapeStart, point)
    } else if (currentTool !== 'select' && currentTool !== 'text') {
      whiteboardService.addPointToStroke(point)
      setCurrentStroke(prev => [...prev, point])
      
      // Draw current stroke in real-time
      drawCurrentStroke([...currentStroke, point])
    }
  }, [getCanvasPoint, isDrawing, isShapeMode, shapeStart, currentStroke])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return

    const point = getCanvasPoint(e.clientX, e.clientY)
    const currentTool = whiteboardService.getCurrentTool()

    if (isShapeMode && shapeStart) {
      // Create shape
      const shapeType = currentTool as 'rectangle' | 'circle' | 'line' | 'arrow'
      whiteboardService.createShape(shapeType, shapeStart, point)
      setShapeStart(null)
    } else if (currentTool !== 'select' && currentTool !== 'text') {
      // Complete stroke
      whiteboardService.completeStroke()
      setCurrentStroke([])
    }

    setIsDrawing(false)
  }, [getCanvasPoint, isDrawing, isShapeMode, shapeStart])

  // Text input handler
  const handleTextClick = useCallback((point: DrawingPoint) => {
    if (textInput) {
      // Complete previous text input
      finishTextInput()
    }

    // Create text input element
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'absolute bg-transparent border-none outline-none text-black'
    input.style.left = `${point.x * zoom + panX}px`
    input.style.top = `${point.y * zoom + panY}px`
    input.style.fontSize = '16px'
    input.style.fontFamily = 'Arial, sans-serif'
    input.style.color = whiteboardService.getCurrentColor()
    input.style.zIndex = '1000'

    input.addEventListener('blur', finishTextInput)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishTextInput()
      } else if (e.key === 'Escape') {
        cancelTextInput()
      }
    })

    containerRef.current?.appendChild(input)
    input.focus()

    setTextInput({ position: point, element: input })
  }, [textInput, zoom, panX, panY])

  const finishTextInput = useCallback(() => {
    if (!textInput) return

    const text = textInput.element.value.trim()
    if (text) {
      whiteboardService.createText(text, textInput.position)
    }

    textInput.element.remove()
    setTextInput(null)
  }, [textInput])

  const cancelTextInput = useCallback(() => {
    if (!textInput) return

    textInput.element.remove()
    setTextInput(null)
  }, [textInput])

  // Drawing functions
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context
    ctx.save()

    // Apply zoom and pan
    ctx.scale(zoom, zoom)
    ctx.translate(panX / zoom, panY / zoom)

    // Draw background
    const session = whiteboardService.getCurrentSession()
    if (session) {
      ctx.fillStyle = session.state.backgroundColor
      ctx.fillRect(-panX / zoom, -panY / zoom, canvasSize.width / zoom, canvasSize.height / zoom)
    }

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx)
    }

    // Draw all strokes
    if (session) {
      session.state.strokes.forEach(stroke => {
        drawStroke(ctx, stroke)
      })

      // Draw all shapes
      session.state.shapes.forEach(shape => {
        drawShape(ctx, shape)
      })

      // Draw all text annotations
      session.state.texts.forEach(text => {
        drawText(ctx, text)
      })
    }

    // Restore context
    ctx.restore()

    // Draw overlay (cursors, current stroke, etc.)
    drawOverlay()
  }, [zoom, panX, panY, canvasSize, showGrid, gridStyle])

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw cursors from other users
    cursors.forEach(cursor => {
      drawCursor(ctx, cursor)
    })
  }, [cursors])

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const gridSize = 20 * zoom
    const offsetX = panX % gridSize
    const offsetY = panY % gridSize

    ctx.save()
    ctx.globalAlpha = 0.5

    if (gridStyle === 'dots') {
      // Draw dotted grid
      ctx.fillStyle = '#E5E5E5'
      const dotRadius = 1.5

      for (let x = offsetX; x < canvasSize.width; x += gridSize) {
        for (let y = offsetY; y < canvasSize.height; y += gridSize) {
          ctx.beginPath()
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else {
      // Draw line grid
      ctx.strokeStyle = '#E5E5E5'
      ctx.lineWidth = 0.5

      // Vertical lines
      for (let x = offsetX; x < canvasSize.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasSize.height)
        ctx.stroke()
      }

      // Horizontal lines
      for (let y = offsetY; y < canvasSize.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasSize.width, y)
        ctx.stroke()
      }
    }

    ctx.restore()
  }, [canvasSize, zoom, panX, panY, gridStyle])

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawingStroke) => {
    if (stroke.points.length === 0) return

    ctx.save()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = stroke.opacity

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    }

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

    if (stroke.points.length === 1) {
      // Single point - draw a dot
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.strokeWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Multiple points - draw smooth curve
      for (let i = 1; i < stroke.points.length; i++) {
        // const _prevPoint = stroke.points[i - 1]
        const currentPoint = stroke.points[i]
        
        if (i === stroke.points.length - 1) {
          ctx.lineTo(currentPoint.x, currentPoint.y)
        } else {
          const nextPoint = stroke.points[i + 1]
          const cpX = (currentPoint.x + nextPoint.x) / 2
          const cpY = (currentPoint.y + nextPoint.y) / 2
          ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, cpX, cpY)
        }
      }
      ctx.stroke()
    }

    ctx.restore()
  }, [])

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: WhiteboardShape) => {
    ctx.save()
    ctx.strokeStyle = shape.color
    ctx.lineWidth = shape.strokeWidth
    ctx.globalAlpha = shape.opacity

    if (shape.fillColor) {
      ctx.fillStyle = shape.fillColor
    }

    const { startPoint, endPoint } = shape

    switch (shape.type) {
      case 'rectangle': {
        const width = endPoint.x - startPoint.x
        const height = endPoint.y - startPoint.y
        
        if (shape.fillColor) {
          ctx.fillRect(startPoint.x, startPoint.y, width, height)
        }
        ctx.strokeRect(startPoint.x, startPoint.y, width, height)
        break
      }
      
      case 'circle': {
        const centerX = (startPoint.x + endPoint.x) / 2
        const centerY = (startPoint.y + endPoint.y) / 2
        const radiusX = Math.abs(endPoint.x - startPoint.x) / 2
        const radiusY = Math.abs(endPoint.y - startPoint.y) / 2
        
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        
        if (shape.fillColor) {
          ctx.fill()
        }
        ctx.stroke()
        break
      }
      
      case 'line': {
        ctx.beginPath()
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.lineTo(endPoint.x, endPoint.y)
        ctx.stroke()
        break
      }
      
      case 'arrow': {
        const headLength = 15
        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x)
        
        // Draw line
        ctx.beginPath()
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.lineTo(endPoint.x, endPoint.y)
        ctx.stroke()
        
        // Draw arrow head
        ctx.beginPath()
        ctx.moveTo(endPoint.x, endPoint.y)
        ctx.lineTo(
          endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
          endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(endPoint.x, endPoint.y)
        ctx.lineTo(
          endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
          endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
        break
      }
    }

    ctx.restore()
  }, [])

  const drawText = useCallback((ctx: CanvasRenderingContext2D, text: TextAnnotation) => {
    ctx.save()
    ctx.fillStyle = text.color
    ctx.font = `${text.bold ? 'bold ' : ''}${text.italic ? 'italic ' : ''}${text.fontSize}px ${text.fontFamily}`
    ctx.textBaseline = 'top'
    
    const textX = text.position?.x ?? text.x;
    const textY = text.position?.y ?? text.y;

    if (text.underline) {
      const metrics = ctx.measureText(text.text)
      ctx.beginPath()
      ctx.moveTo(textX, textY + text.fontSize + 2)
      ctx.lineTo(textX + metrics.width, textY + text.fontSize + 2)
      ctx.strokeStyle = text.color
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.fillText(text.text, textX, textY)
    ctx.restore()
  }, [])

  const drawCurrentStroke = useCallback((points: DrawingPoint[]) => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || points.length === 0) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panX / zoom, panY / zoom)
    
    ctx.strokeStyle = whiteboardService.getCurrentColor()
    ctx.lineWidth = whiteboardService.getCurrentStrokeWidth()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = whiteboardService.getCurrentOpacity()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }

    ctx.stroke()
    ctx.restore()
  }, [zoom, panX, panY])

  const drawShapePreview = useCallback((start: DrawingPoint, end: DrawingPoint) => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panX / zoom, panY / zoom)
    
    ctx.strokeStyle = whiteboardService.getCurrentColor()
    ctx.lineWidth = whiteboardService.getCurrentStrokeWidth()
    ctx.globalAlpha = 0.7
    ctx.setLineDash([5, 5])

    const currentTool = whiteboardService.getCurrentTool()

    switch (currentTool) {
      case 'rectangle': {
        const width = end.x - start.x
        const height = end.y - start.y
        ctx.strokeRect(start.x, start.y, width, height)
        break
      }
      
      case 'circle': {
        const centerX = (start.x + end.x) / 2
        const centerY = (start.y + end.y) / 2
        const radiusX = Math.abs(end.x - start.x) / 2
        const radiusY = Math.abs(end.y - start.y) / 2
        
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      }
      
      case 'line': {
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        break
      }
      
      case 'arrow': {
        const headLength = 15
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        
        // Draw line
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        
        // Draw arrow head
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - headLength * Math.cos(angle - Math.PI / 6),
          end.y - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - headLength * Math.cos(angle + Math.PI / 6),
          end.y - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
        break
      }
    }

    ctx.restore()
  }, [zoom, panX, panY])

  const drawCursor = useCallback((ctx: CanvasRenderingContext2D, cursor: CursorPosition) => {
    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panX / zoom, panY / zoom)

    const cursorColor = cursor.userColor || cursor.color || '#000000';
    const cursorName = cursor.userName || 'User';

    // Draw cursor dot
    ctx.fillStyle = cursorColor
    ctx.beginPath()
    ctx.arc(cursor.x, cursor.y, 4, 0, Math.PI * 2)
    ctx.fill()

    // Draw user name
    ctx.fillStyle = cursorColor
    ctx.font = '12px Arial'
    ctx.fillText(cursorName, cursor.x + 8, cursor.y - 8)

    ctx.restore()
  }, [zoom, panX, panY])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden bg-white", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Main drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full bg-white"
        style={{ imageRendering: 'crisp-edges' }}
      />

      {/* Overlay canvas for cursors and preview */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Watermark/Instructions for empty canvas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center text-gray-300 select-none">
          <div className="text-6xl mb-4">✏️</div>
          <p className="text-lg font-medium">Start drawing!</p>
          <p className="text-sm mt-2">Select a tool from the left sidebar</p>
        </div>
      </div>
    </div>
  )
})