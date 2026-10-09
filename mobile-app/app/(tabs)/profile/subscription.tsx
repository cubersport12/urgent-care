import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import {
  billingApi,
  PAYMENT_STATUS_LABELS,
  type BillingMe,
  type BillingPayment,
  type BillingTariff,
} from '@/api/billing';
import { ApiError } from '@/api/utils';
import { showConfirm } from '@/lib/alert';
import {
  billingReturnUrl,
  openYookassaCheckout,
  pollPaymentUntilSettled,
  rustoreCheckout,
  rustoreCheckoutError,
} from '@/lib/billing-checkout';
import { useAppTheme, useGlass, useGlow } from '@/hooks/use-theme-color';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { ActivePromoOut } from '@/api/generated/types.gen';

function formatDate(iso: string): string {
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

/** Зеркало backend discounted_price: округление до копеек, минимум 1 ₽. */
function discountedPrice(priceRub: number, percent: number): number {
  return Math.max(1, Math.round(priceRub * (100 - percent)) / 100);
}

function promoForTariff(promo: ActivePromoOut | null | undefined, tariff: BillingTariff) {
  if (!promo || tariff.priceRub <= 0) return null;
  if (promo.tariffId != null && promo.tariffId !== tariff.id) return null;
  return promo;
}

function formatPaymentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SubscriptionScreen() {
  const {
    primary,
    neutralSoft,
    text,
    error: dangerColor,
    success,
    warning,
    neutral,
    warningContainer,
    primaryContainer,
    successContainer,
    elevated1,
    elevated2,
    borderVariant,
    onPrimary,
  } = useAppTheme();
  const glass = useGlass();
  const glow = useGlow();
  const { contentPaddingBottom } = useNavRail();
  const { paid } = useLocalSearchParams<{ paid?: string }>();
  const router = useRouter();

  const [tariffs, setTariffs] = useState<BillingTariff[]>([]);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncingPendingRef = useRef(false);

  const refresh = useCallback(async () => {
    const [list, billingMe, paymentList] = await Promise.all([
      billingApi.listTariffs(),
      billingApi.me(),
      billingApi.listPayments(),
    ]);
    setTariffs([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.rank - b.rank));
    setMe(billingMe);
    setPayments(paymentList);
  }, []);

  const syncPendingPayments = useCallback(
    async ({ toastOnSuccess = false }: { toastOnSuccess?: boolean } = {}) => {
      if (syncingPendingRef.current) return;
      syncingPendingRef.current = true;
      try {
        const list = await billingApi.listPayments();
        const pending = list.filter((p) => p.status === 'pending');
        let activated = false;
        for (const p of pending) {
          try {
            const updated = await pollPaymentUntilSettled(p.id, {
              maxAttempts: 3,
              intervalMs: 1500,
            });
            if (updated.status === 'succeeded') {
              activated = true;
            }
          } catch {
            // continue
          }
        }
        await refresh();
        if (activated && toastOnSuccess) {
          Alert.alert('Успешно', 'Оплата подтверждена');
        }
      } catch {
        // ignore
      } finally {
        syncingPendingRef.current = false;
      }
    },
    [refresh],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.detail : 'Не удалось загрузить тарифы');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) void syncPendingPayments({ toastOnSuccess: paid === '1' });
    }, [loading, paid, syncPendingPayments]),
  );

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active' && !loading) void syncPendingPayments();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [loading, syncPendingPayments]);

  const runSubscribe = async (tariff: BillingTariff) => {
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

      // Форму чекаута подсказывает бекенд: rustoreProductId → SDK RuStore,
      // confirmationUrl → браузер ЮKassa
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
  };

  const subscribe = (tariff: BillingTariff) => {
    if (me?.tariffId === tariff.id) return;
    // Переход на тариф выше при активном платном тарифе проходит мгновенно —
    // предупреждаем о списании и о том, что остаток дней сгорает
    const isUpgrade = me?.status === 'active' && me.priceRub > 0 && tariff.rank > me.rank;
    if (isUpgrade) {
      showConfirm(
        'Переход на тариф выше',
        'Тариф сменится сразу после оплаты. Остаток дней текущего тарифа при этом сгорает и не возвращается.',
        () => void runSubscribe(tariff),
        'Продолжить',
      );
      return;
    }
    void runSubscribe(tariff);
  };

  const performCancelRenewal = async () => {
    setBusyId('cancel');
    try {
      const next = await billingApi.cancel();
      setMe(next);
      Alert.alert('Готово', 'Автопродление отключено');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof ApiError ? e.detail : 'Не удалось отменить');
    } finally {
      setBusyId(null);
    }
  };

  const cancelRenewal = () => {
    const message = 'Доступ сохранится до конца оплаченного периода.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Отменить автопродление?\n\n${message}`)) {
        void performCancelRenewal();
      }
      return;
    }
    Alert.alert('Отменить автопродление?', message, [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: () => void performCancelRenewal(),
      },
    ]);
  };

  const syncOne = async (paymentId: string) => {
    setBusyId(paymentId);
    try {
      await pollPaymentUntilSettled(paymentId, { maxAttempts: 5, intervalMs: 1500 });
      await refresh();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof ApiError ? e.detail : 'Не удалось проверить платёж');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <ScreenBackground style={styles.root}>
        <ScreenAppBar title="Подписка" backFallbackHref="/(tabs)/profile" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      </ScreenBackground>
    );
  }

  if (error) {
    return (
      <ScreenBackground style={styles.root}>
        <ScreenAppBar title="Подписка" backFallbackHref="/(tabs)/profile" />
        <View style={styles.centered}>
          <ThemedText style={{ color: dangerColor }}>{error}</ThemedText>
          <Pressable
            onPress={() => {
              setLoading(true);
              setError(null);
              void refresh().finally(() => setLoading(false));
            }}
            style={[styles.btn, { backgroundColor: primary }]}
          >
            <ThemedText style={[styles.btnText, { color: onPrimary }]}>Повторить</ThemedText>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Подписка" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Subscription Section */}
        {me ? (
          <Animated.View entering={FadeInUp.duration(400)}>
            <GlassCard padding={20} borderRadius={16} style={styles.currentCard}>
              <View style={styles.currentHeader}>
                <View style={styles.currentTitleRow}>
                  <View
                    style={[
                      styles.currentIconBg,
                      {
                        backgroundColor:
                          me.priceRub > 0 ? warningContainer : primaryContainer,
                      },
                    ]}
                  >
                    <IconSymbol
                      name={me.priceRub > 0 ? 'star.fill' : 'person.fill'}
                      size={18}
                      color={me.priceRub > 0 ? warning : primary}
                    />
                  </View>
                  <View>
                    <ThemedText type="caption" style={{ color: neutralSoft }}>
                      Текущий тариф
                    </ThemedText>
                    <ThemedText style={styles.currentPlanTitle}>{me.tariffTitle}</ThemedText>
                  </View>
                </View>

                {/* Subscription Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        me.priceRub > 0
                          ? me.cancelAtPeriodEnd
                            ? warningContainer
                            : successContainer
                          : elevated2,
                      borderColor:
                        me.priceRub > 0
                          ? me.cancelAtPeriodEnd
                            ? glass.warningBorder
                            : glass.successBorder
                          : glass.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          me.priceRub > 0
                            ? me.cancelAtPeriodEnd
                              ? warning
                              : success
                            : neutral,
                      },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.statusText,
                      {
                        color:
                          me.priceRub > 0
                            ? me.cancelAtPeriodEnd
                              ? warning
                              : success
                            : neutral,
                      },
                    ]}
                  >
                    {me.priceRub > 0
                      ? me.cancelAtPeriodEnd
                        ? 'Без продления'
                        : 'Активна'
                      : 'Базовый'}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.cardDivider, { backgroundColor: borderVariant }]} />

              <View style={styles.currentDetails}>
                <View style={styles.detailRow}>
                  <IconSymbol name="clock.fill" size={14} color={neutralSoft} />
                  <ThemedText style={[styles.detailText, { color: text }]}>
                    {me.priceRub > 0
                      ? `Оплачен до ${formatDate(me.currentPeriodEnd)}`
                      : 'Бесплатный неограниченный доступ'}
                  </ThemedText>
                </View>

                {me.scheduledTariffTitle && me.scheduledEffectiveAt ? (
                  <View style={[styles.detailRow, { marginTop: 6 }]}>
                    <IconSymbol name="star.fill" size={14} color={warning} />
                    <ThemedText style={[styles.detailText, { color: warning }]}>
                      Запланирован переход на {me.scheduledTariffTitle} с {formatDate(me.scheduledEffectiveAt)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {me.priceRub > 0 && !me.cancelAtPeriodEnd ? (
                <Pressable
                  onPress={() => cancelRenewal()}
                  disabled={busyId === 'cancel'}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Отменить автопродление"
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    {
                      borderColor: glass.dangerBorder,
                      backgroundColor: pressed ? glass.dangerTint : 'transparent',
                    },
                  ]}
                >
                  {busyId === 'cancel' ? (
                    <ActivityIndicator size="small" color={dangerColor} />
                  ) : (
                    <>
                      <IconSymbol name="xmark.circle.fill" size={14} color={dangerColor} />
                      <ThemedText style={[styles.cancelBtnText, { color: dangerColor }]}>
                        Отменить автопродление
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              ) : null}
            </GlassCard>
          </Animated.View>
        ) : null}

        {/* Tariffs Section */}
        <View style={styles.sectionHeaderWrap}>
          <ThemedText type="h2" style={styles.sectionTitle}>
            Доступные тарифы
          </ThemedText>
          <ThemedText type="caption" style={[styles.sectionSubtitle, { color: neutralSoft }]}>
            Выберите подходящий уровень доступа для обучения
          </ThemedText>
          {me?.promo ? (
            <View style={styles.promoRow}>
              <IconSymbol name="ticket.fill" size={14} color={success} />
              <ThemedText style={[styles.promoText, { color: success }]}>
                Промокод {me.promo.code} · −{me.promo.discountPercent}% применён к цене
              </ThemedText>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/(tabs)/profile/promo-codes')} hitSlop={6}>
              <ThemedText style={[styles.promoLink, { color: primary }]}>
                Есть промокод? Ввести →
              </ThemedText>
            </Pressable>
          )}
        </View>

        {tariffs.map((tariff, index) => {
          const isCurrent = me?.tariffId === tariff.id;
          const isScheduled = me?.scheduledTariffId === tariff.id;
          const canSelect = !isCurrent && !me?.scheduledTariffId;
          const isPremium = tariff.priceRub > 0;
          const activePromo = promoForTariff(me?.promo, tariff);
          const discounted = activePromo ? discountedPrice(tariff.priceRub, activePromo.discountPercent) : null;

          return (
            <Animated.View key={tariff.id} entering={FadeInUp.delay(100 * (index + 1)).duration(400)}>
              <GlassCard
                padding={20}
                borderRadius={16}
                style={[
                  styles.tariffCard,
                  isCurrent && { borderColor: glass.primaryBorder, borderWidth: 1.5 },
                  isPremium && !isCurrent && { borderColor: glass.warningBorder, borderWidth: 1 },
                ]}
              >
                {/* ponytail: badge when tariff has isPopular / similar flag from API
                    (bg warningContainer, иконка и текст warning) */}

                <View style={styles.tariffHeader}>
                  <View style={styles.tariffTitleWrap}>
                    <ThemedText style={styles.tariffTitle}>{tariff.title}</ThemedText>
                    {activePromo ? (
                      <ThemedText style={[styles.promoBadge, { color: success, backgroundColor: successContainer }]}>
                        промокод −{activePromo.discountPercent}%
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.priceContainer}>
                    {discounted != null ? (
                      <>
                        <ThemedText style={[styles.priceVal, styles.priceValOld, { color: neutralSoft }]}>
                          {tariff.priceRub} ₽
                        </ThemedText>
                        <ThemedText style={[styles.priceVal, { color: success }]}>
                          {discounted} ₽
                        </ThemedText>
                      </>
                    ) : (
                      <ThemedText style={styles.priceVal}>
                        {tariff.priceRub > 0 ? `${tariff.priceRub} ₽` : 'Бесплатно'}
                      </ThemedText>
                    )}
                    {tariff.priceRub > 0 && (
                      <ThemedText type="caption" style={[styles.pricePeriod, { color: neutralSoft }]}>
                        / {tariff.periodDays} дн.
                      </ThemedText>
                    )}
                  </View>
                </View>

                {tariff.description ? (
                  <ThemedText style={[styles.tariffDesc, { color: neutralSoft }]}>
                    {tariff.description}
                  </ThemedText>
                ) : null}

                {/* Tariff Button */}
                {isCurrent ? (
                  <View style={[styles.tariffStatusBox, { backgroundColor: glass.primaryTint, marginTop: tariff.description ? 0 : 16 }]}>
                    <IconSymbol name="checkmark" size={14} color={primary} />
                    <ThemedText style={[styles.tariffStatusText, { color: primary }]}>
                      Ваш текущий тариф
                    </ThemedText>
                  </View>
                ) : isScheduled ? (
                  <View style={[styles.tariffStatusBox, { backgroundColor: elevated1, marginTop: tariff.description ? 0 : 16 }]}>
                    <IconSymbol name="clock.fill" size={14} color={neutralSoft} />
                    <ThemedText style={[styles.tariffStatusText, { color: neutralSoft }]}>
                      Запланирован к переходу
                    </ThemedText>
                  </View>
                ) : canSelect && tariff.priceRub > 0 ? (
                  <Pressable
                    onPress={() => void subscribe(tariff)}
                    disabled={busyId === tariff.id}
                    style={({ pressed }) => [
                      styles.subscribeBtn,
                      {
                        backgroundColor: isPremium ? warning : primary,
                        opacity: busyId === tariff.id ? 0.6 : pressed ? 0.85 : 1,
                        marginTop: tariff.description ? 0 : 16,
                      },
                    ]}
                  >
                    {busyId === tariff.id ? (
                      <ActivityIndicator size="small" color={onPrimary} />
                    ) : (
                      <ThemedText style={[styles.subscribeBtnText, { color: onPrimary }]}>
                        {me && me.priceRub > 0 ? 'Сменить тариф' : 'Подключить тариф'}
                      </ThemedText>
                    )}
                  </Pressable>
                ) : canSelect && tariff.priceRub <= 0 && me && me.priceRub > 0 ? (
                  <View style={[styles.tariffStatusBox, { backgroundColor: elevated1, marginTop: tariff.description ? 0 : 16 }]}>
                    <ThemedText style={[styles.tariffStatusText, { color: neutralSoft, fontSize: 12, textAlign: 'center' }]}>
                      Станет доступен после окончания текущего периода
                    </ThemedText>
                  </View>
                ) : null}
              </GlassCard>
            </Animated.View>
          );
        })}

        {/* Payment History Section */}
        <View style={[styles.sectionHeaderWrap, { marginTop: 28 }]}>
          <ThemedText type="h2" style={styles.sectionTitle}>
            История платежей
          </ThemedText>
        </View>

        {payments.length === 0 ? (
          <GlassCard padding={20} borderRadius={16} style={styles.emptyPayments}>
            <IconSymbol name="doc.text.fill" size={24} color={neutralSoft} />
            <ThemedText style={[styles.emptyPaymentsText, { color: neutralSoft }]}>
              Платежей пока нет
            </ThemedText>
          </GlassCard>
        ) : (
          <GlassCard padding={0} borderRadius={16} style={styles.paymentsCard}>
            {payments.map((p, idx) => {
              const isSucceeded = p.status === 'succeeded';
              const isPending = p.status === 'pending';
              const isFailed = p.status === 'canceled' || p.status === 'failed';

              return (
                <View key={p.id}>
                  <View style={styles.paymentRow}>
                    <View
                      style={[
                        styles.paymentIconBg,
                        {
                          backgroundColor: isSucceeded
                            ? successContainer
                            : isPending
                              ? warningContainer
                              : glass.dangerTint,
                        },
                      ]}
                    >
                      <IconSymbol
                        name={
                          isSucceeded
                            ? 'checkmark.circle.fill'
                            : isPending
                              ? 'clock.fill'
                              : 'xmark.circle.fill'
                        }
                        size={16}
                        color={isSucceeded ? success : isPending ? warning : dangerColor}
                      />
                    </View>

                    <View style={styles.paymentInfo}>
                      <View style={styles.paymentAmountRow}>
                        <ThemedText style={styles.paymentAmount}>{p.amountRub} ₽</ThemedText>
                        <ThemedText
                          style={[
                            styles.paymentStatusText,
                            {
                              color: isSucceeded ? success : isPending ? warning : dangerColor,
                            },
                          ]}
                        >
                          {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                        </ThemedText>
                      </View>
                      <ThemedText type="caption" style={{ color: neutralSoft }}>
                        {formatPaymentDate(p.createdAt)}
                      </ThemedText>
                    </View>

                    {isPending ? (
                      <Pressable
                        onPress={() => void syncOne(p.id)}
                        disabled={busyId === p.id}
                        style={({ pressed }) => [
                          styles.checkBtn,
                          {
                            borderColor: primary,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        {busyId === p.id ? (
                          <ActivityIndicator size="small" color={primary} />
                        ) : (
                          <ThemedText style={[styles.checkBtnText, { color: primary }]}>
                            Проверить
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                  {idx < payments.length - 1 && (
                    <View style={[styles.paymentDivider, { backgroundColor: borderVariant }]} />
                  )}
                </View>
              );
            })}
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  /* Current Plan Card */
  currentCard: {
    marginBottom: 8,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  currentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 16,
    minHeight: 38,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Section Header */
  sectionHeaderWrap: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  promoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  promoLink: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  /* Tariff Cards */
  tariffCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  tariffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tariffTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tariffTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingRight: 8,
  },
  promoBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  priceValOld: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  priceVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: 12,
    marginLeft: 2,
  },
  tariffDesc: {
    fontSize: 13,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  subscribeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
  },
  subscribeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tariffStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
  },
  tariffStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Payments Section */
  emptyPayments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyPaymentsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentsCard: {
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paymentIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    marginRight: 16,
  },
});
