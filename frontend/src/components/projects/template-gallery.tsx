import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Code,
  Megaphone,
  Users,
  Palette,
  Briefcase,
  Calendar,
  FileSearch,
  User,
  Zap,
  Bug,
  Rocket,
  Server,
  Wrench,
  Loader2,
  CheckCircle2,
  Clock,
  ListTodo,
  ArrowRight,
  Star,
  TrendingUp,
  DollarSign,
  Headphones,
  GraduationCap,
  Laptop,
  Settings,
  Heart,
  Scale,
  Home,
  Factory,
  HandHeart,
  Film,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useTemplates,
  useTemplatesPaginated,
  useCreateProjectFromTemplate,
  type ProjectTemplate,
  type TemplateCategory,
  getCategoryDisplayName,
  getTemplateTotalTasks,
  getTemplateComplexity,
} from '@/lib/api/templates-api';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Category icons map
const categoryIcons: Record<TemplateCategory, React.ElementType> = {
  software_development: Code,
  marketing: Megaphone,
  hr: Users,
  design: Palette,
  business: Briefcase,
  events: Calendar,
  research: FileSearch,
  personal: User,
  sales: TrendingUp,
  finance: DollarSign,
  it_support: Headphones,
  education: GraduationCap,
  freelance: Laptop,
  operations: Settings,
  healthcare: Heart,
  legal: Scale,
  real_estate: Home,
  manufacturing: Factory,
  nonprofit: HandHeart,
  media: Film,
};

// Template-specific icons
const templateIcons: Record<string, React.ElementType> = {
  'sprint-planning': Zap,
  'bug-bash': Bug,
  'feature-development': Rocket,
  'api-development': Server,
  'tech-debt-cleanup': Wrench,
};

interface TemplateGalleryProps {
  workspaceId: string;
  onSelect?: (template: ProjectTemplate) => void;
  selectedTemplateId?: string;
  mode?: 'gallery' | 'selector';
}

const TEMPLATES_PER_PAGE = 12;

export function TemplateGallery({
  workspaceId,
  onSelect,
  selectedTemplateId,
  mode = 'gallery',
}: TemplateGalleryProps) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateToCreate, setTemplateToCreate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: templates = [], isLoading, isFetching } = useTemplates(workspaceId, {
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    page: currentPage,
    limit: TEMPLATES_PER_PAGE,
  });

  // Get pagination info from the query
  const { data: paginationData } = useTemplatesPaginated(workspaceId, {
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    page: currentPage,
    limit: TEMPLATES_PER_PAGE,
  });

  const pagination = paginationData?.pagination;

  // Reset to page 1 when filters change
  const handleCategoryChange = (category: TemplateCategory | 'all') => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const createFromTemplate = useCreateProjectFromTemplate();

  // Helper function to get translated category names
  const getCategoryName = (category: TemplateCategory | 'all'): string => {
    if (category === 'all') {
      return intl.formatMessage({ id: 'templates.categories.all', defaultMessage: 'All' });
    }

    const categoryKeyMap: Record<TemplateCategory, string> = {
      software_development: 'softwareDevelopment',
      marketing: 'marketing',
      hr: 'hr',
      design: 'design',
      business: 'business',
      events: 'events',
      research: 'research',
      personal: 'personal',
      sales: 'sales',
      finance: 'finance',
      it_support: 'itSupport',
      education: 'education',
      freelance: 'freelance',
      operations: 'operations',
      healthcare: 'healthcare',
      legal: 'legal',
      real_estate: 'realEstate',
      manufacturing: 'manufacturing',
      nonprofit: 'nonprofit',
      media: 'media',
    };

    const key = categoryKeyMap[category];
    return intl.formatMessage({
      id: `templates.categories.${key}`,
      defaultMessage: getCategoryDisplayName(category)
    });
  };

  const categories: (TemplateCategory | 'all')[] = [
    'all',
    'software_development',
    'marketing',
    'hr',
    'design',
    'business',
    'events',
    'research',
    'personal',
    'sales',
    'finance',
    'it_support',
    'education',
    'freelance',
    'operations',
    'healthcare',
    'legal',
    'real_estate',
    'manufacturing',
    'nonprofit',
    'media',
  ];

  // Templates are now filtered server-side, no need for client-side filtering
  const filteredTemplates = templates;

  const handleSelectTemplate = (template: ProjectTemplate) => {
    if (mode === 'selector' && onSelect) {
      onSelect(template);
    } else {
      setPreviewTemplate(template);
    }
  };

  const handleUseTemplate = (template: ProjectTemplate) => {
    setPreviewTemplate(null);
    setTemplateToCreate(template);
    setCreateDialogOpen(true);
    setProjectName(`${template.name} - New Project`);
    setProjectDescription(template.description || '');
  };

  const handleCreateProject = async () => {
    if (!templateToCreate) return;

    try {
      const project = await createFromTemplate.mutateAsync({
        workspaceId,
        idOrSlug: templateToCreate.slug,
        data: {
          projectName,
          description: projectDescription,
        },
      });

      toast({
        title: intl.formatMessage({ id: 'templates.projectCreated', defaultMessage: 'Project created' }),
        description: intl.formatMessage(
          { id: 'templates.projectCreatedDescription', defaultMessage: '"{projectName}" has been created from the "{templateName}" template.' },
          { projectName, templateName: templateToCreate.name }
        ),
      });

      setCreateDialogOpen(false);
      setTemplateToCreate(null);
      setProjectName('');
      setProjectDescription('');

      // Navigate to the new project
      navigate(`/workspaces/${workspaceId}/projects/${project.id}`);
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'templates.seedError.title', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'templates.createProjectError', defaultMessage: 'Failed to create project from template.' }),
        variant: 'destructive',
      });
    }
  };

  const getTemplateIcon = (template: ProjectTemplate) => {
    // Check for specific template icons first
    if (templateIcons[template.slug]) {
      return templateIcons[template.slug];
    }
    // Fall back to category icon
    return categoryIcons[template.category as TemplateCategory] || Code;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'templates.searchPlaceholder', defaultMessage: 'Search templates...' })}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={(v) => handleCategoryChange(v as TemplateCategory | 'all')}
      >
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {categories.map((category) => {
            const Icon = category === 'all' ? ListTodo : categoryIcons[category];
            return (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {getCategoryName(category)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {intl.formatMessage({ id: 'templates.noTemplatesFound', defaultMessage: 'No templates found.' })}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const Icon = getTemplateIcon(template);
                const taskCount = getTemplateTotalTasks(template);
                const complexity = getTemplateComplexity(template);
                const isSelected = selectedTemplateId === template.id;

                return (
                  <Card
                    key={template.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                      isSelected && 'ring-2 ring-primary border-primary'
                    )}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{ backgroundColor: template.color || '#3B82F6' }}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {template.isFeatured && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              {intl.formatMessage({ id: 'templates.featured', defaultMessage: 'Featured' })}
                            </Badge>
                          )}
                          {template.isSystem && (
                            <Badge variant="outline" className="text-xs">
                              {intl.formatMessage({ id: 'templates.system', defaultMessage: 'System' })}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ListTodo className="h-3.5 w-3.5" />
                          <span>{taskCount} {intl.formatMessage({ id: 'templates.tasks', defaultMessage: 'tasks' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{complexity}</span>
                        </div>
                      </div>
                      {template.usageCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {intl.formatMessage(
                            { id: 'templates.usedTimes', defaultMessage: 'Used {count} times' },
                            { count: template.usageCount }
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage(
                  { id: 'templates.showingTemplates', defaultMessage: 'Showing {start} - {end} of {total} templates' },
                  {
                    start: ((currentPage - 1) * TEMPLATES_PER_PAGE) + 1,
                    end: Math.min(currentPage * TEMPLATES_PER_PAGE, pagination.total),
                    total: pagination.total
                  }
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {intl.formatMessage({ id: 'templates.previous', defaultMessage: 'Previous' })}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isFetching}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages || isFetching}
                >
                  {intl.formatMessage({ id: 'templates.next', defaultMessage: 'Next' })}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {previewTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: previewTemplate.color || '#3B82F6' }}
                  >
                    {(() => {
                      const Icon = getTemplateIcon(previewTemplate);
                      return <Icon className="h-6 w-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{previewTemplate.name}</DialogTitle>
                    <DialogDescription>{previewTemplate.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[50vh] mt-4">
                <div className="space-y-6 pr-4">
                  {/* Template Info */}
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary">
                      {getCategoryName(previewTemplate.category as TemplateCategory)}
                    </Badge>
                    <Badge variant="outline">
                      {getTemplateTotalTasks(previewTemplate)} {intl.formatMessage({ id: 'templates.tasks', defaultMessage: 'tasks' })}
                    </Badge>
                    <Badge variant="outline">
                      {getTemplateComplexity(previewTemplate)} {intl.formatMessage({ id: 'templates.complexity', defaultMessage: 'complexity' })}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {previewTemplate.projectType}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Sections Preview */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">{intl.formatMessage({ id: 'templates.templateStructure', defaultMessage: 'Template Structure' })}</h4>
                    {previewTemplate.structure?.sections?.map((section, index) => (
                      <div key={index} className="space-y-2">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {section.name}
                        </h5>
                        {section.description && (
                          <p className="text-sm text-muted-foreground ml-6">
                            {section.description}
                          </p>
                        )}
                        <ul className="ml-6 space-y-1">
                          {section.tasks.slice(0, 3).map((task, taskIndex) => (
                            <li
                              key={taskIndex}
                              className="text-sm text-muted-foreground flex items-center gap-2"
                            >
                              <ArrowRight className="h-3 w-3" />
                              {task.title}
                            </li>
                          ))}
                          {section.tasks.length > 3 && (
                            <li className="text-sm text-muted-foreground italic">
                              {intl.formatMessage(
                                { id: 'templates.moreTasks', defaultMessage: '+{count} more tasks...' },
                                { count: section.tasks.length - 3 }
                              )}
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Custom Fields */}
                  {previewTemplate.customFields && previewTemplate.customFields.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold">{intl.formatMessage({ id: 'templates.customFields', defaultMessage: 'Custom Fields' })}</h4>
                        <div className="flex flex-wrap gap-2">
                          {previewTemplate.customFields.map((field: any, index: number) => (
                            <Badge key={index} variant="outline">
                              {field.name} ({field.type})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Kanban Stages */}
                  {previewTemplate.kanbanStages && previewTemplate.kanbanStages.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold">{intl.formatMessage({ id: 'templates.boardStages', defaultMessage: 'Board Stages' })}</h4>
                        <div className="flex flex-wrap gap-2">
                          {previewTemplate.kanbanStages.map((stage: any, index: number) => (
                            <Badge
                              key={index}
                              style={{ backgroundColor: stage.color, color: 'white' }}
                            >
                              {stage.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  {intl.formatMessage({ id: 'templates.cancel', defaultMessage: 'Cancel' })}
                </Button>
                <Button onClick={() => handleUseTemplate(previewTemplate)}>
                  {intl.formatMessage({ id: 'templates.useThisTemplate', defaultMessage: 'Use This Template' })}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setTemplateToCreate(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'templates.createFromTemplate', defaultMessage: 'Create Project from Template' })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'templates.customizeProject', defaultMessage: 'Customize your new project before creating it.' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">{intl.formatMessage({ id: 'templates.projectName', defaultMessage: 'Project Name' })}</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={intl.formatMessage({ id: 'templates.enterProjectName', defaultMessage: 'Enter project name' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">{intl.formatMessage({ id: 'templates.description', defaultMessage: 'Description (optional)' })}</Label>
              <Input
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder={intl.formatMessage({ id: 'templates.enterProjectDescription', defaultMessage: 'Enter project description' })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setTemplateToCreate(null);
            }}>
              {intl.formatMessage({ id: 'templates.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || createFromTemplate.isPending}
            >
              {createFromTemplate.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {intl.formatMessage({ id: 'templates.createProject', defaultMessage: 'Create Project' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact template selector for use in modals
export function TemplateSelector({
  workspaceId,
  onSelect,
  selectedTemplateId,
}: {
  workspaceId: string;
  onSelect: (template: ProjectTemplate | null) => void;
  selectedTemplateId?: string;
}) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: templates = [], isLoading } = useTemplates(workspaceId, {
    category: 'software_development',
  });

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={intl.formatMessage({ id: 'templates.searchPlaceholder', defaultMessage: 'Search templates...' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 max-h-[300px] overflow-y-auto">
        {/* Blank Project Option */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-sm hover:border-primary/50',
            !selectedTemplateId && 'ring-2 ring-primary border-primary'
          )}
          onClick={() => onSelect(null)}
        >
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{intl.formatMessage({ id: 'templates.blankProject', defaultMessage: 'Blank Project' })}</p>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'templates.startFromScratch', defaultMessage: 'Start from scratch' })}</p>
            </div>
          </CardContent>
        </Card>

        {filteredTemplates.map((template) => {
          const Icon = templateIcons[template.slug] || Code;
          const isSelected = selectedTemplateId === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-sm hover:border-primary/50',
                isSelected && 'ring-2 ring-primary border-primary'
              )}
              onClick={() => onSelect(template)}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: template.color || '#3B82F6' }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {getTemplateTotalTasks(template)} {intl.formatMessage({ id: 'templates.tasks', defaultMessage: 'tasks' })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
