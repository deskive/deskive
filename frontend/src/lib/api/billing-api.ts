/**
 * Billing API Client
 * Handles subscription, plans, invoices, and payment methods
 */

import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Subscription,
  SubscriptionPlan,
  Invoice,
  PaymentMethod,
  CheckoutSession,
  CreateCheckoutRequest,
  CancelSubscriptionRequest,
} from '@/types/billing';

// Query Keys
export const billingKeys = {
  all: ['billing'] as const,
  subscription: (workspaceId: string) => [...billingKeys.all, 'subscription', workspaceId] as const,
  plans: () => [...billingKeys.all, 'plans'] as const,
  invoices: (workspaceId: string) => [...billingKeys.all, 'invoices', workspaceId] as const,
  paymentMethods: (workspaceId: string) => [...billingKeys.all, 'paymentMethods', workspaceId] as const,
};

// API Functions
export const billingApi = {
  /**
   * Get current subscription for a workspace
   */
  async getSubscription(workspaceId: string): Promise<Subscription> {
    return api.get<Subscription>(`/workspaces/${workspaceId}/billing/subscription`);
  },

  /**
   * Get all available subscription plans
   */
  async getPlans(workspaceId: string): Promise<SubscriptionPlan[]> {
    const response = await api.get<{ plans: SubscriptionPlan[] }>(`/workspaces/${workspaceId}/billing/plans`);
    return response.plans;
  },

  /**
   * Create Stripe checkout session
   */
  async createCheckout(
    workspaceId: string,
    data: CreateCheckoutRequest
  ): Promise<CheckoutSession> {
    return api.post<CheckoutSession>(
      `/workspaces/${workspaceId}/billing/checkout`,
      data
    );
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    workspaceId: string,
    data: CancelSubscriptionRequest
  ): Promise<Subscription> {
    return api.post<Subscription>(
      `/workspaces/${workspaceId}/billing/subscription/cancel`,
      data
    );
  },

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(workspaceId: string): Promise<Subscription> {
    return api.post<Subscription>(
      `/workspaces/${workspaceId}/billing/subscription/resume`,
      {}
    );
  },

  /**
   * Get invoices for a workspace
   */
  async getInvoices(workspaceId: string): Promise<Invoice[]> {
    return api.get<Invoice[]>(`/workspaces/${workspaceId}/billing/invoices`);
  },

  /**
   * Get payment methods for a workspace
   */
  async getPaymentMethods(workspaceId: string): Promise<PaymentMethod[]> {
    return api.get<PaymentMethod[]>(`/workspaces/${workspaceId}/billing/payment-methods`);
  },

  /**
   * Delete payment method
   */
  async deletePaymentMethod(
    workspaceId: string,
    paymentMethodId: string
  ): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/workspaces/${workspaceId}/billing/payment-methods/${paymentMethodId}`
    );
  },
};

// React Query Hooks

/**
 * Hook to get current subscription
 */
export const useSubscription = (workspaceId: string) => {
  return useQuery({
    queryKey: billingKeys.subscription(workspaceId),
    queryFn: () => billingApi.getSubscription(workspaceId),
    enabled: !!workspaceId,
  });
};

/**
 * Hook to get available plans
 */
export const usePlans = (workspaceId: string) => {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: () => billingApi.getPlans(workspaceId),
    enabled: !!workspaceId,
  });
};

/**
 * Hook to create checkout session
 */
export const useCreateCheckout = () => {
  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: CreateCheckoutRequest;
    }) => billingApi.createCheckout(workspaceId, data),
  });
};

/**
 * Hook to cancel subscription
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: CancelSubscriptionRequest;
    }) => billingApi.cancelSubscription(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription(workspaceId) });
    },
  });
};

/**
 * Hook to resume subscription
 */
export const useResumeSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => billingApi.resumeSubscription(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription(workspaceId) });
    },
  });
};

/**
 * Hook to get invoices
 */
export const useInvoices = (workspaceId: string) => {
  return useQuery({
    queryKey: billingKeys.invoices(workspaceId),
    queryFn: () => billingApi.getInvoices(workspaceId),
    enabled: !!workspaceId,
  });
};

/**
 * Hook to get payment methods
 */
export const usePaymentMethods = (workspaceId: string) => {
  return useQuery({
    queryKey: billingKeys.paymentMethods(workspaceId),
    queryFn: () => billingApi.getPaymentMethods(workspaceId),
    enabled: !!workspaceId,
  });
};

/**
 * Hook to delete payment method
 */
export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      paymentMethodId,
    }: {
      workspaceId: string;
      paymentMethodId: string;
    }) => billingApi.deletePaymentMethod(workspaceId, paymentMethodId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods(workspaceId) });
    },
  });
};
