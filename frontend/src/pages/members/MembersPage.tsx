/**
 * Members Page
 * Standalone route for team/member management
 * Wraps the TeamManagement component to provide dedicated URL access
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import TeamManagement from '../settings/TeamManagement';

const MembersPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // Optional: Add any workspace-specific logic here
  // For now, we'll just render the TeamManagement component directly

  return (
    <div className="w-full h-full">
      <TeamManagement />
    </div>
  );
};

export default MembersPage;
