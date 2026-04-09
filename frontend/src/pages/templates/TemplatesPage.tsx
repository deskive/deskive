import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { TemplateGallery } from '@/components/projects/template-gallery';
import { Button } from '@/components/ui/button';
import { useSeedTemplates } from '@/lib/api/templates-api';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

export default function TemplatesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const intl = useIntl();
  const { toast } = useToast();
  const seedTemplates = useSeedTemplates();

  // Determine if accessed from More page
  const isFromMorePage = location.pathname.includes('/more/');

  const handleSeedTemplates = async () => {
    if (!workspaceId) return;

    try {
      await seedTemplates.mutateAsync({ workspaceId });
      toast({
        title: intl.formatMessage({ id: 'templates.seedSuccess.title', defaultMessage: 'Templates seeded' }),
        description: intl.formatMessage({ id: 'templates.seedSuccess.description', defaultMessage: 'System templates have been added successfully.' }),
      });
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'templates.seedError.title', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'templates.seedError.description', defaultMessage: 'Failed to seed templates.' }),
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => {
    if (isFromMorePage) {
      navigate(`/workspaces/${workspaceId}/more`);
    } else {
      navigate(`/workspaces/${workspaceId}/projects`);
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{intl.formatMessage({ id: 'templates.workspaceNotFound', defaultMessage: 'Workspace not found' })}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{intl.formatMessage({ id: 'templates.pageTitle', defaultMessage: 'Project Templates' })}</h1>
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'templates.pageDescription', defaultMessage: 'Choose a template to quickly create a new project with predefined tasks and structure.' })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedTemplates}
            disabled={seedTemplates.isPending}
          >
            {seedTemplates.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {intl.formatMessage({ id: 'templates.refreshButton', defaultMessage: 'Refresh Templates' })}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <TemplateGallery workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
