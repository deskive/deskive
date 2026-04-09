import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';

// Types
export interface MindMapNode {
  id: string;
  text: string;
  parentId: string | null;
  children: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MindMapState {
  nodes: Map<string, MindMapNode>;
  rootId: string | null;
  selectedNodeId: string | null;
}

// Layout constants
const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;
const HORIZONTAL_SPACING = 200; // Space between levels
const VERTICAL_SPACING = 80; // Space between siblings

// Excalidraw element types (simplified)
interface ExcalidrawRectangle {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: { type: number; value: number };
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: { id: string; type: string }[] | null;
  updated: number;
  link: null;
  locked: boolean;
}

interface ExcalidrawText {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
  text: string;
  fontSize: number;
  fontFamily: number;
  textAlign: string;
  verticalAlign: string;
  containerId: string | null;
  originalText: string;
  lineHeight: number;
}

interface ExcalidrawArrow {
  id: string;
  type: 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: { type: number };
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
  points: [number, number][];
  lastCommittedPoint: null;
  startBinding: { elementId: string; focus: number; gap: number } | null;
  endBinding: { elementId: string; focus: number; gap: number } | null;
  startArrowhead: null;
  endArrowhead: string;
}

type ExcalidrawElement = ExcalidrawRectangle | ExcalidrawText | ExcalidrawArrow;

// Helper to generate random seed for Excalidraw
const generateSeed = () => Math.floor(Math.random() * 2000000000);
const generateNonce = () => Math.floor(Math.random() * 2000000000);

export function useMindMap() {
  const [state, setState] = useState<MindMapState>({
    nodes: new Map(),
    rootId: null,
    selectedNodeId: null,
  });

  const versionRef = useRef(1);

  // Calculate subtree height for layout
  const calculateSubtreeHeight = useCallback((nodeId: string, nodes: Map<string, MindMapNode>): number => {
    const node = nodes.get(nodeId);
    if (!node) return NODE_HEIGHT;

    if (node.children.length === 0) {
      return NODE_HEIGHT;
    }

    let totalHeight = 0;
    node.children.forEach((childId, index) => {
      totalHeight += calculateSubtreeHeight(childId, nodes);
      if (index < node.children.length - 1) {
        totalHeight += VERTICAL_SPACING;
      }
    });

    return Math.max(NODE_HEIGHT, totalHeight);
  }, []);

  // Layout algorithm - horizontal left-to-right
  const layoutNodes = useCallback((nodes: Map<string, MindMapNode>, rootId: string | null): Map<string, MindMapNode> => {
    if (!rootId) return nodes;

    const updatedNodes = new Map(nodes);

    const layoutNode = (nodeId: string, x: number, y: number, availableHeight: number) => {
      const node = updatedNodes.get(nodeId);
      if (!node) return;

      // Position this node
      const updatedNode = {
        ...node,
        x,
        y: y + (availableHeight - NODE_HEIGHT) / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
      updatedNodes.set(nodeId, updatedNode);

      // Layout children
      if (node.children.length > 0) {
        const childX = x + NODE_WIDTH + HORIZONTAL_SPACING;
        let currentY = y;

        node.children.forEach((childId) => {
          const childHeight = calculateSubtreeHeight(childId, nodes);
          layoutNode(childId, childX, currentY, childHeight);
          currentY += childHeight + VERTICAL_SPACING;
        });
      }
    };

    // Start layout from root
    const rootNode = updatedNodes.get(rootId);
    if (rootNode) {
      const totalHeight = calculateSubtreeHeight(rootId, nodes);
      const startY = 200; // Some padding from top
      const startX = 100; // Some padding from left
      layoutNode(rootId, startX, startY, totalHeight);
    }

    return updatedNodes;
  }, [calculateSubtreeHeight]);

  // Add root node
  const addRootNode = useCallback((text: string = 'Main Topic') => {
    const nodeId = `mindmap-${nanoid(8)}`;
    const newNode: MindMapNode = {
      id: nodeId,
      text,
      parentId: null,
      children: [],
      x: 100,
      y: 300,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };

    setState(prev => {
      const newNodes = new Map(prev.nodes);
      newNodes.set(nodeId, newNode);
      return {
        nodes: newNodes,
        rootId: nodeId,
        selectedNodeId: nodeId,
      };
    });

    return nodeId;
  }, []);

  // Add child node
  const addChildNode = useCallback((parentId: string, text: string = 'New Topic') => {
    const nodeId = `mindmap-${nanoid(8)}`;

    setState(prev => {
      const parentNode = prev.nodes.get(parentId);
      if (!parentNode) return prev;

      const newNode: MindMapNode = {
        id: nodeId,
        text,
        parentId,
        children: [],
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };

      const newNodes = new Map(prev.nodes);

      // Update parent's children
      const updatedParent = {
        ...parentNode,
        children: [...parentNode.children, nodeId],
      };
      newNodes.set(parentId, updatedParent);
      newNodes.set(nodeId, newNode);

      // Re-layout all nodes
      const layoutedNodes = layoutNodes(newNodes, prev.rootId);

      return {
        nodes: layoutedNodes,
        rootId: prev.rootId,
        selectedNodeId: nodeId,
      };
    });

    return nodeId;
  }, [layoutNodes]);

  // Add sibling node
  const addSiblingNode = useCallback((nodeId: string, text: string = 'New Topic') => {
    setState(prev => {
      const node = prev.nodes.get(nodeId);
      if (!node || !node.parentId) {
        // If no parent, this is root - can't add sibling
        return prev;
      }

      const parentNode = prev.nodes.get(node.parentId);
      if (!parentNode) return prev;

      const newNodeId = `mindmap-${nanoid(8)}`;
      const newNode: MindMapNode = {
        id: newNodeId,
        text,
        parentId: node.parentId,
        children: [],
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };

      const newNodes = new Map(prev.nodes);

      // Add new node after current node in parent's children
      const nodeIndex = parentNode.children.indexOf(nodeId);
      const newChildren = [...parentNode.children];
      newChildren.splice(nodeIndex + 1, 0, newNodeId);

      const updatedParent = {
        ...parentNode,
        children: newChildren,
      };
      newNodes.set(node.parentId, updatedParent);
      newNodes.set(newNodeId, newNode);

      // Re-layout all nodes
      const layoutedNodes = layoutNodes(newNodes, prev.rootId);

      return {
        nodes: layoutedNodes,
        rootId: prev.rootId,
        selectedNodeId: newNodeId,
      };
    });
  }, [layoutNodes]);

  // Delete node and its children
  const deleteNode = useCallback((nodeId: string) => {
    setState(prev => {
      const node = prev.nodes.get(nodeId);
      if (!node) return prev;

      // Can't delete root if it's the only node
      if (nodeId === prev.rootId && prev.nodes.size === 1) {
        return prev;
      }

      const newNodes = new Map(prev.nodes);

      // Recursively delete children
      const deleteRecursive = (id: string) => {
        const n = newNodes.get(id);
        if (n) {
          n.children.forEach(deleteRecursive);
          newNodes.delete(id);
        }
      };
      deleteRecursive(nodeId);

      // Update parent's children
      if (node.parentId) {
        const parentNode = newNodes.get(node.parentId);
        if (parentNode) {
          const updatedParent = {
            ...parentNode,
            children: parentNode.children.filter(id => id !== nodeId),
          };
          newNodes.set(node.parentId, updatedParent);
        }
      }

      // Re-layout
      const newRootId = nodeId === prev.rootId ? null : prev.rootId;
      const layoutedNodes = newRootId ? layoutNodes(newNodes, newRootId) : newNodes;

      // Select parent or sibling
      let newSelectedId: string | null = node.parentId;
      if (!newSelectedId && newNodes.size > 0) {
        newSelectedId = newNodes.keys().next().value ?? null;
      }

      return {
        nodes: layoutedNodes,
        rootId: newRootId,
        selectedNodeId: newSelectedId || null,
      };
    });
  }, [layoutNodes]);

  // Update node text
  const updateNodeText = useCallback((nodeId: string, text: string) => {
    setState(prev => {
      const node = prev.nodes.get(nodeId);
      if (!node) return prev;

      const newNodes = new Map(prev.nodes);
      newNodes.set(nodeId, { ...node, text });

      return {
        ...prev,
        nodes: newNodes,
      };
    });
  }, []);

  // Update node position (when dragged in Excalidraw)
  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setState(prev => {
      const node = prev.nodes.get(nodeId);
      if (!node) return prev;

      const newNodes = new Map(prev.nodes);
      newNodes.set(nodeId, { ...node, x, y });

      return {
        ...prev,
        nodes: newNodes,
      };
    });
  }, []);

  // Select node
  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
    }));
  }, []);

  // Find node at position with tolerance for easier clicking
  const findNodeAtPosition = useCallback((x: number, y: number): string | null => {
    const tolerance = 10; // Extra pixels around node for easier clicking
    for (const [nodeId, node] of state.nodes) {
      if (
        x >= node.x - tolerance &&
        x <= node.x + node.width + tolerance &&
        y >= node.y - tolerance &&
        y <= node.y + node.height + tolerance
      ) {
        return nodeId;
      }
    }
    return null;
  }, [state.nodes]);

  // Convert mind map to Excalidraw elements
  const toExcalidrawElements = useCallback((): ExcalidrawElement[] => {
    const elements: ExcalidrawElement[] = [];
    const now = Date.now();
    versionRef.current++;

    // Create elements for each node
    state.nodes.forEach((node) => {
      const isSelected = node.id === state.selectedNodeId;
      const rectId = `rect-${node.id}`;
      const textId = `text-${node.id}`;
      const groupId = `group-${node.id}`; // Group rect and text together

      // Rectangle element
      const rect: ExcalidrawRectangle = {
        id: rectId,
        type: 'rectangle',
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        angle: 0,
        strokeColor: isSelected ? '#1971c2' : '#495057',
        backgroundColor: isSelected ? '#a5d8ff' : '#e9ecef',
        fillStyle: 'solid',
        strokeWidth: isSelected ? 2 : 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3, value: 10 },
        seed: generateSeed(),
        version: versionRef.current,
        versionNonce: generateNonce(),
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
      };
      elements.push(rect);

      // Text element - position at center of rectangle, grouped with rect
      const fontSize = 16;
      const textHeight = fontSize * 1.25;
      const text: ExcalidrawText = {
        id: textId,
        type: 'text',
        x: node.x + node.width / 2 - (node.text.length * fontSize * 0.3),
        y: node.y + node.height / 2 - textHeight / 2,
        width: node.text.length * fontSize * 0.6,
        height: textHeight,
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
        seed: generateSeed(),
        version: versionRef.current,
        versionNonce: generateNonce(),
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
        text: node.text,
        fontSize,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: null,
        originalText: node.text,
        lineHeight: 1.25,
      };
      elements.push(text);

      // Arrow from parent to this node
      if (node.parentId) {
        const parent = state.nodes.get(node.parentId);
        if (parent) {
          const arrowId = `arrow-${node.parentId}-${node.id}`;
          const startX = parent.x + parent.width;
          const startY = parent.y + parent.height / 2;
          const endX = node.x;
          const endY = node.y + node.height / 2;

          const arrow: ExcalidrawArrow = {
            id: arrowId,
            type: 'arrow',
            x: startX,
            y: startY,
            width: endX - startX,
            height: endY - startY,
            angle: 0,
            strokeColor: '#868e96',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: { type: 2 },
            seed: generateSeed(),
            version: versionRef.current,
            versionNonce: generateNonce(),
            isDeleted: false,
            boundElements: null,
            updated: now,
            link: null,
            locked: false,
            points: [[0, 0], [endX - startX, endY - startY]],
            lastCommittedPoint: null,
            startBinding: { elementId: `rect-${node.parentId}`, focus: 0, gap: 5 },
            endBinding: { elementId: rectId, focus: 0, gap: 5 },
            startArrowhead: null,
            endArrowhead: 'arrow',
          };
          elements.push(arrow);
        }
      }
    });

    return elements;
  }, [state.nodes, state.selectedNodeId]);

  // Clear mind map
  const clear = useCallback(() => {
    setState({
      nodes: new Map(),
      rootId: null,
      selectedNodeId: null,
    });
  }, []);

  // Check if mind map has nodes
  const hasNodes = state.nodes.size > 0;

  return {
    state,
    hasNodes,
    addRootNode,
    addChildNode,
    addSiblingNode,
    deleteNode,
    updateNodeText,
    updateNodePosition,
    selectNode,
    findNodeAtPosition,
    toExcalidrawElements,
    clear,
  };
}

export default useMindMap;
