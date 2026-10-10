/** Типы RuStore Pay SDK (по документации 11.1.0). */

export type ProductType =
  | 'CONSUMABLE_PRODUCT'
  | 'NON_CONSUMABLE_PRODUCT'
  | 'SUBSCRIPTION';

export type PurchaseType = 'ONE_STEP' | 'TWO_STEP';

export type AcknowledgementState = 'PENDING' | 'ACKNOWLEDGED' | 'UNKNOWN';

export type SdkTheme = 'LIGHT' | 'DARK';

export interface PurchaseParams {
  productId: string;
  /** Наш id заказа: передаём id платежа бекенда для связки на сервере. */
  orderId?: string;
  quantity?: number;
  /** Разворачивается на сервере в V4-ответе — кладём id платежа. */
  developerPayload?: string;
  appUserId?: string;
  appUserEmail?: string;
  preferredPurchaseType?: PurchaseType;
  sdkTheme?: SdkTheme;
}

export interface ProductPurchaseResult {
  orderId?: string;
  purchaseId?: string;
  productId: string;
  invoiceId?: string;
  purchaseType?: string;
  productType?: ProductType;
  quantity?: number;
  sandbox?: boolean;
}

export interface PurchasesFilter {
  productType?: ProductType;
  acknowledgementState?: AcknowledgementState;
}
