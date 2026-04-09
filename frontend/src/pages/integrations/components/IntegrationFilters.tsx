/**
 * Integration Filters Component
 * Advanced filtering panel for the integrations marketplace
 */

import { X, Filter } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  type IntegrationFilters as IIntegrationFilters,
  type IntegrationCategory,
  type AuthType
} from '@/lib/api/integrations-api';

interface IntegrationFiltersProps {
  filters: IIntegrationFilters;
  onFiltersChange: (filters: IIntegrationFilters) => void;
  categories: Array<{ 
    id: IntegrationCategory; 
    label: string; 
    icon: React.ReactNode; 
    description: string;
    color: string;
  }>;
}

const AUTH_TYPES_CONFIG: Array<{
  value: AuthType;
  labelKey: string;
  defaultLabel: string;
  descKey: string;
  defaultDesc: string;
}> = [
  { value: 'OAUTH2', labelKey: 'modules.integrations.filters.auth.oauth2', defaultLabel: 'OAuth 2.0', descKey: 'modules.integrations.filters.auth.oauth2Desc', defaultDesc: 'Secure authorization flow' },
  { value: 'API_KEY', labelKey: 'modules.integrations.filters.auth.apiKey', defaultLabel: 'API Key', descKey: 'modules.integrations.filters.auth.apiKeyDesc', defaultDesc: 'Simple API key authentication' },
  { value: 'BASIC_AUTH', labelKey: 'modules.integrations.filters.auth.basicAuth', defaultLabel: 'Basic Auth', descKey: 'modules.integrations.filters.auth.basicAuthDesc', defaultDesc: 'Username and password' },
  { value: 'JWT', labelKey: 'modules.integrations.filters.auth.jwt', defaultLabel: 'JWT Token', descKey: 'modules.integrations.filters.auth.jwtDesc', defaultDesc: 'JSON Web Token' },
  { value: 'WEBHOOK_ONLY', labelKey: 'modules.integrations.filters.auth.webhookOnly', defaultLabel: 'Webhook Only', descKey: 'modules.integrations.filters.auth.webhookOnlyDesc', defaultDesc: 'Receive-only integration' },
];

const PRICING_TYPES_CONFIG = [
  { value: 'FREE' as const, labelKey: 'modules.integrations.filters.pricingTypes.free', defaultLabel: 'Free', descKey: 'modules.integrations.filters.pricingTypes.freeDesc', defaultDesc: 'Completely free to use' },
  { value: 'FREEMIUM' as const, labelKey: 'modules.integrations.filters.pricingTypes.freemium', defaultLabel: 'Freemium', descKey: 'modules.integrations.filters.pricingTypes.freemiumDesc', defaultDesc: 'Free with paid upgrades' },
  { value: 'PAID' as const, labelKey: 'modules.integrations.filters.pricingTypes.paid', defaultLabel: 'Paid', descKey: 'modules.integrations.filters.pricingTypes.paidDesc', defaultDesc: 'Requires subscription' },
];

export function IntegrationFilters({
  filters,
  onFiltersChange,
  categories
}: IntegrationFiltersProps) {
  const intl = useIntl();

  // Create translated auth types
  const authTypes = useMemo(() =>
    AUTH_TYPES_CONFIG.map(auth => ({
      value: auth.value,
      label: intl.formatMessage({ id: auth.labelKey, defaultMessage: auth.defaultLabel }),
      description: intl.formatMessage({ id: auth.descKey, defaultMessage: auth.defaultDesc }),
    })),
    [intl]
  );

  // Create translated pricing types
  const pricingTypes = useMemo(() =>
    PRICING_TYPES_CONFIG.map(pricing => ({
      value: pricing.value,
      label: intl.formatMessage({ id: pricing.labelKey, defaultMessage: pricing.defaultLabel }),
      description: intl.formatMessage({ id: pricing.descKey, defaultMessage: pricing.defaultDesc }),
    })),
    [intl]
  );

  const handleCategoryChange = (categoryId: IntegrationCategory, checked: boolean) => {
    const currentCategories = filters.categories || [];
    const newCategories = checked
      ? [...currentCategories, categoryId]
      : currentCategories.filter(id => id !== categoryId);
    
    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  const handleAuthTypeChange = (authType: AuthType, checked: boolean) => {
    const currentAuthTypes = filters.authTypes || [];
    const newAuthTypes = checked
      ? [...currentAuthTypes, authType]
      : currentAuthTypes.filter(type => type !== authType);
    
    onFiltersChange({
      ...filters,
      authTypes: newAuthTypes.length > 0 ? newAuthTypes : undefined,
    });
  };

  const handlePricingChange = (pricingType: 'FREE' | 'FREEMIUM' | 'PAID', checked: boolean) => {
    const currentPricing = filters.pricing || [];
    const newPricing = checked
      ? [...currentPricing, pricingType]
      : currentPricing.filter(type => type !== pricingType);
    
    onFiltersChange({
      ...filters,
      pricing: newPricing.length > 0 ? newPricing : undefined,
    });
  };

  const handleToggleFilter = (filterType: 'popular' | 'verified', value: boolean) => {
    onFiltersChange({
      ...filters,
      [filterType]: value || undefined,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: filters.search, // Keep search term
    });
  };

  const hasActiveFilters = !!(
    filters.categories?.length ||
    filters.authTypes?.length ||
    filters.pricing?.length ||
    filters.popular ||
    filters.verified ||
    filters.tags?.length
  );

  const activeFilterCount = [
    filters.categories?.length || 0,
    filters.authTypes?.length || 0,
    filters.pricing?.length || 0,
    filters.popular ? 1 : 0,
    filters.verified ? 1 : 0,
    filters.tags?.length || 0,
  ].reduce((sum, count) => sum + count, 0);

  return (
    <Card className="w-full lg:w-80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            {intl.formatMessage({ id: 'modules.integrations.filters.title', defaultMessage: 'Filters' })}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Filters */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            {intl.formatMessage({ id: 'modules.integrations.filters.quickFilters', defaultMessage: 'Quick Filters' })}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="popular"
                checked={filters.popular || false}
                onCheckedChange={(checked) => handleToggleFilter('popular', checked as boolean)}
              />
              <label htmlFor="popular" className="text-sm">
                {intl.formatMessage({ id: 'modules.integrations.filters.popularIntegrations', defaultMessage: 'Popular integrations' })}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={filters.verified || false}
                onCheckedChange={(checked) => handleToggleFilter('verified', checked as boolean)}
              />
              <label htmlFor="verified" className="text-sm">
                {intl.formatMessage({ id: 'modules.integrations.filters.verifiedIntegrations', defaultMessage: 'Verified integrations' })}
              </label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Categories */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            {intl.formatMessage({ id: 'modules.integrations.filters.categories', defaultMessage: 'Categories' })}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={filters.categories?.includes(category.id) || false}
                  onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                />
                <label 
                  htmlFor={category.id} 
                  className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                >
                  <div className={`p-1 rounded ${category.color}`}>
                    {category.icon}
                  </div>
                  {category.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Authentication Types */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            {intl.formatMessage({ id: 'modules.integrations.filters.authTypes', defaultMessage: 'Authentication' })}
          </h4>
          <div className="space-y-2">
            {authTypes.map((authType) => (
              <div key={authType.value} className="flex items-start space-x-2">
                <Checkbox
                  id={authType.value}
                  checked={filters.authTypes?.includes(authType.value) || false}
                  onCheckedChange={(checked) => handleAuthTypeChange(authType.value, checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label
                    htmlFor={authType.value}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {authType.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {authType.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Pricing */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            {intl.formatMessage({ id: 'modules.integrations.filters.pricing', defaultMessage: 'Pricing' })}
          </h4>
          <div className="space-y-2">
            {pricingTypes.map((pricingType) => (
              <div key={pricingType.value} className="flex items-start space-x-2">
                <Checkbox
                  id={pricingType.value}
                  checked={filters.pricing?.includes(pricingType.value) || false}
                  onCheckedChange={(checked) => handlePricingChange(pricingType.value, checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label
                    htmlFor={pricingType.value}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {pricingType.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {pricingType.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">
                  {intl.formatMessage({ id: 'modules.integrations.filters.activeFilters', defaultMessage: 'Active Filters' })}
                </h4>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  {intl.formatMessage({ id: 'modules.integrations.filters.clearAll', defaultMessage: 'Clear All' })}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.categories?.map((categoryId) => {
                  const category = categories.find(c => c.id === categoryId);
                  return category ? (
                    <Badge
                      key={categoryId}
                      variant="secondary"
                      className="text-xs"
                    >
                      {category.label}
                      <X
                        className="w-3 h-3 ml-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryChange(categoryId as IntegrationCategory, false);
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
                {filters.authTypes?.map((authTypeValue) => (
                  <Badge
                    key={authTypeValue}
                    variant="secondary"
                    className="text-xs"
                  >
                    {authTypes.find(a => a.value === authTypeValue)?.label}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAuthTypeChange(authTypeValue as AuthType, false);
                      }}
                    />
                  </Badge>
                ))}
                {filters.pricing?.map((pricingTypeValue) => (
                  <Badge
                    key={pricingTypeValue}
                    variant="secondary"
                    className="text-xs"
                  >
                    {pricingTypes.find(p => p.value === pricingTypeValue)?.label}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePricingChange(pricingTypeValue as 'FREE' | 'FREEMIUM' | 'PAID', false);
                      }}
                    />
                  </Badge>
                ))}
                {filters.popular && (
                  <Badge variant="secondary" className="text-xs">
                    {intl.formatMessage({ id: 'modules.integrations.filters.popular', defaultMessage: 'Popular' })}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFilter('popular', false);
                      }}
                    />
                  </Badge>
                )}
                {filters.verified && (
                  <Badge variant="secondary" className="text-xs">
                    {intl.formatMessage({ id: 'modules.integrations.filters.verified', defaultMessage: 'Verified' })}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFilter('verified', false);
                      }}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}