/**
 * YooKassa checkout via AuthSession + payment status polling.
 * Pattern from gymai mobile billing-checkout.
 * RuStore-покупки (rustore-сборка) идут через rustoreCheckout ниже.
 */
import { billingApi, type BillingMe, type BillingPayment } from '@/api/billing';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

/** Expo Go → exp://…/--/billing/return; standalone → troubledent://billing/return */
export function billingReturnUrl(): string {
  return Linking.createURL('billing/return');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll YooKassa via backend sync until terminal status or timeout. */
export async function pollPaymentUntilSettled(
  paymentId: string,
  {
    maxAttempts = 15,
    intervalMs = 2000,
  }: { maxAttempts?: number; intervalMs?: number } = {},
): Promise<BillingPayment> {
  let last: BillingPayment | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    last = await billingApi.syncPayment(paymentId);
    if (last.status !== 'pending') {
      return last;
    }
    if (i < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }
  return last ?? billingApi.syncPayment(paymentId);
}

export type CheckoutOutcome = {
  payment: BillingPayment | null;
  me: BillingMe;
  browserResult: WebBrowser.WebBrowserAuthSessionResult | null;
};

/**
 * Open YooKassa payment page; closes when return_url is hit (native AuthSession),
 * then syncs payment status from the API.
 */
export async function openYookassaCheckout(
  confirmationUrl: string,
  paymentId: string,
  returnUrl: string,
): Promise<CheckoutOutcome> {
  let browserResult: WebBrowser.WebBrowserAuthSessionResult | null = null;

  if (Platform.OS === 'web') {
    // AuthSession is unreliable on web; open payment page in a new tab.
    if (typeof window !== 'undefined') {
      window.open(confirmationUrl, '_blank', 'noopener,noreferrer');
    } else {
      await Linking.openURL(confirmationUrl);
    }
  } else {
    browserResult = await WebBrowser.openAuthSessionAsync(confirmationUrl, returnUrl);
  }

  // Always reconcile — user may have paid even if they dismissed the browser
  let payment: BillingPayment | null = null;
  try {
    payment = await pollPaymentUntilSettled(paymentId);
  } catch {
    try {
      payment = await billingApi.syncPayment(paymentId);
    } catch {
      payment = null;
    }
  }

  const me = await billingApi.me();
  return { payment, me, browserResult };
}

export type RustoreCheckoutOutcome = {
  payment: BillingPayment | null;
  me: BillingMe;
  cancelled: boolean;
};

/**
 * Покупка подписки через RuStore Pay SDK (только rustore-сборка).
 * developerPayload = id платежа: по нему бекенд связывает покупку с платежом.
 * Мост подгружается динамически — web-бандл не тянет нативный модуль.
 */
export async function rustoreCheckout(
  paymentId: string,
  productId: string,
): Promise<RustoreCheckoutOutcome> {
  const { RuStoreReactPay, isPurchaseCancelled } = await import('./rustore-pay');

  const result = await RuStoreReactPay.purchase({
    productId,
    orderId: paymentId,
    developerPayload: paymentId,
    preferredPurchaseType: 'ONE_STEP',
  });
  if (!result.purchaseId) {
    throw new Error('RuStore не вернул purchaseId');
  }
  // Деньги получены RuStore — подтверждаем выдачу и фиксируем на бекенде
  await RuStoreReactPay.confirm(result.purchaseId, paymentId);
  await billingApi.confirmRustore(paymentId, result.purchaseId);

  const payment = await pollPaymentUntilSettled(paymentId).catch(() => null);
  const me = await billingApi.me();
  return { payment, me, cancelled: false };
}

/** Преобразует ошибку RuStore-покупки в сообщение для пользователя. */
export function rustoreCheckoutError(err: unknown): string {
  const { isPurchaseCancelled } = require('./rustore-pay') as {
    isPurchaseCancelled: (e: unknown) => boolean;
  };
  if (isPurchaseCancelled(err)) {
    return 'Покупка отменена';
  }
  const message = (err as { message?: string } | null)?.message;
  return message ? `Оплата RuStore: ${message}` : 'Не удалось оплатить через RuStore';
}
