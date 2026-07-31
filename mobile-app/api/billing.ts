/** Billing API facade over generated OpenAPI client. */
import {
  billingBillingMe,
  billingCancelSubscription,
  billingListPayments,
  billingListTariffs,
  billingSubscribe,
  billingSyncPayment,
} from '@/api/generated/sdk.gen';
import type {
  BillingMeOut,
  PaymentOut,
  SubscribeOut,
  TariffOut,
} from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type BillingMe = BillingMeOut;
export type BillingTariff = TariffOut;
export type BillingPayment = PaymentOut;
export type SubscribeResult = SubscribeOut;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает оплаты',
  succeeded: 'Оплачено',
  canceled: 'Отменено',
  expired: 'Истекло',
  failed: 'Ошибка',
};

export const billingApi = {
  listTariffs: (): Promise<BillingTariff[]> =>
    apiCall(() => billingListTariffs()),

  me: (): Promise<BillingMe> => apiCall(() => billingBillingMe()),

  subscribe: (
    tariffId: string,
    options?: { returnUrl?: string },
  ): Promise<SubscribeResult> =>
    apiCall(() =>
      billingSubscribe({
        body: {
          tariffId,
          ...(options?.returnUrl ? { returnUrl: options.returnUrl } : {}),
        },
      }),
    ),

  cancel: (): Promise<BillingMe> =>
    apiCall(() => billingCancelSubscription()),

  listPayments: (): Promise<BillingPayment[]> =>
    apiCall(() => billingListPayments()),

  syncPayment: (paymentId: string): Promise<BillingPayment> =>
    apiCall(() =>
      billingSyncPayment({
        path: { payment_id: paymentId },
      }),
    ),
};
