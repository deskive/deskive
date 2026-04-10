/**
 * Settings Page
 * Main settings page with tabbed interface for user preferences
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Settings as SettingsIcon,
  AlertCircle
} from 'lucide-react';

// Components
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import ProfileSettings from './ProfileSettings';
import SecuritySettings from './SecuritySettings';
import NotificationSettings from './NotificationSettings';
import TeamManagement from './TeamManagement';
import WorkspaceSettings from './WorkspaceSettings';
import FeedbackSettings from './FeedbackSettings';

// Simple container component - no tabs needed since left sidebar has navigation
const ContentContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="space-y-6">{children}</div>;
};

// Main Settings Component
const SettingsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const intl = useIntl();

  // Get initial tab from URL or default to 'profile'
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Loading and error states
  const [error, setError] = useState<string | null>(null);

  // Sync activeTab with URL query parameter
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Validate workspaceId
  useEffect(() => {
    if (!workspaceId) {
      setError('Workspace ID is required');
    } else {
      setError(null);
    }
  }, [workspaceId]);

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{intl.formatMessage({ id: 'settings.error' })}</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.history.back()}>
                {intl.formatMessage({ id: 'common.goBack' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">{intl.formatMessage({ id: 'settings.title' })}</h1>
        </div>
        <p className="text-gray-600">
          {intl.formatMessage({ id: 'settings.description' })}
        </p>
      </div>

      {/* Content - no tabs, just the active content */}
      <ContentContainer>
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'feedback' && <FeedbackSettings />}
        {activeTab === 'team' && workspaceId && <TeamManagement workspaceId={workspaceId} />}
        {activeTab === 'workspace' && workspaceId && <WorkspaceSettings workspaceId={workspaceId} />}
      </ContentContainer>
    </div>
  );
};

export default SettingsPage;