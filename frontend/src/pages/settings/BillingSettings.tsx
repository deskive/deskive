/**
 * Billing Settings Component
 * Manage subscription, billing information, invoices, and payment methods
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  RotateCcw,
  Check,
  Zap,
  Users,
  HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';

// Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

// API & Types
import {
  useSubscription,
  usePlans,
  useInvoices,
  usePaymentMethods,
  useCancelSubscription,
  useResumeSubscription,
  useCreateCheckout,
} from '@/lib/api/billing-api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionPlan } from '@/types/billing';

const BillingSettings: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { members } = useWorkspace();
  const { user } = useAuth();
  const intl = useIntl();

  // Get current user's role in the workspace
  const currentUserMembership = members.find(m => m.user_id === user?.id);
  const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';

  // State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  // API Hooks
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription(workspaceId || '');
  const { data: plans = [], isLoading: plansLoading } = usePlans(workspaceId || '');
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(workspaceId || '');
  const { data: paymentMethods = [] } = usePaymentMethods(workspaceId || '');

  // Mutations
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const checkoutMutation = useCreateCheckout();

  // Get current plan details
  const currentPlan = plans.find(p => p.id === subscription?.plan) || plans.find(p => p.id === 'free');

  // Sync billing period with current subscription
  useEffect(() => {
    if (subscription?.interval) {
      setBillingPeriod(subscription.interval === 'year' ? 'yearly' : 'monthly');
    }
  }, [subscription?.interval]);

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!workspaceId) return;

    try {
      await cancelMutation.mutateAsync({
        workspaceId,
        data: { cancelAtPeriodEnd: true },
      });
      toast.success('Subscription canceled', {
        description: 'Your subscription will remain active until the end of the billing period.',
      });
      setCancelDialogOpen(false);
    } catch (error) {
      toast.error('Failed to cancel subscription', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  // Handle resume subscription
  const handleResumeSubscription = async () => {
    if (!workspaceId) return;

    try {
      await resumeMutation.mutateAsync(workspaceId);
      toast.success('Subscription resumed', {
        description: 'Your subscription will continue as normal.',
      });
    } catch (error) {
      toast.error('Failed to resume subscription', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  // Handle upgrade/downgrade
  const handleChangePlan = async (plan: SubscriptionPlan) => {
    if (!workspaceId) return;

    // Free plan doesn't need checkout
    if (plan.id === 'free' || !plan.stripePriceId) {
      toast.info('Free plan', {
        description: 'You cannot downgrade to the free plan. Please contact support if you need to cancel your subscription.',
      });
      return;
    }

    // Get the correct price ID based on billing period
    const priceId = billingPeriod === 'yearly' && plan.stripePriceIdYearly
      ? plan.stripePriceIdYearly
      : plan.stripePriceId;

    if (!priceId) {
      toast.error('Invalid plan', {
        description: 'This plan is not available for the selected billing period.',
      });
      return;
    }

    setSelectedPlanForCheckout(plan.id);

    try {
      const { url } = await checkoutMutation.mutateAsync({
        workspaceId,
        data: {
          priceId,
          successUrl: `${window.location.origin}/workspaces/${workspaceId}/settings?tab=billing&success=true`,
          cancelUrl: `${window.location.origin}/workspaces/${workspaceId}/settings?tab=billing&canceled=true`,
        },
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      setSelectedPlanForCheckout(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // Format date - handles invalid/null dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    // Check for invalid date or epoch (Jan 1, 1970)
    if (isNaN(date.getTime()) || date.getTime() < 86400000) {
      return null;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trialing: { variant: 'secondary', label: 'Trial' },
      canceled: { variant: 'destructive', label: 'Canceled' },
      past_due: { variant: 'destructive', label: 'Past Due' },
    };

    const config = variants[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{intl.formatMessage({ id: 'settings.billing.loading' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>{intl.formatMessage({ id: 'settings.billing.subscription.title' })}</span>
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: 'settings.billing.subscription.description' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Plan Info */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'settings.billing.subscription.plan' })}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900 capitalize">
                      {currentPlan?.name || subscription.plan}
                    </p>
                    {getStatusBadge(subscription.status)}
                  </div>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'settings.billing.subscription.billingCycle' })}</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {subscription?.interval === 'year'
                        ? intl.formatMessage({ id: 'settings.billing.subscription.yearly' })
                        : intl.formatMessage({ id: 'settings.billing.subscription.monthly' })
                      }
                    </p>
                  </div>
                </div>

                {/* Next Billing Date - Only show for paid plans with valid dates */}
                {subscription.plan !== 'free' && formatDate(subscription.currentPeriodEnd) && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      {subscription.cancelAtPeriodEnd
                        ? intl.formatMessage({ id: 'settings.billing.subscription.accessUntil' })
                        : intl.formatMessage({ id: 'settings.billing.subscription.nextBilling' })
                      }
                    </p>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Plan Limits */}
              {currentPlan && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{intl.formatMessage({ id: 'settings.billing.limits.members' })}</p>
                      <p className="text-xs text-gray-500">
                        {currentPlan.limits.maxMembers === -1
                          ? intl.formatMessage({ id: 'settings.billing.limits.unlimited' })
                          : `${currentPlan.limits.maxMembers} ${intl.formatMessage({ id: 'settings.billing.limits.members' }).toLowerCase()}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <HardDrive className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{intl.formatMessage({ id: 'settings.billing.limits.storage' })}</p>
                      <p className="text-xs text-gray-500">
                        {currentPlan.limits.maxStorageGb === -1
                          ? intl.formatMessage({ id: 'settings.billing.limits.unlimited' })
                          : `${currentPlan.limits.maxStorageGb} GB`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {subscription.plan !== 'free' && isOwnerOrAdmin && (
                  <>
                    {subscription.cancelAtPeriodEnd ? (
                      <Button
                        onClick={handleResumeSubscription}
                        disabled={resumeMutation.isPending}
                        variant="default"
                      >
                        {resumeMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {intl.formatMessage({ id: 'settings.billing.actions.resuming' })}
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {intl.formatMessage({ id: 'settings.billing.actions.resume' })}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCancelDialogOpen(true)}
                        variant="destructive"
                        disabled={cancelMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {intl.formatMessage({ id: 'settings.billing.actions.cancel' })}
                      </Button>
                    )}
                  </>
                )}
                {!isOwnerOrAdmin && (
                  <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{intl.formatMessage({ id: 'settings.billing.permissions.denied' })}</span>
                  </div>
                )}
              </div>

              {subscription.cancelAtPeriodEnd && formatDate(subscription.currentPeriodEnd) && (
                <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">
                    Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">{intl.formatMessage({ id: 'settings.billing.subscription.noSubscription' })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: 'settings.billing.plans.title' })}</CardTitle>
          <CardDescription>
            {isOwnerOrAdmin
              ? intl.formatMessage({ id: 'settings.billing.plans.description' })
              : intl.formatMessage({ id: 'settings.billing.plans.viewOnly' })
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Period Toggle */}
          <div className="flex justify-center">
            <Tabs value={billingPeriod} onValueChange={(value) => isOwnerOrAdmin && setBillingPeriod(value as 'monthly' | 'yearly')}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="monthly" className="px-6" disabled={!isOwnerOrAdmin}>
                  {intl.formatMessage({ id: 'settings.billing.subscription.monthly' })}
                </TabsTrigger>
                <TabsTrigger value="yearly" className="px-6" disabled={!isOwnerOrAdmin}>
                  {intl.formatMessage({ id: 'settings.billing.subscription.yearly' })}
                  <Badge className="ml-2 bg-green-600 text-white text-xs">
                    {intl.formatMessage({ id: 'settings.billing.subscription.yearlyDiscount' })}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              // Check if this is the current plan AND interval
              const planInterval = billingPeriod === 'yearly' ? 'year' : 'month';
              const isCurrentPlan = subscription?.plan === plan.id && subscription?.interval === planInterval;
              const canUpgrade = !isCurrentPlan && subscription?.plan !== 'enterprise';
              const isDowngrade = subscription && plans.findIndex(p => p.id === subscription.plan) > plans.findIndex(p => p.id === plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative border rounded-lg p-6 space-y-4 transition-all ${
                    isCurrentPlan
                      ? 'border-blue-500 bg-blue-50'
                      : plan.isPopular
                      ? 'border-blue-300 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-0">
                      <Badge className="bg-blue-600">
                        <Zap className="w-3 h-3 mr-1" />
                        {intl.formatMessage({ id: 'settings.billing.plans.popular' })}
                      </Badge>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute top-0 left-0 -translate-y-1/2 translate-x-0">
                      <Badge className="bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        {intl.formatMessage({ id: 'settings.billing.plans.current' })}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-bold text-gray-900">
                        {billingPeriod === 'yearly' && plan.price > 0
                          ? formatCurrency((plan.price / 100) * 0.83, plan.currency)
                          : formatCurrency(plan.price / 100, plan.currency)
                        }
                      </span>
                      <span className="text-sm text-gray-500">
                        {intl.formatMessage({ id: 'settings.billing.plans.perMonth' })}
                      </span>
                    </div>
                    {billingPeriod === 'yearly' && plan.price > 0 && (
                      <p className="text-sm text-gray-500">
                        <span className="line-through">{formatCurrency(plan.price / 100, plan.currency)}/mo</span>
                        <span className="ml-2 text-green-600 font-medium">Save 17%</span>
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || checkoutMutation.isPending || !isOwnerOrAdmin}
                    onClick={() => handleChangePlan(plan)}
                  >
                    {checkoutMutation.isPending && selectedPlanForCheckout === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {intl.formatMessage({ id: 'settings.billing.plans.processing' })}
                      </>
                    ) : isCurrentPlan ? (
                      intl.formatMessage({ id: 'settings.billing.plans.current' })
                    ) : !isOwnerOrAdmin ? (
                      intl.formatMessage({ id: 'settings.billing.plans.viewOnly' })
                    ) : isDowngrade ? (
                      <>
                        <ArrowDownCircle className="w-4 h-4 mr-2" />
                        {intl.formatMessage({ id: 'settings.billing.plans.downgrade' })}
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        {intl.formatMessage({ id: 'settings.billing.plans.upgrade' })}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>{intl.formatMessage({ id: 'settings.billing.payment.title' })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {method.brand?.toUpperCase()} •••• {method.last4}
                      </p>
                      {method.expiryMonth && method.expiryYear && (
                        <p className="text-sm text-gray-500">
                          {intl.formatMessage({ id: 'settings.billing.payment.expires' })} {method.expiryMonth}/{method.expiryYear}
                        </p>
                      )}
                    </div>
                    {method.isDefault && (
                      <Badge variant="secondary">{intl.formatMessage({ id: 'settings.billing.payment.default' })}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{intl.formatMessage({ id: 'settings.billing.invoices.title' })}</span>
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: 'settings.billing.invoices.description' })}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{intl.formatMessage({ id: 'settings.billing.invoices.date' })}</TableHead>
                  <TableHead>{intl.formatMessage({ id: 'settings.billing.invoices.description' })}</TableHead>
                  <TableHead>{intl.formatMessage({ id: 'settings.billing.invoices.amount' })}</TableHead>
                  <TableHead>{intl.formatMessage({ id: 'settings.billing.invoices.status' })}</TableHead>
                  <TableHead className="text-right">{intl.formatMessage({ id: 'settings.billing.invoices.actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {formatDate(invoice.date)}
                    </TableCell>
                    <TableCell>{invoice.description || 'Subscription payment'}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount / 100, invoice.currency)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'default'
                            : invoice.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.invoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            {intl.formatMessage({ id: 'settings.billing.invoices.download' })}
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{intl.formatMessage({ id: 'settings.billing.invoices.noInvoices' })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'settings.billing.actions.cancel' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'settings.billing.subscription.cancelWarning' })}
              {subscription && formatDate(subscription.currentPeriodEnd) && ` ${formatDate(subscription.currentPeriodEnd)}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'settings.billing.subscription.keepSubscription' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {intl.formatMessage({ id: 'settings.billing.actions.canceling' })}
                </>
              ) : (
                intl.formatMessage({ id: 'settings.billing.actions.cancel' })
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingSettings;
