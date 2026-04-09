/**
 * Integration List Component
 * Displays integrations in a detailed list layout
 */

import { Star, Download, Shield, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  type Integration, 
  type InstalledIntegration,
  type IntegrationCategory 
} from '@/lib/api/integrations-api';

interface IntegrationListProps {
  integrations: Integration[];
  installedIntegrations: InstalledIntegration[];
  onIntegrationClick: (integration: Integration) => void;
}

const CATEGORY_COLORS: Record<IntegrationCategory, string> = {
  'COMMUNICATION': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'PROJECT_MANAGEMENT': 'bg-green-500/10 text-green-700 dark:text-green-300',
  'FILE_STORAGE': 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'STORAGE': 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'CALENDAR': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  'CODE_REPOSITORIES': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  'ANALYTICS': 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  'CRM': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  'MARKETING': 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  'HR': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'FINANCE': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'DESIGN': 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'DEVELOPMENT': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  'PRODUCTIVITY': 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  SOCIAL_MEDIA: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  'E_COMMERCE': 'bg-lime-500/10 text-lime-700 dark:text-lime-300',
  'SECURITY': 'bg-red-500/10 text-red-700 dark:text-red-300',
  'OTHER': 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
};

export function IntegrationList({ 
  integrations, 
  installedIntegrations, 
  onIntegrationClick 
}: IntegrationListProps) {
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
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="space-y-4">
      {integrations.map((integration) => {
        const installed = isInstalled(integration.id);
        
        return (
          <Card 
            key={integration.id}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onIntegrationClick(integration)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Logo */}
                <Avatar className="w-16 h-16 flex-shrink-0">
                  <AvatarImage src={integration.logo} alt={integration.name} />
                  <AvatarFallback className="text-lg">
                    {integration.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-semibold truncate group-hover:text-primary">
                          {integration.name}
                        </h3>
                        {installed && (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                        {integration.isVerified && (
                          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-2">
                        by {integration.provider}
                      </p>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {integration.description}
                      </p>

                      {/* Features */}
                      {(integration.features?.length || 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {integration.features?.slice(0, 3).map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {(integration.features?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(integration.features?.length || 0) - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{integration.rating}</span>
                          <span className="text-muted-foreground">
                            ({integration.reviewCount} reviews)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Download className="w-4 h-4" />
                          <span>{formatInstallCount(integration.installCount || 0)} installs</span>
                        </div>

                        {integration.category && (
                          <Badge
                            variant="secondary"
                            className={CATEGORY_COLORS[integration.category]}
                          >
                            {getCategoryLabel(integration.category)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {integration.pricing?.type === 'FREE' && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            Free
                          </Badge>
                        )}
                        {integration.pricing?.type === 'FREEMIUM' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Freemium
                          </Badge>
                        )}
                        {integration.pricing?.type === 'PAID' && integration.pricing?.cost && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            ${integration.pricing?.cost}/{integration.pricing?.interval || 'month'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {integration.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(integration.website, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {installed ? (
                          <Button variant="outline" size="sm">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Installed
                          </Button>
                        ) : (
                          <Button size="sm" className="group-hover:bg-primary/90">
                            Install
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}