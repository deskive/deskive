/**
 * Integration Grid Component
 * Displays integrations in a responsive grid layout
 */

import { Star, Download, Shield, CheckCircle } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  type Integration,
  type InstalledIntegration,
  type IntegrationCategory
} from '@/lib/api/integrations-api';

interface IntegrationGridProps {
  integrations: Integration[];
  installedIntegrations: InstalledIntegration[];
  onIntegrationClick: (integration: Integration) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'COMMUNICATION': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'PROJECT_MANAGEMENT': 'bg-green-500/10 text-green-700 dark:text-green-300',
  'FILE_STORAGE': 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'STORAGE': 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'CALENDAR': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  'CODE_REPOSITORIES': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  'EMAIL': 'bg-red-500/10 text-red-700 dark:text-red-300',
  'ANALYTICS': 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  'CRM': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  'MARKETING': 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  'DOCUMENTATION': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'HR': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'FINANCE': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'DESIGN': 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'DEVELOPMENT': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  'PRODUCTIVITY': 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  'TIME_TRACKING': 'bg-lime-500/10 text-lime-700 dark:text-lime-300',
  'VIDEO_CONFERENCING': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  'AUTOMATION': 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  'SUPPORT': 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'SOCIAL_MEDIA': 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  'ECOMMERCE': 'bg-lime-500/10 text-lime-700 dark:text-lime-300',
  'E_COMMERCE': 'bg-lime-500/10 text-lime-700 dark:text-lime-300',
  'SECURITY': 'bg-red-500/10 text-red-700 dark:text-red-300',
  'AI': 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'OTHER': 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
};

export function IntegrationGrid({
  integrations,
  installedIntegrations,
  onIntegrationClick
}: IntegrationGridProps) {
  const intl = useIntl();

  const isInstalled = (integrationId: string) => {
    return installedIntegrations.some(installed => installed.integrationId === integrationId);
  };

  const formatInstallCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getCategoryLabel = (category: IntegrationCategory): string => {
    const categoryKeyMap: Record<string, string> = {
      'COMMUNICATION': 'modules.integrations.category.communication',
      'PROJECT_MANAGEMENT': 'modules.integrations.category.projectManagement',
      'FILE_STORAGE': 'modules.integrations.category.fileStorage',
      'STORAGE': 'modules.integrations.category.fileStorage',
      'CALENDAR': 'modules.integrations.category.calendar',
      'CODE_REPOSITORIES': 'modules.integrations.category.codeRepositories',
      'EMAIL': 'modules.integrations.category.email',
      'ANALYTICS': 'modules.integrations.category.analytics',
      'CRM': 'modules.integrations.category.crm',
      'MARKETING': 'modules.integrations.category.marketing',
      'DOCUMENTATION': 'modules.integrations.category.documentation',
      'HR': 'modules.integrations.category.hr',
      'FINANCE': 'modules.integrations.category.finance',
      'DESIGN': 'modules.integrations.category.design',
      'DEVELOPMENT': 'modules.integrations.category.development',
      'PRODUCTIVITY': 'modules.integrations.category.productivity',
      'TIME_TRACKING': 'modules.integrations.category.timeTracking',
      'VIDEO_CONFERENCING': 'modules.integrations.category.videoConferencing',
      'AUTOMATION': 'modules.integrations.category.automation',
      'SUPPORT': 'modules.integrations.category.support',
      'SOCIAL_MEDIA': 'modules.integrations.category.socialMedia',
      'ECOMMERCE': 'modules.integrations.category.ecommerce',
      'E_COMMERCE': 'modules.integrations.category.ecommerce',
      'SECURITY': 'modules.integrations.category.security',
      'AI': 'modules.integrations.category.ai',
      'OTHER': 'modules.integrations.category.other',
    };

    const defaultLabel = category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    return intl.formatMessage({ id: categoryKeyMap[category] || 'modules.integrations.category.other', defaultMessage: defaultLabel });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {integrations.map((integration) => {
        const installed = isInstalled(integration.id);
        
        return (
          <Card 
            key={integration.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
            onClick={() => onIntegrationClick(integration)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={integration.logo} alt={integration.name} />
                    <AvatarFallback>
                      {integration.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {integration.provider}
                    </p>
                  </div>
                </div>
                {installed && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {integration.description}
              </p>

              <div className="flex items-center gap-2">
                {integration.category && (
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[integration.category]}
                  >
                    {getCategoryLabel(integration.category)}
                  </Badge>
                )}
                {integration.isVerified && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    {intl.formatMessage({ id: 'modules.integrations.card.verified', defaultMessage: 'Verified' })}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{integration.rating}</span>
                  <span className="text-muted-foreground">
                    ({integration.reviewCount})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Download className="w-4 h-4" />
                  <span>{formatInstallCount(integration.installCount || 0)}</span>
                </div>
              </div>

              {integration.pricing?.type === 'FREE' && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {intl.formatMessage({ id: 'modules.integrations.card.free', defaultMessage: 'Free' })}
                </Badge>
              )}
              {integration.pricing?.type === 'FREEMIUM' && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {intl.formatMessage({ id: 'modules.integrations.card.freemium', defaultMessage: 'Freemium' })}
                </Badge>
              )}
              {integration.pricing?.type === 'PAID' && integration.pricing?.cost && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  ${integration.pricing?.cost}/{integration.pricing?.interval || 'month'}
                </Badge>
              )}
            </CardContent>

            <CardFooter className="pt-3">
              <div className="w-full">
                {installed ? (
                  <Button variant="outline" className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.integrations.card.installed', defaultMessage: 'Installed' })}
                  </Button>
                ) : (
                  <Button className="w-full group-hover:bg-primary/90">
                    {intl.formatMessage({ id: 'modules.integrations.card.install', defaultMessage: 'Install' })}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}