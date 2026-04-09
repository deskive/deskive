/**
 * User Profile Page
 * Displays detailed information about a user in the workspace
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  MessageSquare,
  Settings,
  Briefcase,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';

// Services
import { getWorkspaceMember } from '../services/workspaceService';

// Types
import type { WorkspaceMember } from '../types/workspace';

// Contexts
import { useAuth } from '../contexts/AuthContext';

const UserProfilePage: React.FC = () => {
  const { workspaceId, userId } = useParams<{ workspaceId: string; userId: string }>();
  const navigate = useNavigate();
  const intl = useIntl();
  const { user: currentUser } = useAuth();

  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if viewing own profile
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    loadUserProfile();
  }, [userId, workspaceId]);

  const loadUserProfile = async () => {
    if (!workspaceId || !userId) {
      setError('Missing workspace or user ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch member data from workspace
      const memberData = await getWorkspaceMember(workspaceId, userId);
      setMember(memberData);
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Failed to load user profile');
      toast.error('Error', {
        description: err.message || 'Failed to load user profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessageUser = () => {
    // Navigate to chat with this user
    navigate(`/workspaces/${workspaceId}/chat?user=${userId}`);
  };

  const handleEditProfile = () => {
    // Navigate to settings page
    navigate(`/workspaces/${workspaceId}/settings?tab=profile`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intl.locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'admin':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-300 font-semibold">
              {intl.formatMessage({ id: 'userProfile.loading', defaultMessage: 'Loading profile...' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {intl.formatMessage({ id: 'userProfile.errorTitle', defaultMessage: 'Profile Not Found' })}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error || intl.formatMessage({ id: 'userProfile.errorMessage', defaultMessage: 'Unable to load user profile' })}
              </p>
              <Button onClick={handleGoBack}>
                {intl.formatMessage({ id: 'userProfile.goBack', defaultMessage: 'Go Back' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get user data from member object
  const userData = member.user || {
    id: member.user_id,
    name: member.name || 'Unknown User',
    email: member.email || '',
    avatar: member.avatar_url,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'userProfile.back', defaultMessage: 'Back' })}
          </Button>
        </motion.div>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-gray-200 dark:border-gray-700">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  {userData.avatar ? (
                    <img
                      src={userData.avatar}
                      alt={userData.name}
                      className="w-32 h-32 rounded-2xl object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {userData.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                    <div>
                      <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                        {userData.name}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {intl.formatMessage({
                            id: `userProfile.role.${member.role}`,
                            defaultMessage: member.role.charAt(0).toUpperCase() + member.role.slice(1)
                          })}
                        </Badge>
                        {member.status === 'active' && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {intl.formatMessage({ id: 'userProfile.status.active', defaultMessage: 'Active' })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {isOwnProfile ? (
                        <Button onClick={handleEditProfile} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                          <Settings className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'userProfile.editProfile', defaultMessage: 'Edit Profile' })}
                        </Button>
                      ) : (
                        <Button onClick={handleMessageUser} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'userProfile.message', defaultMessage: 'Message' })}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {currentUser?.metadata?.bio && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {currentUser.metadata.bio}
                    </p>
                  )}

                  {/* Quick Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{userData.email}</span>
                    </div>
                    {currentUser?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{currentUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {intl.formatMessage({ id: 'userProfile.joined', defaultMessage: 'Joined' })} {formatDate(member.joined_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-gray-200 dark:border-gray-700 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  {intl.formatMessage({ id: 'userProfile.contactInfo', defaultMessage: 'Contact Information' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">
                    {intl.formatMessage({ id: 'userProfile.email', defaultMessage: 'Email' })}
                  </Label>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold">{userData.email}</p>
                </div>

                {currentUser?.phone && (
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400 text-sm">
                      {intl.formatMessage({ id: 'userProfile.phone', defaultMessage: 'Phone' })}
                    </Label>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{currentUser.phone}</p>
                  </div>
                )}

                {currentUser?.metadata?.location && (
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {intl.formatMessage({ id: 'userProfile.location', defaultMessage: 'Location' })}
                    </Label>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{currentUser.metadata.location}</p>
                  </div>
                )}

                {currentUser?.metadata?.website && (
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {intl.formatMessage({ id: 'userProfile.website', defaultMessage: 'Website' })}
                    </Label>
                    <a
                      href={currentUser.metadata.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      {currentUser.metadata.website}
                    </a>
                  </div>
                )}

                {currentUser?.timezone && (
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {intl.formatMessage({ id: 'userProfile.timezone', defaultMessage: 'Timezone' })}
                    </Label>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{currentUser.timezone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Workspace Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-gray-200 dark:border-gray-700 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-teal-600" />
                  {intl.formatMessage({ id: 'userProfile.workspaceInfo', defaultMessage: 'Workspace Information' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">
                    {intl.formatMessage({ id: 'userProfile.roleLabel', defaultMessage: 'Role' })}
                  </Label>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold capitalize">{member.role}</p>
                </div>

                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">
                    {intl.formatMessage({ id: 'userProfile.status', defaultMessage: 'Status' })}
                  </Label>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold capitalize">{member.status}</p>
                </div>

                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">
                    {intl.formatMessage({ id: 'userProfile.joinedDate', defaultMessage: 'Joined Date' })}
                  </Label>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatDate(member.joined_at)}</p>
                </div>

                {member.permissions && member.permissions.length > 0 && (
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400 text-sm mb-2 block">
                      {intl.formatMessage({ id: 'userProfile.permissions', defaultMessage: 'Permissions' })}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {member.permissions.map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* About Section */}
        {currentUser?.metadata?.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  {intl.formatMessage({ id: 'userProfile.about', defaultMessage: 'About' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{currentUser.metadata.bio}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                {intl.formatMessage({ id: 'userProfile.recentActivity', defaultMessage: 'Recent Activity' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                {intl.formatMessage({ id: 'userProfile.noActivity', defaultMessage: 'No recent activity to display' })}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                {intl.formatMessage({ id: 'userProfile.projects', defaultMessage: 'Projects' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                {intl.formatMessage({ id: 'userProfile.noProjects', defaultMessage: 'No projects to display' })}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfilePage;
