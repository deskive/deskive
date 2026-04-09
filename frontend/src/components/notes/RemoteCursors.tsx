import { useEffect, useState } from 'react';
import type { CursorData, CollaborationUser } from '@/hooks/useNoteCollaboration';

interface RemoteCursorsProps {
  cursors: Map<string, CursorData>;
  users: CollaborationUser[];
  editorRef: React.RefObject<HTMLDivElement | null>;
  getQuillInstance?: () => any;
  currentUserId?: string;
}

interface CursorPosition {
  top: number;
  left: number;
  height: number;
}

/**
 * Component to render remote user cursors in the editor
 */
export function RemoteCursors({ cursors, users, editorRef, getQuillInstance, currentUserId }: RemoteCursorsProps) {
  const [cursorPositions, setCursorPositions] = useState<Map<string, CursorPosition>>(new Map());

  useEffect(() => {
    // Get cursor positions from the editor
    const updateCursorPositions = () => {
      if (!editorRef.current) return;

      const qlEditor = editorRef.current.querySelector('.ql-editor') as HTMLElement;
      if (!qlEditor) return;

      const newPositions = new Map<string, CursorPosition>();
      const quillEditor = getQuillInstance?.();

      if (!quillEditor) return;

      // Get the editor's bounding rect for offset calculation
      const editorRect = qlEditor.getBoundingClientRect();
      const containerRect = editorRef.current.getBoundingClientRect();

      cursors.forEach((cursor, userId) => {
        if (userId === currentUserId) return;

        try {
          // Get the position using Quill's getBounds method
          const bounds = quillEditor.getBounds(cursor.index, cursor.length || 0);
          if (bounds) {
            // Calculate position relative to the container
            // Account for scroll position and container offset
            const top = bounds.top + (editorRect.top - containerRect.top);
            const left = bounds.left + (editorRect.left - containerRect.left);

            newPositions.set(userId, {
              top,
              left,
              height: bounds.height || 20,
            });
          }
        } catch (error) {
          console.warn('Failed to get cursor bounds:', error);
        }
      });

      setCursorPositions(newPositions);
    };

    // Update immediately
    updateCursorPositions();

    // Set up interval to continuously update cursor positions
    const intervalId = setInterval(updateCursorPositions, 100);

    // Update positions on scroll
    const qlEditor = editorRef.current?.querySelector('.ql-editor');
    if (qlEditor) {
      qlEditor.addEventListener('scroll', updateCursorPositions);
    }

    return () => {
      clearInterval(intervalId);
      if (qlEditor) {
        qlEditor.removeEventListener('scroll', updateCursorPositions);
      }
    };
  }, [cursors, editorRef, getQuillInstance, currentUserId]);

  // Create a map of userId to user info for quick lookup
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="remote-cursors pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        if (userId === currentUserId) return null;

        const user = userMap.get(userId);
        const position = cursorPositions.get(userId);

        if (!position) return null;

        return (
          <div
            key={userId}
            className="remote-cursor absolute transition-all duration-100"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {/* Cursor line */}
            <div
              className="cursor-line w-0.5 animate-pulse"
              style={{
                backgroundColor: cursor.userColor,
                height: position.height || 20,
              }}
            />

            {/* Selection highlight */}
            {cursor.length && cursor.length > 0 && (
              <div
                className="cursor-selection absolute top-0 opacity-30"
                style={{
                  backgroundColor: cursor.userColor,
                  height: position.height || 20,
                  width: cursor.length * 8, // Approximate character width
                }}
              />
            )}

            {/* User name label */}
            <div
              className="cursor-label absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
              style={{
                backgroundColor: cursor.userColor,
              }}
            >
              {user?.name || cursor.userName || 'User'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Presence indicator showing active users
 */
interface PresenceIndicatorProps {
  users: CollaborationUser[];
  currentUserId?: string;
  maxDisplay?: number;
}

export function PresenceIndicator({ users, currentUserId, maxDisplay = 5 }: PresenceIndicatorProps) {
  // Filter out current user
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  if (otherUsers.length === 0) return null;

  const displayUsers = otherUsers.slice(0, maxDisplay);
  const remainingCount = otherUsers.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: user.color }}
            title={`${user.name} is editing`}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
            {/* Online indicator */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500"
              title="Online"
            />
          </div>
        ))}

        {remainingCount > 0 && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-400 text-xs font-medium text-white shadow-sm"
            title={`${remainingCount} more users editing`}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      <span className="ml-2 text-xs text-muted-foreground">
        {otherUsers.length === 1
          ? '1 person editing'
          : `${otherUsers.length} people editing`}
      </span>
    </div>
  );
}

export default RemoteCursors;
