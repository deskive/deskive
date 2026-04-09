/**
 * App Component
 * Main application router and providers
 *
 * Performance optimized with React.lazy() for code splitting
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { WebRTCProvider } from './contexts/WebRTCContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WorkspaceRedirect } from './components/WorkspaceRedirect';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import AdminLayout from './layouts/AdminLayout';
import { Toaster } from './components/ui/toast';
import { ThemeProvider } from './contexts/ThemeProvider';
import { deskiveAnalytics } from './components/analytics/deskiveAnalytics';
import { deskiveChatbot } from './components/chat/deskiveChatbot';
import { FeatureAnnouncementProvider } from './providers/FeatureAnnouncementProvider';
import { PageLoader, InlinePageLoader } from './components/common/PageLoader';

// ============================================================================
// LAZY LOADED PAGES - Code splitting for better performance
// ============================================================================

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback'));

// Core Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CreateWorkspace = lazy(() => import('./pages/workspace/CreateWorkspace'));
const AcceptInvitation = lazy(() => import('./pages/invitation/AcceptInvitation'));

// Workspace Feature Pages
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const FilesPage = lazy(() => import('./pages/files/FilesPage'));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'));
const NotesPage = lazy(() => import('./pages/notes/NotesPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const MonitoringPage = lazy(() => import('./pages/monitoring/MonitoringPage'));
const EmailPage = lazy(() => import('./pages/email/EmailPage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage').then(m => ({ default: m.SearchPage })));
const TemplatesPage = lazy(() => import('./pages/templates/TemplatesPage'));
const MembersPage = lazy(() => import('./pages/members/MembersPage'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const IntegrationsPage = lazy(() => import('./pages/integrations').then(m => ({ default: m.IntegrationsPage })));
const MorePage = lazy(() => import('./pages/more').then(m => ({ default: m.MorePage })));
const AppsPage = lazy(() => import('./pages/apps').then(m => ({ default: m.AppsPage })));

// Budget Pages
const BudgetList = lazy(() => import('./pages/budget/BudgetList'));
const BudgetDetails = lazy(() => import('./pages/budget/BudgetDetails'));

// Forms Pages
const FormsPage = lazy(() => import('./pages/forms/FormsPage'));
const FormBuilderPage = lazy(() => import('./pages/forms/FormBuilderPage'));
const FormResponsesPage = lazy(() => import('./pages/forms/FormResponsesPage'));
const FormSubmitPage = lazy(() => import('./pages/forms/FormSubmitPage'));
const FormAnalyticsPage = lazy(() => import('./pages/forms/FormAnalyticsPage'));
const PublicFormSubmitPage = lazy(() => import('./pages/forms/PublicFormSubmitPage'));

// Video Call Pages (Heavy - important to lazy load)
const VideoCallPage = lazy(() => import('./pages/video-call/VideoCallPage').then(m => ({ default: m.VideoCallPage })));
const PublicMeetingPage = lazy(() => import('./pages/video-call/PublicMeetingPage').then(m => ({ default: m.PublicMeetingPage })));
const StandaloneVideoCall = lazy(() => import('./pages/video-call/StandaloneVideoCall').then(m => ({ default: m.StandaloneVideoCall })));
const IncomingCallWindow = lazy(() => import('./pages/video-call/IncomingCallWindow').then(m => ({ default: m.IncomingCallWindow })));

// Whiteboard Pages (Heavy - Excalidraw)
const WhiteboardPage = lazy(() => import('./pages/whiteboard').then(m => ({ default: m.WhiteboardPage })));

// Public Pages
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const DownloadsPage = lazy(() => import('./pages/public/DownloadsPage'));
const PublicSupportPage = lazy(() => import('./pages/public/SupportPage'));
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'));
const TutorialPage = lazy(() => import('./pages/TutorialPage'));
const SharedFilePage = lazy(() => import('./pages/shared/SharedFilePage'));

// Slack Integration Pages
const SlackOnboarding = lazy(() => import('./pages/slack/SlackOnboarding'));
const SlackSuccess = lazy(() => import('./pages/slack/SlackSuccess'));
const SlackError = lazy(() => import('./pages/slack/SlackError'));
const SlackWhiteboard = lazy(() => import('./pages/slack/SlackWhiteboard'));
const SlackCalendar = lazy(() => import('./pages/slack/SlackCalendar'));
const SlackCalendarSuccess = lazy(() => import('./pages/slack/SlackCalendarSuccess'));
const SlackCalendarOnboarding = lazy(() => import('./pages/slack/SlackCalendarOnboarding'));

// Product Pages
const ChatProductPage = lazy(() => import('./pages/public/products').then(m => ({ default: m.ChatProductPage })));
const ProjectsProductPage = lazy(() => import('./pages/public/products').then(m => ({ default: m.ProjectsProductPage })));
const FilesProductPage = lazy(() => import('./pages/public/products').then(m => ({ default: m.FilesProductPage })));
const CalendarProductPage = lazy(() => import('./pages/public/products').then(m => ({ default: m.CalendarProductPage })));
const NotesProductPage = lazy(() => import('./pages/public/products').then(m => ({ default: m.NotesProductPage })));
const VideoCallsProductPage = lazy(() => import('./pages/public/products').then(m => ({ default: m.VideoCallsProductPage })));

// Feature Detail Pages
const AIChatFeature = lazy(() => import('./pages/features/AIChatFeature'));
const AnalyticsFeature = lazy(() => import('./pages/features/AnalyticsFeature'));
const CalendarFeature = lazy(() => import('./pages/features/CalendarFeature'));
const NotesFeature = lazy(() => import('./pages/features/NotesFeature'));
const TeamsFeature = lazy(() => import('./pages/features/TeamsFeature'));
const ProjectsFeature = lazy(() => import('./pages/features/ProjectsFeature'));
const VideoCallsFeature = lazy(() => import('./pages/features/VideoCallsFeature'));
const IntegrationsFeature = lazy(() => import('./pages/features/IntegrationsFeature'));
const AutomationFeature = lazy(() => import('./pages/features/AutomationFeature'));

// Legal Pages
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const CookiesPage = lazy(() => import('./pages/public/CookiesPage'));
const DataDeletionPage = lazy(() => import('./pages/public/DataDeletionPage'));

// Company Pages
const CareersPage = lazy(() => import('./pages/company/CareersPage'));
const PressPage = lazy(() => import('./pages/company/PressPage'));
const ChangelogPage = lazy(() => import('./pages/company/ChangelogPage'));

// Blog Pages
const BlogListPage = lazy(() => import('./pages/blog').then(m => ({ default: m.BlogListPage })));
const BlogPostPage = lazy(() => import('./pages/blog').then(m => ({ default: m.BlogPostPage })));
const BlogCategoryPage = lazy(() => import('./pages/blog').then(m => ({ default: m.BlogCategoryPage })));
const BlogTagPage = lazy(() => import('./pages/blog').then(m => ({ default: m.BlogTagPage })));
const BlogAuthorPage = lazy(() => import('./pages/blog').then(m => ({ default: m.BlogAuthorPage })));
const BlogSearchPage = lazy(() => import('./pages/blog').then(m => ({ default: m.BlogSearchPage })));
const CreateBlogPage = lazy(() => import('./pages/blog').then(m => ({ default: m.CreateBlogPage })));

// Document Builder Pages
const DocumentBuilder = lazy(() => import('./pages/documents').then(m => ({ default: m.DocumentBuilder })));
const CreateDocument = lazy(() => import('./pages/documents').then(m => ({ default: m.CreateDocument })));
const NewDocument = lazy(() => import('./pages/documents').then(m => ({ default: m.NewDocument })));
const DocumentDetail = lazy(() => import('./pages/documents').then(m => ({ default: m.DocumentDetail })));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminDashboard })));
const BlogManagement = lazy(() => import('./pages/admin').then(m => ({ default: m.BlogManagement })));
const BlogEditor = lazy(() => import('./pages/admin').then(m => ({ default: m.BlogEditor })));
const UserManagement = lazy(() => import('./pages/admin').then(m => ({ default: m.UserManagement })));
const OrganizationManagement = lazy(() => import('./pages/admin').then(m => ({ default: m.OrganizationManagement })));
const SystemSettings = lazy(() => import('./pages/admin').then(m => ({ default: m.SystemSettings })));
const AuditLogs = lazy(() => import('./pages/admin').then(m => ({ default: m.AuditLogs })));
const FeedbackManagement = lazy(() => import('./pages/admin').then(m => ({ default: m.FeedbackManagement })));
const DeletionFeedbackManagement = lazy(() => import('./pages/admin').then(m => ({ default: m.DeletionFeedbackManagement })));

// Error Pages (Keep lightweight, can be static)
const NotFound = lazy(() => import('./pages/errors').then(m => ({ default: m.NotFound })));
const ErrorPage = lazy(() => import('./pages/errors').then(m => ({ default: m.ErrorPage })));

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Suspense fallback={<PageLoader />}>
          <ErrorPage
            error={this.state.error || undefined}
            resetErrorBoundary={this.resetErrorBoundary}
          />
        </Suspense>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// QUERY CLIENT
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

// ============================================================================
// WORKSPACE ROUTES COMPONENT (Nested routes with inline loader)
// ============================================================================

function WorkspaceRoutes() {
  return (
    <Suspense fallback={<InlinePageLoader />}>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:channelId" element={<ChatPage />} />
        <Route path="projects/*" element={<ProjectsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="files/*" element={<FilesPage />} />
        <Route path="calendar/*" element={<CalendarPage />} />
        <Route path="notes/*" element={<NotesPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="notifications" element={<NotificationCenter />} />
        <Route path="analytics/*" element={<AnalyticsPage />} />
        <Route path="monitoring/*" element={<MonitoringPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="profile/:userId" element={<UserProfilePage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="integrations/*" element={<IntegrationsPage />} />
        <Route path="more/*" element={<MorePage />} />
        <Route path="apps/*" element={<AppsPage />} />
        <Route path="video-calls/*" element={<VideoCallPage />} />
        <Route path="email" element={<EmailPage />} />
        <Route path="email/:folder" element={<EmailPage />} />
        <Route path="email/message/:messageId" element={<EmailPage />} />
        <Route path="budget" element={<BudgetList />} />
        <Route path="budget/:budgetId" element={<BudgetDetails />} />
        <Route path="whiteboard" element={<WhiteboardPage />} />
        <Route path="whiteboard/:whiteboardId" element={<WhiteboardPage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="forms/new" element={<FormBuilderPage />} />
        <Route path="forms/:formId/edit" element={<FormBuilderPage />} />
        <Route path="forms/:formId/submit" element={<FormSubmitPage />} />
        <Route path="forms/:formId/responses" element={<FormResponsesPage />} />
        <Route path="forms/:formId/analytics" element={<FormAnalyticsPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}


// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <deskiveAnalytics debug={process.env.NODE_ENV === 'development'} />
            <deskiveChatbot
              debug={process.env.NODE_ENV === 'development'}
              position="bottom-right"
              primaryColor="#2563EB"
              greeting="Hi! How can I help you with Deskive today?"
              placeholder="Type your message..."
            />
            <FeatureAnnouncementProvider>
              <ErrorBoundary>
                <AuthProvider>
                  <WorkspaceProvider>
                    <WebSocketProvider>
                      <WebRTCProvider>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            {/* Root Route */}
                            <Route path="/" element={<WorkspaceRedirect />} />

                            {/* Public Routes */}
                            <Route path="/home" element={<HomePage />} />
                            <Route path="/pricing" element={<PricingPage />} />
                            <Route path="/downloads" element={<DownloadsPage />} />
                            <Route path="/support" element={<PublicSupportPage />} />
                            <Route path="/tutorial" element={<TutorialPage />} />

                            {/* Slack Integration Routes */}
                            <Route path="/slack/onboarding" element={<SlackOnboarding />} />
                            <Route path="/slack/success" element={<SlackSuccess />} />
                            <Route path="/slack/error" element={<SlackError />} />
                            <Route path="/slack/whiteboard" element={<SlackWhiteboard />} />
                            <Route path="/slack/calendar" element={<SlackCalendar />} />
                            <Route path="/slack/calendar-success" element={<SlackCalendarSuccess />} />
                            <Route path="/slack/calendar-onboarding" element={<SlackCalendarOnboarding />} />

                            {/* Product Detail Routes */}
                            <Route path="/products/chat" element={<ChatProductPage />} />
                            <Route path="/products/projects" element={<ProjectsProductPage />} />
                            <Route path="/products/files" element={<FilesProductPage />} />
                            <Route path="/products/calendar" element={<CalendarProductPage />} />
                            <Route path="/products/notes" element={<NotesProductPage />} />
                            <Route path="/products/video-calls" element={<VideoCallsProductPage />} />

                            {/* Features Hub */}
                            <Route path="/features" element={<FeaturesPage />} />

                            {/* Feature Detail Routes */}
                            <Route path="/features/ai-chat" element={<AIChatFeature />} />
                            <Route path="/features/analytics" element={<AnalyticsFeature />} />
                            <Route path="/features/calendar" element={<CalendarFeature />} />
                            <Route path="/features/notes" element={<NotesFeature />} />
                            <Route path="/features/teams" element={<TeamsFeature />} />
                            <Route path="/features/projects" element={<ProjectsFeature />} />
                            <Route path="/features/video-calls" element={<VideoCallsFeature />} />
                            <Route path="/features/integrations" element={<IntegrationsFeature />} />
                            <Route path="/features/automation" element={<AutomationFeature />} />

                            {/* Legal Routes */}
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/terms" element={<TermsPage />} />
                            <Route path="/cookies" element={<CookiesPage />} />
                            <Route path="/data-deletion" element={<DataDeletionPage />} />

                            {/* Company Routes */}
                            <Route path="/careers" element={<CareersPage />} />
                            <Route path="/press" element={<PressPage />} />
                            <Route path="/changelog" element={<ChangelogPage />} />

                            {/* Auth Routes */}
                            <Route path="/auth/login" element={<Login />} />
                            <Route path="/auth/register" element={<Register />} />
                            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/auth/reset-password" element={<ResetPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/auth/verify-email" element={<VerifyEmail />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/auth/callback" element={<OAuthCallback />} />

                            {/* Invitation Routes */}
                            <Route path="/invitation/accept" element={<AcceptInvitation />} />
                            <Route path="/invite/:token" element={<AcceptInvitation />} />

                            {/* Blog Routes */}
                            <Route path="/blog" element={<BlogListPage />} />
                            <Route path="/blog/create" element={<CreateBlogPage />} />
                            <Route path="/blog/edit/:postId" element={<CreateBlogPage />} />
                            <Route path="/blog/search" element={<BlogSearchPage />} />
                            <Route path="/blog/category/:categorySlug" element={<BlogCategoryPage />} />
                            <Route path="/blog/tag/:tagSlug" element={<BlogTagPage />} />
                            <Route path="/blog/author/:authorId" element={<BlogAuthorPage />} />
                            <Route path="/blog/:slug" element={<BlogPostPage />} />

                            {/* Semi-Protected Routes */}
                            <Route path="/create-workspace" element={<CreateWorkspace />} />

                            {/* Notifications Redirect */}
                            <Route path="/notifications" element={<Navigate to="/workspaces" replace />} />

                            {/* Whiteboard Routes */}
                            <Route path="/whiteboard/:sessionId" element={<WhiteboardPage />} />
                            <Route path="/whiteboard" element={<WhiteboardPage />} />

                            {/* Public Video Meeting */}
                            <Route path="/video/meeting/:meetingId" element={<PublicMeetingPage />} />

                            {/* Public Shared File */}
                            <Route path="/shared/:shareToken" element={<SharedFilePage />} />

                            {/* Public Form Routes */}
                            <Route path="/forms/:slug" element={<PublicFormSubmitPage />} />
                            <Route path="/forms/s/:shareToken" element={<PublicFormSubmitPage />} />

                            {/* Standalone Video Call */}
                            <Route path="/call/:workspaceId/:callId" element={<StandaloneVideoCall />} />

                            {/* Incoming Call Window */}
                            <Route path="/incoming-call" element={<IncomingCallWindow />} />

                            {/* Admin Blog Route (Standalone) */}
                            <Route
                              path="/admin/blog"
                              element={
                                <ProtectedRoute requiredRole="ADMIN">
                                  <BlogManagement />
                                </ProtectedRoute>
                              }
                            />

                            {/* Admin Routes */}
                            <Route
                              path="/admin/*"
                              element={
                                <ProtectedRoute requiredRole="ADMIN">
                                  <AdminLayout />
                                </ProtectedRoute>
                              }
                            >
                              <Route index element={<AdminDashboard />} />
                              <Route path="users" element={<UserManagement />} />
                              <Route path="organizations" element={<OrganizationManagement />} />
                              <Route path="feedback" element={<FeedbackManagement />} />
                              <Route path="feedback/deletion" element={<DeletionFeedbackManagement />} />
                              <Route path="settings" element={<SystemSettings />} />
                              <Route path="audit-logs" element={<AuditLogs />} />
                            </Route>

                            {/* Protected Workspace Routes */}
                            <Route
                              path="/workspaces/:workspaceId/*"
                              element={
                                <ProtectedRoute>
                                  <WorkspaceLayout>
                                    <WorkspaceRoutes />
                                  </WorkspaceLayout>
                                </ProtectedRoute>
                              }
                            />

                            {/* 404 Catch-all */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                        <Toaster />
                      </WebRTCProvider>
                    </WebSocketProvider>
                  </WorkspaceProvider>
                </AuthProvider>
              </ErrorBoundary>
            </FeatureAnnouncementProvider>
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
