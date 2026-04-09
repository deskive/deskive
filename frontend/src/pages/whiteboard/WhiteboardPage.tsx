/**
 * Whiteboard Page - Excalidraw-based collaborative whiteboard
 * Features: Real-time collaboration, save/load, export, sharing
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useWhiteboardCollaboration } from '@/hooks/useWhiteboardCollaboration';
import { useMindMap } from '@/hooks/useMindMap';
import { WhiteboardShareModal } from '@/components/whiteboard/WhiteboardShareModal';
import { useIntl } from 'react-intl';

// Using simplified types - Excalidraw's actual types are complex and not easily importable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BinaryFiles = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;
import {
  Save,
  Download,
  Share2,
  Users,
  ArrowLeft,
  Loader2,
  Plus,
  FolderOpen,
  Trash2,
  Copy,
  Settings,
  Moon,
  Sun,
  Grid3X3,
  MousePointer2,
  Hand,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image,
  Eraser,
  Lock,
  Unlock,
  Palette,
  PanelTop,
  GitBranch,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/fetch';

// Sanitize elements for Excalidraw compatibility
// Ensures freedraw elements have valid points, and all required properties exist
function sanitizeElements(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  if (!elements || !Array.isArray(elements)) return [];

  return elements
    .filter((el) => el && typeof el === 'object' && el.id && el.type)
    .map((el) => {
      const sanitized = { ...el };

      // Ensure freedraw elements have valid points array
      if (el.type === 'freedraw') {
        if (!el.points || !Array.isArray(el.points) || el.points.length === 0) {
          sanitized.points = [[0, 0, 0.5]];
          console.warn(`[Sanitize] Fixed freedraw element ${el.id} with missing points`);
        } else {
          sanitized.points = el.points
            .filter((p: unknown) => Array.isArray(p) && p.length >= 2)
            .map((p: number[]) => [
              typeof p[0] === 'number' ? p[0] : 0,
              typeof p[1] === 'number' ? p[1] : 0,
              typeof p[2] === 'number' ? p[2] : 0.5,
            ]);
          if (sanitized.points.length === 0) {
            sanitized.points = [[0, 0, 0.5]];
          }
        }
      }

      // Ensure line/arrow elements have valid points
      if ((el.type === 'line' || el.type === 'arrow') && el.points) {
        if (!Array.isArray(el.points) || el.points.length < 2) {
          sanitized.points = [[0, 0], [el.width || 100, el.height || 0]];
        }
      }

      // Ensure opacity is valid (0-100 for Excalidraw)
      if (typeof el.opacity !== 'number' || el.opacity < 0 || el.opacity > 100) {
        sanitized.opacity = 100;
      }

      // Ensure required numeric properties exist
      sanitized.x = typeof el.x === 'number' ? el.x : 0;
      sanitized.y = typeof el.y === 'number' ? el.y : 0;
      sanitized.width = typeof el.width === 'number' ? el.width : 100;
      sanitized.height = typeof el.height === 'number' ? el.height : 100;
      sanitized.angle = typeof el.angle === 'number' ? el.angle : 0;
      sanitized.strokeWidth = typeof el.strokeWidth === 'number' ? el.strokeWidth : 2;

      return sanitized;
    });
}

// Types
interface WhiteboardData {
  id: string;
  workspaceId: string;
  name: string;
  elements: ExcalidrawElement[];
  appState?: Partial<AppState>;
  files?: BinaryFiles;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Note: Collaboration now uses useWhiteboardCollaboration hook

// API functions
const whiteboardApi = {
  async getWhiteboards(workspaceId: string): Promise<WhiteboardData[]> {
    return api.get<WhiteboardData[]>(`/workspaces/${workspaceId}/whiteboards`);
  },

  async getWhiteboard(workspaceId: string, whiteboardId: string): Promise<WhiteboardData> {
    return api.get<WhiteboardData>(`/workspaces/${workspaceId}/whiteboards/${whiteboardId}`);
  },

  async createWhiteboard(workspaceId: string, data: { name: string; elements?: ExcalidrawElement[]; appState?: Partial<AppState> }): Promise<WhiteboardData> {
    return api.post<WhiteboardData>(`/workspaces/${workspaceId}/whiteboards`, data);
  },

  async updateWhiteboard(workspaceId: string, whiteboardId: string, data: { name?: string; elements?: ExcalidrawElement[]; appState?: Partial<AppState>; files?: BinaryFiles }): Promise<WhiteboardData> {
    return api.patch<WhiteboardData>(`/workspaces/${workspaceId}/whiteboards/${whiteboardId}`, data);
  },

  async deleteWhiteboard(workspaceId: string, whiteboardId: string): Promise<void> {
    return api.delete<void>(`/workspaces/${workspaceId}/whiteboards/${whiteboardId}`);
  },
};

export function WhiteboardPage() {
  const params = useParams<{ workspaceId?: string; whiteboardId?: string; '*'?: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const intl = useIntl();
  const { formatMessage } = intl;

  // Check if accessed from mobile app (WebView)
  const isMobileView = searchParams.get('mobile') === 'true';
  const mobileToken = searchParams.get('token');

  // Handle mobile WebView token authentication
  useEffect(() => {
    if (isMobileView && mobileToken) {
      // Store the token from URL parameter
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken !== mobileToken) {
        console.log('📱 Mobile WebView: Storing auth token from URL');
        localStorage.setItem('auth_token', mobileToken);
        // Dispatch event to notify AuthContext to refetch user
        window.dispatchEvent(new CustomEvent('auth-token-stored'));
      }
    }
  }, [isMobileView, mobileToken]);

  // Extract workspaceId from URL - handle both direct routes and nested routes under /more
  const workspaceId = params.workspaceId || location.pathname.match(/\/workspaces\/([^\/]+)/)?.[1];

  // Extract whiteboardId - could be in params or in the wildcard path
  const wildcardId = params['*']?.split('/')[0];
  const whiteboardId = params.whiteboardId || (wildcardId && wildcardId.length > 0 ? wildcardId : undefined);

  console.log('WhiteboardPage - workspaceId:', workspaceId, 'whiteboardId:', whiteboardId, 'pathname:', location.pathname);

  // Refs
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [whiteboard, setWhiteboard] = useState<WhiteboardData | null>(null);
  const [whiteboards, setWhiteboards] = useState<WhiteboardData[]>([]);
  const [initialData, setInitialData] = useState<{ elements: ExcalidrawElement[]; appState?: Partial<AppState>; files?: BinaryFiles } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTool, setActiveTool] = useState('selection');
  const [isLocked, setIsLocked] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff');
  const [showHeader, setShowHeader] = useState(!isMobileView); // Hide header in mobile view
  const [isMindMapMode, setIsMindMapMode] = useState(false);
  const [stickyNoteColor, setStickyNoteColor] = useState('#fff9c4'); // Default yellow

  // Sticky note colors (pastel colors like ClickUp)
  const stickyNoteColors = [
    '#fff9c4', // Yellow
    '#ffcdd2', // Pink
    '#c8e6c9', // Green
    '#bbdefb', // Blue
    '#e1bee7', // Purple
    '#ffe0b2', // Orange
  ];

  // Mind map hook
  const mindMap = useMindMap();

  // Ref to always access latest mindMap state (avoids stale closure issues)
  const mindMapRef = useRef(mindMap);
  mindMapRef.current = mindMap;

  // Canvas background colors
  const bgColors = ['#ffffff', '#f8f9fa', '#f5f5dc', '#e6f3ff', '#f0fff0', '#fff0f5', '#1e1e1e', '#121212'];

  // Real-time collaboration hook
  const {
    isConnected: isCollabConnected,
    users: collabUsers,
    collaborators: collabPointers,
    bindExcalidraw,
    updateElements,
    updateFiles,
    updatePointer,
  } = useWhiteboardCollaboration({
    sessionId: whiteboardId || '',
    workspaceId: workspaceId || '',
    currentUserId: user?.id,
    enabled: !!whiteboardId && !!workspaceId && !!whiteboard,
    onElementsChange: (elements) => {
      // Update local Excalidraw with elements from other users
      if (excalidrawApiRef.current) {
        excalidrawApiRef.current.updateScene({ elements });
      }
    },
    onError: (error) => {
      console.error('[Collaboration] Error:', error);
    },
  });

  // Update Excalidraw with collaborators when they change
  useEffect(() => {
    if (excalidrawApiRef.current && collabPointers.size > 0) {
      // Update collaborators through the API
      excalidrawApiRef.current.updateScene({
        collaborators: collabPointers,
      });
    }
  }, [collabPointers]);

  // Callback for Excalidraw API
  const onExcalidrawApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawApiRef.current = api;
    // Bind to collaboration
    bindExcalidraw(api);
  }, [bindExcalidraw]);

  // Dialogs
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');

  // Load whiteboard
  const loadWhiteboard = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    // For mobile WebView, wait for auth token to be stored
    if (isMobileView && mobileToken) {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        return; // Token will be stored by the other useEffect, then this will re-run
      }
    }

    try {
      setLoading(true);

      if (whiteboardId) {
        // Load specific whiteboard
        const data = await whiteboardApi.getWhiteboard(workspaceId, whiteboardId);
        console.log('Loaded whiteboard data:', data);
        console.log('Elements count:', data.elements?.length || 0);
        setWhiteboard(data);
        // Sanitize elements before passing to Excalidraw to prevent rendering errors
        const sanitizedElements = sanitizeElements(data.elements || []);
        console.log('Sanitized elements count:', sanitizedElements.length);
        setInitialData({
          elements: sanitizedElements,
          appState: data.appState,
          files: data.files,
        });
      } else {
        // Check if we should create a new one or show open dialog
        const list = await whiteboardApi.getWhiteboards(workspaceId);
        setWhiteboards(list);

        if (list.length === 0) {
          // No whiteboards, show new dialog
          setShowNewDialog(true);
        } else if (list.length === 1) {
          // Only one, open it directly
          navigate(`/workspaces/${workspaceId}/whiteboard/${list[0].id}`, { replace: true });
        } else {
          // Multiple, show open dialog
          setShowOpenDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to load whiteboard:', error);
      toast.error(formatMessage({ id: 'whiteboard.error.loadFailed' }));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, whiteboardId, navigate, isMobileView, mobileToken]);

  // Track auth token changes for mobile WebView
  const [authReady, setAuthReady] = useState(!isMobileView || !mobileToken);

  useEffect(() => {
    if (isMobileView && mobileToken) {
      // Listen for auth token stored event
      const handleAuthStored = () => {
        console.log('📱 Auth token stored, ready to load whiteboard');
        setAuthReady(true);
      };
      window.addEventListener('auth-token-stored', handleAuthStored);

      // Check if already stored
      if (localStorage.getItem('auth_token')) {
        setAuthReady(true);
      }

      return () => window.removeEventListener('auth-token-stored', handleAuthStored);
    }
  }, [isMobileView, mobileToken]);

  useEffect(() => {
    if (authReady) {
      loadWhiteboard();
    }
  }, [loadWhiteboard, authReady]);

  // Track if user is actively drawing/dragging
  const isActivelyEditingRef = useRef(false);
  const pendingCollabUpdateRef = useRef<readonly ExcalidrawElement[] | null>(null);

  // Sync mind map node positions from Excalidraw elements (when dragged)
  const syncMindMapPositions = useCallback((elements: readonly ExcalidrawElement[]) => {
    if (!isMindMapMode) return;

    const mm = mindMapRef.current;

    elements.forEach((el: ExcalidrawElement) => {
      // Check if this is a mind map rectangle
      if (el.id.startsWith('rect-mindmap-')) {
        const nodeId = el.id.replace('rect-', '');
        const node = mm.state.nodes.get(nodeId);

        // If position changed, update mind map state
        if (node && (node.x !== el.x || node.y !== el.y)) {
          mm.updateNodePosition(nodeId, el.x, el.y);
        }
      }
    });
  }, [isMindMapMode]);

  // Auto-save on changes
  const handleChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    if (!whiteboard || !workspaceId) return;

    // Check if user is actively drawing, dragging, or resizing
    // During active editing, we queue the update but don't send immediately
    // This prevents the "shaking" effect and ensures we send complete shapes
    const isActivelyEditing = !!(
      appState.draggingElement ||
      appState.resizingElement ||
      appState.editingElement ||
      appState.isResizing ||
      appState.isRotating ||
      appState.pendingImageElementId
    );

    if (isActivelyEditing) {
      // Store the latest elements but don't send yet
      isActivelyEditingRef.current = true;
      pendingCollabUpdateRef.current = elements;
    } else {
      // User finished editing - send the final state
      if (isActivelyEditingRef.current && pendingCollabUpdateRef.current) {
        // Send the final complete state
        updateElements(pendingCollabUpdateRef.current);

        // Sync mind map positions after drag completes
        if (isMindMapMode) {
          syncMindMapPositions(pendingCollabUpdateRef.current);
        }

        pendingCollabUpdateRef.current = null;
      }
      isActivelyEditingRef.current = false;

      // Also send current elements for non-editing changes (selection, etc.)
      updateElements(elements);
    }

    // Sync files (images) to other collaborators in real-time
    if (files && Object.keys(files).length > 0) {
      updateFiles(files);
    }

    // Debounce save to database
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        setSaveError(false);

        // Convert readonly array to regular array with spread
        const elementsArray = [...elements];

        await whiteboardApi.updateWhiteboard(workspaceId, whiteboard.id, {
          elements: elementsArray,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemFontFamily: appState.currentItemFontFamily,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          files,
        });
      } catch (error: any) {
        console.error('Auto-save failed:', error);
        setSaveError(true);

        // If whiteboard not found (404), redirect to whiteboard list
        if (error?.response?.status === 404 || error?.message?.includes('not found')) {
          toast.error(formatMessage({ id: 'whiteboard.error.notFound' }));
          // Clear the whiteboard state to prevent further save attempts
          setWhiteboard(null);
          // Redirect to whiteboard list
          navigate(`/workspaces/${workspaceId}/more/whiteboard`);
        }
      } finally {
        setSaving(false);
      }
    }, 2000); // Save 2 seconds after last change
  }, [whiteboard, workspaceId, updateElements, updateFiles, isMindMapMode, syncMindMapPositions]);

  // Manual save
  const handleSave = async () => {
    if (!whiteboard || !workspaceId || !excalidrawApiRef.current) return;

    try {
      setSaving(true);
      setSaveError(false);
      const elements = excalidrawApiRef.current.getSceneElements();
      const appState = excalidrawApiRef.current.getAppState();
      const files = excalidrawApiRef.current.getFiles();

      console.log('Manual save, elements count:', elements.length);
      const result = await whiteboardApi.updateWhiteboard(workspaceId, whiteboard.id, {
        elements: elements as ExcalidrawElement[],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        files,
      });
      console.log('Manual save successful, saved elements:', result.elements?.length || 0);

      toast.success(formatMessage({ id: 'whiteboard.success.saved' }));
    } catch (error) {
      console.error('Manual save failed:', error);
      setSaveError(true);
      toast.error(formatMessage({ id: 'whiteboard.error.saveFailed' }));
    } finally {
      setSaving(false);
    }
  };

  // Create new whiteboard
  const handleCreateWhiteboard = async () => {
    if (!workspaceId || !newWhiteboardName.trim()) return;

    try {
      const newWhiteboard = await whiteboardApi.createWhiteboard(workspaceId, {
        name: newWhiteboardName.trim(),
        elements: [],
      });

      setShowNewDialog(false);
      setNewWhiteboardName('');
      navigate(`/workspaces/${workspaceId}/whiteboard/${newWhiteboard.id}`);
      toast.success(formatMessage({ id: 'whiteboard.success.created' }));
    } catch (error) {
      toast.error(formatMessage({ id: 'whiteboard.error.createFailed' }));
    }
  };

  // Delete whiteboard
  const handleDeleteWhiteboard = async () => {
    if (!whiteboard || !workspaceId) return;

    try {
      await whiteboardApi.deleteWhiteboard(workspaceId, whiteboard.id);
      setShowDeleteDialog(false);
      navigate(`/workspaces/${workspaceId}/more/whiteboard`);
      toast.success(formatMessage({ id: 'whiteboard.success.deleted' }));
    } catch (error) {
      toast.error(formatMessage({ id: 'whiteboard.error.deleteFailed' }));
    }
  };

  // Export functions
  const handleExportPNG = async () => {
    if (!excalidrawApiRef.current) return;

    try {
      const elements = excalidrawApiRef.current.getSceneElements();
      const appState = excalidrawApiRef.current.getAppState();
      const files = excalidrawApiRef.current.getFiles();

      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: isDarkMode },
        files,
        mimeType: 'image/png',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${whiteboard?.name || formatMessage({ id: 'whiteboard.defaultName' })}.png`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(formatMessage({ id: 'whiteboard.success.exportedPNG' }));
    } catch (error) {
      toast.error(formatMessage({ id: 'whiteboard.error.exportFailed' }));
    }
  };

  const handleExportSVG = async () => {
    if (!excalidrawApiRef.current) return;

    try {
      const elements = excalidrawApiRef.current.getSceneElements();
      const appState = excalidrawApiRef.current.getAppState();
      const files = excalidrawApiRef.current.getFiles();

      const svg = await exportToSvg({
        elements,
        appState: { ...appState, exportWithDarkMode: isDarkMode },
        files,
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${whiteboard?.name || formatMessage({ id: 'whiteboard.defaultName' })}.svg`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(formatMessage({ id: 'whiteboard.success.exportedSVG' }));
    } catch (error) {
      toast.error(formatMessage({ id: 'whiteboard.error.exportFailed' }));
    }
  };

  // Share whiteboard - now handled by WhiteboardShareModal

  // Handle canvas click in mind map mode
  const handleMindMapCanvasClick = useCallback((x: number, y: number) => {
    if (!isMindMapMode) return;

    // Use ref to get latest state
    const mm = mindMapRef.current;
    const nodesCount = mm.state.nodes.size;

    // Check if clicked on existing node
    const clickedNodeId = mm.findNodeAtPosition(x, y);

    if (clickedNodeId) {
      // Select the clicked node
      mm.selectNode(clickedNodeId);
    } else if (nodesCount === 0) {
      // No nodes yet, create root node on first click
      mm.addRootNode();
    } else {
      // Clicked on empty space - deselect current node
      mm.selectNode(null);
    }
  }, [isMindMapMode]);

  // Create sticky note at position
  const createStickyNote = useCallback((x: number, y: number) => {
    if (!excalidrawApiRef.current) return;

    const noteId = `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const shadowId = `sticky-shadow-${noteId}`;
    const textId = `sticky-text-${noteId}`;
    const groupId = `sticky-group-${noteId}`;
    const noteWidth = 200;
    const noteHeight = 150;
    const shadowOffset = 4; // Shadow offset for elevated effect
    const now = Date.now();

    // Create shadow rectangle (behind the note for elevated effect)
    const shadow = {
      id: shadowId,
      type: 'rectangle',
      x: x - noteWidth / 2 + shadowOffset,
      y: y - noteHeight / 2 + shadowOffset,
      width: noteWidth,
      height: noteHeight,
      angle: 0,
      strokeColor: 'transparent',
      backgroundColor: '#00000020', // Semi-transparent black
      fillStyle: 'solid',
      strokeWidth: 0,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [groupId],
      frameId: null,
      roundness: { type: 3, value: 8 },
      seed: Math.floor(Math.random() * 2000000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2000000000),
      isDeleted: false,
      boundElements: null,
      updated: now,
      link: null,
      locked: false,
    };

    // Create rectangle (sticky note background)
    const rect = {
      id: noteId,
      type: 'rectangle',
      x: x - noteWidth / 2,
      y: y - noteHeight / 2,
      width: noteWidth,
      height: noteHeight,
      angle: 0,
      strokeColor: '#00000015', // Subtle border
      backgroundColor: stickyNoteColor,
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [groupId],
      frameId: null,
      roundness: { type: 3, value: 8 },
      seed: Math.floor(Math.random() * 2000000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2000000000),
      isDeleted: false,
      boundElements: [{ id: textId, type: 'text' }],
      updated: now,
      link: null,
      locked: false,
    };

    // Create text element
    const text = {
      id: textId,
      type: 'text',
      x: x - noteWidth / 2 + 10,
      y: y - noteHeight / 2 + 10,
      width: noteWidth - 20,
      height: 24,
      angle: 0,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [groupId],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 2000000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2000000000),
      isDeleted: false,
      boundElements: null,
      updated: now,
      link: null,
      locked: false,
      text: formatMessage({ id: 'whiteboard.stickyNote.clickToEdit' }),
      fontSize: 16,
      fontFamily: 1,
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: noteId,
      originalText: formatMessage({ id: 'whiteboard.stickyNote.clickToEdit' }),
      lineHeight: 1.25,
    };

    // Add to canvas (shadow first, then note, then text - order matters for layering)
    const currentElements = excalidrawApiRef.current.getSceneElements();
    excalidrawApiRef.current.updateScene({
      elements: [...currentElements, shadow, rect, text],
    });

    // Switch to selection tool after creating
    excalidrawApiRef.current.setActiveTool({ type: 'selection' });
    setActiveTool('selection');
  }, [stickyNoteColor]);

  // Handle pointer movement for collaboration and mind map
  const lastPointerDownRef = useRef<number>(0);
  const handlePointerUpdate = useCallback((payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => {
    updatePointer(payload.pointer.x, payload.pointer.y, undefined, payload.button === 'down');

    const now = Date.now();
    // Debounce clicks to prevent double-firing
    if (payload.button === 'down' && now - lastPointerDownRef.current > 300) {
      lastPointerDownRef.current = now;

      // Handle mind map mode clicks
      if (isMindMapMode) {
        handleMindMapCanvasClick(payload.pointer.x, payload.pointer.y);
      }
    }
  }, [updatePointer, isMindMapMode, handleMindMapCanvasClick]);

  // Add sticky note at center of viewport
  const handleAddStickyNote = useCallback(() => {
    if (!excalidrawApiRef.current) return;

    const appState = excalidrawApiRef.current.getAppState();
    // Calculate center of visible viewport
    const centerX = (-appState.scrollX + window.innerWidth / 2) / appState.zoom.value;
    const centerY = (-appState.scrollY + window.innerHeight / 2) / appState.zoom.value;

    createStickyNote(centerX, centerY);
  }, [createStickyNote]);

  // Change tool in Excalidraw
  const handleToolChange = useCallback((tool: string) => {
    if (!excalidrawApiRef.current) return;
    setActiveTool(tool);
    excalidrawApiRef.current.setActiveTool({ type: tool });
  }, []);

  // Toggle lock
  const handleToggleLock = useCallback(() => {
    setIsLocked(!isLocked);
    // When locked, switch to hand tool for panning only
    if (!isLocked && excalidrawApiRef.current) {
      excalidrawApiRef.current.setActiveTool({ type: 'hand' });
      setActiveTool('hand');
    }
  }, [isLocked]);

  // Change canvas background color
  const handleBgColorChange = useCallback((color: string) => {
    setCanvasBgColor(color);
    if (excalidrawApiRef.current) {
      excalidrawApiRef.current.updateScene({
        appState: { viewBackgroundColor: color }
      });
    }
  }, []);

  // Mind map mode toggle
  const handleToggleMindMapMode = useCallback(() => {
    if (!isMindMapMode) {
      // Entering mind map mode - clear previous mind map and start fresh
      mindMap.clear();
      if (excalidrawApiRef.current) {
        excalidrawApiRef.current.setActiveTool({ type: 'selection' });
        setActiveTool('selection');
      }
    }
    setIsMindMapMode(prev => !prev);
  }, [isMindMapMode, mindMap]);

  // Track previous node count to detect add/delete
  const prevNodeCountRef = useRef(0);

  // Update Excalidraw with mind map elements (only for structural changes)
  const updateMindMapElements = useCallback((forceUpdate = false) => {
    if (!excalidrawApiRef.current || !isMindMapMode) return;

    const mm = mindMapRef.current;
    const currentNodeCount = mm.state.nodes.size;

    // Only update if node count changed (add/delete) or forced
    if (!forceUpdate && currentNodeCount === prevNodeCountRef.current && currentNodeCount > 0) {
      return;
    }
    prevNodeCountRef.current = currentNodeCount;

    const mindMapElements = mm.toExcalidrawElements();
    const currentElements = excalidrawApiRef.current.getSceneElements() as ExcalidrawElement[];

    // Filter out old mind map elements and add new ones
    const nonMindMapElements = currentElements.filter(
      (el: ExcalidrawElement) => !el.id.startsWith('rect-mindmap-') &&
                                 !el.id.startsWith('text-mindmap-') &&
                                 !el.id.startsWith('arrow-mindmap-')
    );

    const newElements = [...nonMindMapElements, ...mindMapElements];
    excalidrawApiRef.current.updateScene({ elements: newElements });
  }, [isMindMapMode]);

  // Update mind map elements when nodes are added/deleted
  useEffect(() => {
    if (isMindMapMode) {
      const mm = mindMapRef.current;
      const currentCount = mm.state.nodes.size;

      // Force update when entering mind map mode or when node count changes
      if (currentCount !== prevNodeCountRef.current || currentCount === 0) {
        updateMindMapElements(true);
      }
    }
  }, [isMindMapMode, mindMap.state.nodes.size, updateMindMapElements]);

  // Handle mind map keyboard shortcuts
  useEffect(() => {
    if (!isMindMapMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Use ref to get latest state at event time
      const mm = mindMapRef.current;
      const selectedId = mm.state.selectedNodeId;
      const nodesCount = mm.state.nodes.size;

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          if (selectedId) {
            mm.addChildNode(selectedId);
          } else if (nodesCount === 0) {
            mm.addRootNode();
          }
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (selectedId) {
            mm.addSiblingNode(selectedId);
          } else if (nodesCount === 0) {
            mm.addRootNode();
          }
          break;
        case 'Delete':
        case 'Backspace':
          // In mind map mode, always handle delete to prevent Excalidraw from deleting elements
          e.preventDefault();
          e.stopPropagation();
          if (selectedId) {
            mm.deleteNode(selectedId);
          }
          break;
        case 'Escape':
          mm.selectNode(null);
          break;
      }
    };

    // Use capture phase to intercept before Excalidraw handles the event
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isMindMapMode]);

  // Tool definitions for custom toolbar
  const tools = [
    { id: 'lock', icon: isLocked ? Lock : Unlock, label: isLocked ? formatMessage({ id: 'whiteboard.tools.unlock' }) : formatMessage({ id: 'whiteboard.tools.lock' }), action: handleToggleLock },
    { id: 'hand', icon: Hand, label: formatMessage({ id: 'whiteboard.tools.hand' }), tool: 'hand' },
    { id: 'selection', icon: MousePointer2, label: formatMessage({ id: 'whiteboard.tools.select' }), tool: 'selection' },
    { id: 'rectangle', icon: Square, label: formatMessage({ id: 'whiteboard.tools.rectangle' }), tool: 'rectangle' },
    { id: 'diamond', icon: Diamond, label: formatMessage({ id: 'whiteboard.tools.diamond' }), tool: 'diamond' },
    { id: 'ellipse', icon: Circle, label: formatMessage({ id: 'whiteboard.tools.ellipse' }), tool: 'ellipse' },
    { id: 'arrow', icon: ArrowRight, label: formatMessage({ id: 'whiteboard.tools.arrow' }), tool: 'arrow' },
    { id: 'line', icon: Minus, label: formatMessage({ id: 'whiteboard.tools.line' }), tool: 'line' },
    { id: 'freedraw', icon: Pencil, label: formatMessage({ id: 'whiteboard.tools.draw' }), tool: 'freedraw' },
    { id: 'text', icon: Type, label: formatMessage({ id: 'whiteboard.tools.text' }), tool: 'text' },
    { id: 'image', icon: Image, label: formatMessage({ id: 'whiteboard.tools.image' }), tool: 'image' },
    { id: 'eraser', icon: Eraser, label: formatMessage({ id: 'whiteboard.tools.eraser' }), tool: 'eraser' },
  ];

  // Note: WebSocket collaboration is now handled by useWhiteboardCollaboration hook

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{formatMessage({ id: 'whiteboard.loading' })}</p>
        </div>
      </div>
    );
  }

  // No workspaceId - show error
  if (!workspaceId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-destructive text-lg font-semibold mb-2">{formatMessage({ id: 'whiteboard.error.missingWorkspaceId' })}</div>
        <div className="text-muted-foreground text-sm text-center">
          {formatMessage({ id: 'whiteboard.error.couldNotExtractWorkspaceId' })}
        </div>
      </div>
    );
  }

  // No whiteboard loaded, show dialogs or mobile list
  if (!whiteboard && !whiteboardId) {
    // For mobile view, show a full-screen list instead of dialogs
    if (isMobileView) {
      return (
        <div className="h-screen flex flex-col bg-background">
          <div className="p-4 border-b">
            <h1 className="text-xl font-semibold">{formatMessage({ id: 'whiteboard.title' })}</h1>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {whiteboards.length > 0 ? (
              <div className="space-y-3">
                {whiteboards.map((wb) => (
                  <button
                    key={wb.id}
                    className="w-full p-4 text-left rounded-lg border bg-card hover:bg-accent transition-colors"
                    onClick={() => {
                      // Navigate with mobile params preserved
                      window.location.href = `${window.location.origin}/workspaces/${workspaceId}/whiteboard/${wb.id}?mobile=true&token=${mobileToken}`;
                    }}
                  >
                    <div className="font-medium">{wb.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatMessage({ id: 'whiteboard.updated' })} {new Date(wb.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {formatMessage({ id: 'whiteboard.noWhiteboardsYet' })}
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <Button
              className="w-full"
              onClick={() => {
                // Auto-create with default name for mobile
                const name = formatMessage({ id: 'whiteboard.defaultNameWithDate' }, { date: new Date().toLocaleDateString() });
                whiteboardApi.createWhiteboard(workspaceId!, { name, elements: [] })
                  .then((newWb) => {
                    window.location.href = `${window.location.origin}/workspaces/${workspaceId}/whiteboard/${newWb.id}?mobile=true&token=${mobileToken}`;
                  })
                  .catch((err) => {
                    console.error('Failed to create whiteboard:', err);
                    toast.error(formatMessage({ id: 'whiteboard.error.createFailed' }));
                  });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {formatMessage({ id: 'whiteboard.newWhiteboard' })}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* New Whiteboard Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formatMessage({ id: 'whiteboard.dialog.createNew' })}</DialogTitle>
              <DialogDescription>{formatMessage({ id: 'whiteboard.dialog.enterName' })}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="name">{formatMessage({ id: 'whiteboard.dialog.name' })}</Label>
              <Input
                id="name"
                value={newWhiteboardName}
                onChange={(e) => setNewWhiteboardName(e.target.value)}
                placeholder={formatMessage({ id: 'whiteboard.dialog.namePlaceholder' })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWhiteboard()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => navigate(-1)}>{formatMessage({ id: 'common.cancel' })}</Button>
              <Button onClick={handleCreateWhiteboard} disabled={!newWhiteboardName.trim()}>{formatMessage({ id: 'whiteboard.dialog.create' })}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Open Whiteboard Dialog */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{formatMessage({ id: 'whiteboard.dialog.open' })}</DialogTitle>
              <DialogDescription>{formatMessage({ id: 'whiteboard.dialog.selectOrCreate' })}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2 py-4">
                {whiteboards.map((wb) => (
                  <button
                    key={wb.id}
                    className="w-full p-3 text-left rounded-lg border hover:bg-accent transition-colors"
                    onClick={() => {
                      setShowOpenDialog(false);
                      navigate(`/workspaces/${workspaceId}/whiteboard/${wb.id}`);
                    }}
                  >
                    <div className="font-medium">{wb.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatMessage({ id: 'whiteboard.updated' })} {new Date(wb.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => navigate(-1)}>{formatMessage({ id: 'common.cancel' })}</Button>
              <Button onClick={() => { setShowOpenDialog(false); setShowNewDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                {formatMessage({ id: 'whiteboard.newWhiteboard' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Floating button to show header when hidden (not in mobile view) */}
      {!showHeader && !isMobileView && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed top-2 left-2 z-[9999] shadow-lg"
          onClick={() => setShowHeader(true)}
        >
          <ArrowLeft className="w-4 h-4 mr-1 rotate-90" />
          {formatMessage({ id: 'whiteboard.showMenu' })}
        </Button>
      )}

      {/* Header */}
      {showHeader && (
      <div className="h-14 min-h-[56px] border-b bg-background flex items-center justify-between px-4 relative z-[9999] shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/workspaces/${workspaceId}/more`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{whiteboard?.name || formatMessage({ id: 'whiteboard.defaultName' })}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {saving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> {formatMessage({ id: 'whiteboard.status.saving' })}</>
              ) : saveError ? (
                <span className="text-destructive">{formatMessage({ id: 'whiteboard.status.failedToSave' })}</span>
              ) : (
                <span>{formatMessage({ id: 'whiteboard.status.allChangesSaved' })}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborators */}
          {collabUsers.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{collabUsers.length}</span>
              {isCollabConnected && (
                <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
              )}
            </div>
          )}

          {/* Grid toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? formatMessage({ id: 'whiteboard.hideGrid' }) : formatMessage({ id: 'whiteboard.showGrid' })}
          >
            <Grid3X3 className={`w-4 h-4 ${showGrid ? '' : 'opacity-50'}`} />
          </Button>

          {/* Canvas background color */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title={formatMessage({ id: 'whiteboard.canvasBackground' })}>
                <div className="relative">
                  <Palette className="w-4 h-4" />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                    style={{ backgroundColor: canvasBgColor }}
                  />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-2">
              <div className="grid grid-cols-4 gap-1">
                {bgColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                      canvasBgColor === color ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleBgColorChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Open */}
          <Button variant="ghost" size="icon" onClick={async () => {
            const list = await whiteboardApi.getWhiteboards(workspaceId!);
            setWhiteboards(list);
            setShowOpenDialog(true);
          }}>
            <FolderOpen className="w-4 h-4" />
          </Button>

          {/* Save */}
          <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPNG}>{formatMessage({ id: 'whiteboard.export.png' })}</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSVG}>{formatMessage({ id: 'whiteboard.export.svg' })}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share */}
          <Button variant="ghost" size="icon" onClick={() => setShowShareDialog(true)}>
            <Share2 className="w-4 h-4" />
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setNewWhiteboardName(''); setShowNewDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                {formatMessage({ id: 'whiteboard.newWhiteboard' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(initialData));
                toast.success(formatMessage({ id: 'whiteboard.success.copiedToClipboard' }));
              }}>
                <Copy className="w-4 h-4 mr-2" />
                {formatMessage({ id: 'whiteboard.copyData' })}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                {formatMessage({ id: 'whiteboard.deleteWhiteboard' })}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowHeader(false)}>
                <Minus className="w-4 h-4 mr-2" />
                {formatMessage({ id: 'whiteboard.hideMenuBar' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      )}

      {/* Excalidraw Canvas */}
      <div className="flex-1 w-full h-full relative" style={{ minHeight: isMobileView ? '100vh' : 'calc(100vh - 56px)' }}>
        {/* Custom Toolbar - positioned at bottom for mobile */}
        <div className={`absolute z-10 flex items-center gap-1 bg-background/95 backdrop-blur border rounded-lg p-1.5 shadow-lg ${
          isMobileView
            ? 'bottom-4 left-1/2 -translate-x-1/2 max-w-[95vw] overflow-x-auto'
            : 'top-4 left-1/2 -translate-x-1/2'
        }`}>
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isActive = tool.tool ? activeTool === tool.tool : false;
            return (
              <div key={tool.id} className="flex items-center">
                {index === 1 && <div className="w-px h-6 bg-border mx-1" />}
                {index === 3 && <div className="w-px h-6 bg-border mx-1" />}
                {index === 8 && <div className="w-px h-6 bg-border mx-1" />}
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => tool.action ? tool.action() : tool.tool && handleToolChange(tool.tool)}
                  title={tool.label}
                  disabled={isLocked && !!tool.tool && tool.tool !== 'hand'}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {/* Header toggle - hidden in mobile view */}
          {!isMobileView && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant={showHeader ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHeader(!showHeader)}
                title={showHeader ? formatMessage({ id: 'whiteboard.hideHeader' }) : formatMessage({ id: 'whiteboard.showHeader' })}
              >
                <PanelTop className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* Mind Map toggle */}
          <Button
            variant={isMindMapMode ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={handleToggleMindMapMode}
            title={isMindMapMode ? formatMessage({ id: 'whiteboard.mindMap.exit' }) : formatMessage({ id: 'whiteboard.mindMap.mode' })}
          >
            <GitBranch className="h-4 w-4" />
          </Button>
          {/* Sticky Note with color picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={formatMessage({ id: 'whiteboard.stickyNote.add' })}
              >
                <div className="relative">
                  <StickyNote className="h-4 w-4" />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                    style={{ backgroundColor: stickyNoteColor }}
                  />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="p-2">
              <div className="text-xs text-muted-foreground mb-2 text-center">{formatMessage({ id: 'whiteboard.stickyNote.selectColor' })}</div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {stickyNoteColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                      stickyNoteColor === color ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setStickyNoteColor(color)}
                    title={color}
                  />
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAddStickyNote} className="justify-center">
                <Plus className="h-4 w-4 mr-2" />
                {formatMessage({ id: 'whiteboard.stickyNote.add' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mind Map mode info - positioned based on mobile view */}
        {isMindMapMode && (
          <div className={`absolute left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg ${
            isMobileView ? 'top-4' : 'top-16'
          }`}>
            {isMobileView ? formatMessage({ id: 'whiteboard.mindMap.modeShort' }) : formatMessage({ id: 'whiteboard.mindMap.instructions' })}
          </div>
        )}

        {initialData && (
          <Excalidraw
            excalidrawAPI={onExcalidrawApiReady}
            initialData={initialData}
            onChange={handleChange}
            onPointerUpdate={handlePointerUpdate}
            theme={isDarkMode ? 'dark' : 'light'}
            isCollaborating={isCollabConnected}
            gridModeEnabled={showGrid}
            langCode={intl.locale === 'ja' ? 'ja-JP' : 'en'}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                export: false,
                saveToActiveFile: false,
              },
            }}
          >
            {/* Hide toolbar and Excalidraw links section */}
            <style>{`
              .excalidraw .App-toolbar { display: none !important; }
              .excalidraw .App-toolbar-container { display: none !important; }
              .excalidraw .dropdown-menu-group[aria-labelledby*="link"] { display: none !important; }
              .excalidraw .dropdown-menu-group__title:has-text("Excalidraw") { display: none !important; }
              .excalidraw div:has(> a[target="_blank"][rel*="noreferrer"]) { display: none !important; }
              .excalidraw .socials { display: none !important; }
              .excalidraw button[aria-label*="GitHub"],
              .excalidraw button[aria-label*="Discord"],
              .excalidraw button[aria-label*="Twitter"],
              .excalidraw button[aria-label*="Follow"] { display: none !important; }
              .excalidraw .dropdown-menu-group__title { display: none !important; }
              .excalidraw a[target="_blank"] { display: none !important; }
            `}</style>
          </Excalidraw>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formatMessage({ id: 'whiteboard.dialog.createNew' })}</DialogTitle>
            <DialogDescription>{formatMessage({ id: 'whiteboard.dialog.enterName' })}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-name">{formatMessage({ id: 'whiteboard.dialog.name' })}</Label>
            <Input
              id="new-name"
              value={newWhiteboardName}
              onChange={(e) => setNewWhiteboardName(e.target.value)}
              placeholder={formatMessage({ id: 'whiteboard.dialog.namePlaceholder' })}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWhiteboard()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>{formatMessage({ id: 'common.cancel' })}</Button>
            <Button onClick={handleCreateWhiteboard} disabled={!newWhiteboardName.trim()}>{formatMessage({ id: 'whiteboard.dialog.create' })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formatMessage({ id: 'whiteboard.dialog.open' })}</DialogTitle>
            <DialogDescription>{formatMessage({ id: 'whiteboard.dialog.select' })}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 py-4">
              {whiteboards.map((wb) => (
                <button
                  key={wb.id}
                  className="w-full p-3 text-left rounded-lg border hover:bg-accent transition-colors"
                  onClick={() => {
                    setShowOpenDialog(false);
                    navigate(`/workspaces/${workspaceId}/whiteboard/${wb.id}`);
                  }}
                >
                  <div className="font-medium">{wb.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatMessage({ id: 'whiteboard.updated' })} {new Date(wb.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>{formatMessage({ id: 'common.cancel' })}</Button>
            <Button onClick={() => { setShowOpenDialog(false); setShowNewDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {formatMessage({ id: 'whiteboard.newWhiteboard' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Whiteboard Share Modal */}
      <WhiteboardShareModal
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        whiteboardId={whiteboard?.id || ''}
        whiteboardName={whiteboard?.name || 'Whiteboard'}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{formatMessage({ id: 'whiteboard.dialog.deleteTitle' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {formatMessage({ id: 'whiteboard.dialog.deleteDescription' }, { name: whiteboard?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWhiteboard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {formatMessage({ id: 'common.delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default WhiteboardPage;
