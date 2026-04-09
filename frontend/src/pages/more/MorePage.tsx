import React from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardCheck,
  ChevronRight,
  PenTool,
  LayoutTemplate,
  Bot,
  DollarSign,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { GoogleDriveBrowser } from '../apps/GoogleDriveBrowser';
import GoogleSheetsBrowser from '../apps/GoogleSheetsBrowser';
import { ApprovalsPage } from '../approvals';
import { WhiteboardPage } from '../whiteboard/WhiteboardPage';
import TemplatesPage from '../templates/TemplatesPage';
import BotsPage from '../bots/BotsPage';
import BudgetList from '../budget/BudgetList';
import { DocumentBuilder, CreateDocument, TemplatePreview, FillTemplate, NewDocument, DocumentDetail } from '../documents';
import FormsPage from '../forms/FormsPage';
import FormBuilderPage from '../forms/FormBuilderPage';
import FormResponsesPage from '../forms/FormResponsesPage';
import FormSubmitPage from '../forms/FormSubmitPage';
import FormAnalyticsPage from '../forms/FormAnalyticsPage';

// Feature card component for built-in Deskive features
interface FeatureCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function FeatureCard({ name, description, icon, color, onClick }: FeatureCardProps) {
  return (
    <Card
      className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

function MoreGrid() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const intl = useIntl();

  // Deskive Features
  const features = [
    {
      name: intl.formatMessage({ id: 'tools.documentBuilder.name', defaultMessage: 'Document Builder' }),
      description: intl.formatMessage({ id: 'tools.documentBuilder.description', defaultMessage: 'Create professional documents from templates' }),
      icon: <FileText className="w-6 h-6" />,
      color: '#10b981',
      path: 'documents',
    },
    {
      name: intl.formatMessage({ id: 'tools.bots.name', defaultMessage: 'Bots' }),
      description: intl.formatMessage({ id: 'tools.bots.description', defaultMessage: 'Create automated bots for your workspace' }),
      icon: <Bot className="w-6 h-6" />,
      color: '#8b5cf6',
      path: 'bots',
    },
    {
      name: intl.formatMessage({ id: 'tools.budgetManagement.name', defaultMessage: 'Budget Management' }),
      description: intl.formatMessage({ id: 'tools.budgetManagement.description', defaultMessage: 'Track project budgets, expenses, and time' }),
      icon: <DollarSign className="w-6 h-6" />,
      color: '#f59e0b',
      path: 'budget',
    },
    {
      name: intl.formatMessage({ id: 'tools.projectTemplates.name', defaultMessage: 'Project Templates' }),
      description: intl.formatMessage({ id: 'tools.projectTemplates.description', defaultMessage: 'Create projects from predefined templates' }),
      icon: <LayoutTemplate className="w-6 h-6" />,
      color: '#3b82f6',
      path: 'templates',
    },
    {
      name: intl.formatMessage({ id: 'tools.whiteboard.name', defaultMessage: 'Whiteboard' }),
      description: intl.formatMessage({ id: 'tools.whiteboard.description', defaultMessage: 'Collaborative drawing and brainstorming' }),
      icon: <PenTool className="w-6 h-6" />,
      color: '#10b981',
      path: 'whiteboard',
    },
    {
      name: intl.formatMessage({ id: 'tools.requestApproval.name', defaultMessage: 'Request & Approval' }),
      description: intl.formatMessage({ id: 'tools.requestApproval.description', defaultMessage: 'Create and manage approval workflows' }),
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: '#6366f1',
      path: 'approvals',
    },
    {
      name: intl.formatMessage({ id: 'tools.forms.name', defaultMessage: 'Forms' }),
      description: intl.formatMessage({ id: 'tools.forms.description', defaultMessage: 'Create custom forms to collect responses' }),
      icon: <ClipboardList className="w-6 h-6" />,
      color: '#ec4899',
      path: 'forms',
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {intl.formatMessage({ id: 'tools.title', defaultMessage: 'Tools' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {intl.formatMessage({ id: 'tools.subtitle', defaultMessage: 'Access additional features and productivity tools' })}
          </p>
        </div>

        {/* Deskive Features Section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {intl.formatMessage({ id: 'tools.featuresSection', defaultMessage: 'Features' })}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.name}
                name={feature.name}
                description={feature.description}
                icon={feature.icon}
                color={feature.color}
                onClick={() => navigate(`/workspaces/${workspaceId}/more/${feature.path}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function MorePage() {
  return (
    <Routes>
      <Route path="/" element={<MoreGrid />} />
      <Route path="/documents" element={<DocumentBuilder />} />
      <Route path="/documents/create" element={<CreateDocument />} />
      <Route path="/documents/templates/:templateId" element={<TemplatePreview />} />
      <Route path="/documents/templates/:templateId/fill" element={<FillTemplate />} />
      <Route path="/documents/new" element={<NewDocument />} />
      <Route path="/documents/:documentId" element={<DocumentDetail />} />
      <Route path="/documents/:documentId/edit" element={<DocumentDetail />} />
      <Route path="/bots/*" element={<BotsPage />} />
      <Route path="/budget/*" element={<BudgetList />} />
      <Route path="/templates/*" element={<TemplatesPage />} />
      <Route path="/whiteboard/*" element={<WhiteboardPage />} />
      <Route path="/google-drive/*" element={<GoogleDriveBrowser />} />
      <Route path="/google-sheets/*" element={<GoogleSheetsBrowser />} />
      <Route path="/approvals/*" element={<ApprovalsPage />} />
      <Route path="/forms" element={<FormsPage />} />
      <Route path="/forms/new" element={<FormBuilderPage />} />
      <Route path="/forms/:formId/edit" element={<FormBuilderPage />} />
      <Route path="/forms/:formId/submit" element={<FormSubmitPage />} />
      <Route path="/forms/:formId/responses" element={<FormResponsesPage />} />
      <Route path="/forms/:formId/analytics" element={<FormAnalyticsPage />} />
    </Routes>
  );
}

export default MorePage;
