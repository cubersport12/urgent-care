/**
 * JS-мост над нативным RuStore Pay SDK (gradle: ru.rustore.sdk-wrapper.react-native:pay).
 * Нативный слой подключается config-плагином plugins/with-rustore-pay.js только
 * в rustore-сборке; в остальных сборках модуля нет — вызовы бросят понятную ошибку.
 *
 * ponytail: интерфейс написан по документации 11.1.0 (npm-пакета у RuStore нет,
 * JS-слой предлагается копировать из example-репозитория на gitflic, он закрыт для
 * анонимного доступа) — при интеграции сверить имена методов с нативным модулем.
 */
import { NativeModules, Platform } from 'react-native';

import type {
  AcknowledgementState,
  ProductPurchaseResult,
  PurchaseParams,
  PurchasesFilter,
} from './types';

export type {
  AcknowledgementState,
  ProductPurchaseResult,
  PurchaseParams,
  PurchasesFilter,
} from './types';

interface RuStoreReactPayNative {
  purchase(params: PurchaseParams): Promise<ProductPurchaseResult>;
  updateAcknowledgementState(
    purchaseId: string,
    acknowledgementState: AcknowledgementState,
    developerPayload?: string,
  ): Promise<void>;
  getPurchases(filter?: PurchasesFilter): Promise<ProductPurchaseResult[]>;
  isRuStoreInstalled(): Promise<boolean>;
}

const native: RuStoreReactPayNative | undefined =
  NativeModules.RuStoreReactPay ?? undefined;

/** Код ошибки SDK при отмене покупки пользователем. */
export const PURCHASE_CANCELLED_CODE = 'ProductPurchaseCancelled';

export function isRuStoreBridgeAvailable(): boolean {
  return Platform.OS === 'android' && !!native;
}

function requireNative(): RuStoreReactPayNative {
  if (!native) {
    throw new Error('RuStore Pay SDK недоступен в этой сборке');
  }
  return native;
}

/** Отменил ли пользователь покупку (не ошибка — просто закрываем шторку). */
export function isPurchaseCancelled(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === PURCHASE_CANCELLED_CODE;
}

export const RuStoreReactPay = {
  purchase: (params: PurchaseParams): Promise<ProductPurchaseResult> =>
    requireNative().purchase(params),

  confirm: (purchaseId: string, developerPayload?: string): Promise<void> =>
    requireNative().updateAcknowledgementState(
      purchaseId,
      'ACKNOWLEDGED',
      developerPayload,
    ),

  getPurchases: (filter?: PurchasesFilter): Promise<ProductPurchaseResult[]> =>
    requireNative().getPurchases(filter),

  isRuStoreInstalled: (): Promise<boolean> => requireNative().isRuStoreInstalled(),
};
