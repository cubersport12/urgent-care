import {
  billingApi,
  PAYMENT_STATUS_LABELS,
  type BillingMe,
  type BillingTariff,
} from '@/api/billing';
import { ApiError } from '@/api/utils';
import { showConfirm } from '@/lib/alert';
import {
  billingReturnUrl,
  openYookassaCheckout,
  rustoreCheckout,
  rustoreCheckoutError,
} from '@/lib/billing-checkout';
import { Alert } from 'react-native';

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Состояние биллинга экрана, нужное для оформления подписки. */
export type SubscribeContext = {
  me: BillingMe | null;
  refresh: () => Promise<void>;
  setBusyId: (id: string | null) => void;
};

/** Оформление подписки. Форму чекаута подсказывает бекенд:
 *  rustoreProductId → SDK RuStore, confirmationUrl → браузер ЮKassa. */
export async function runSubscribe(
  tariff: BillingTariff,
  { me, refresh, setBusyId }: SubscribeContext,
) {
  if (me?.tariffId === tariff.id) return;
  setBusyId(tariff.id);
  try {
    const returnUrl = billingReturnUrl();
    const result = await billingApi.subscribe(tariff.id, { returnUrl });

    if (result.scheduled) {
      await refresh();
      Alert.alert(
        'Смена тарифа',
        result.message ??
          (result.scheduledEffectiveAt
            ? `Смена запланирована на ${formatDate(result.scheduledEffectiveAt)}`
            : 'Смена тарифа запланирована на конец периода'),
      );
      return;
    }

    if (result.rustoreProductId && result.paymentId) {
      try {
        await rustoreCheckout(result.paymentId, result.rustoreProductId);
        await refresh();
        Alert.alert('Успешно', 'Подписка оформлена');
      } catch (e) {
        await refresh();
        Alert.alert('Оплата RuStore', rustoreCheckoutError(e));
      }
      return;
    }

    if (result.confirmationUrl && result.paymentId) {
      const { payment } = await openYookassaCheckout(
        result.confirmationUrl,
        result.paymentId,
        returnUrl,
      );
      await refresh();
      if (payment?.status === 'succeeded') {
        Alert.alert('Успешно', 'Оплата прошла успешно');
      } else if (payment?.status === 'pending') {
        Alert.alert(
          'Ожидание',
          'Оплата ещё обрабатывается. Нажмите «Проверить» у платежа.',
        );
      } else if (payment && payment.status !== 'pending') {
        Alert.alert('Статус оплаты', PAYMENT_STATUS_LABELS[payment.status] ?? payment.status);
      }
      return;
    }

    await refresh();
    if (result.mock) {
      Alert.alert(
        'Тест без платежной системы',
        result.message ??
          'Тариф активирован без оплаты (в API не заданы ключи провайдера).',
      );
    } else {
      Alert.alert('Готово', result.message ?? 'Тариф активирован');
    }
  } catch (e) {
    Alert.alert('Ошибка', e instanceof ApiError ? e.detail : 'Не удалось оформить подписку');
  } finally {
    setBusyId(null);
  }
}

/** Подписка с подтверждением: переход на тариф выше при активном платном
 *  тарифе проходит мгновенно — предупреждаем о списании и сгорании дней. */
export function subscribeTariff(tariff: BillingTariff, ctx: SubscribeContext) {
  const { me } = ctx;
  if (me?.tariffId === tariff.id) return;
  const isUpgrade = me?.status === 'active' && me.priceRub > 0 && tariff.rank > me.rank;
  if (isUpgrade) {
    showConfirm(
      'Переход на тариф выше',
      'Тариф сменится сразу после оплаты. Остаток дней текущего тарифа при этом сгорает и не возвращается.',
      () => void runSubscribe(tariff, ctx),
      'Продолжить',
    );
    return;
  }
  void runSubscribe(tariff, ctx);
}
