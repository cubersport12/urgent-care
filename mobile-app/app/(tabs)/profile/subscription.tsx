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
import {
  billingReturnUrl,
  openYookassaCheckout,
  pollPaymentUntilSettled,
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
import { useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated, { FadeInUp } from 'react-native-reanimated';

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
  const { primary, neutralSoft, text, error: dangerColor, success } = useAppTheme();
  const glass = useGlass();
  const glow = useGlow();
  const { contentPaddingBottom } = useNavRail();
  const { paid } = useLocalSearchParams<{ paid?: string }>();

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

  const subscribe = async (tariff: BillingTariff) => {
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
          'Тест без YooKassa',
          result.message ??
            'Тариф активирован без оплаты (в API не заданы YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY).',
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
            <ThemedText style={styles.btnText}>Повторить</ThemedText>
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
                          me.priceRub > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 132, 255, 0.12)',
                      },
                    ]}
                  >
                    <IconSymbol
                      name={me.priceRub > 0 ? 'star.fill' : 'person.fill'}
                      size={18}
                      color={me.priceRub > 0 ? '#F59E0B' : primary}
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
                            ? 'rgba(245, 158, 11, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(107, 114, 128, 0.1)',
                      borderColor:
                        me.priceRub > 0
                          ? me.cancelAtPeriodEnd
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(107, 114, 128, 0.2)',
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
                              ? '#F59E0B'
                              : '#10B981'
                            : '#6B7280',
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
                              ? '#F59E0B'
                              : '#10B981'
                            : '#6B7280',
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

              <View style={[styles.cardDivider, { backgroundColor: 'rgba(128,128,128,0.15)' }]} />

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
                    <IconSymbol name="star.fill" size={14} color="#F59E0B" />
                    <ThemedText style={[styles.detailText, { color: '#F59E0B' }]}>
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
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                      backgroundColor: pressed ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
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
        </View>

        {tariffs.map((tariff, index) => {
          const isCurrent = me?.tariffId === tariff.id;
          const isScheduled = me?.scheduledTariffId === tariff.id;
          const canSelect = !isCurrent && !me?.scheduledTariffId;
          const isPremium = tariff.priceRub > 0;

          return (
            <Animated.View key={tariff.id} entering={FadeInUp.delay(100 * (index + 1)).duration(400)}>
              <GlassCard
                padding={20}
                borderRadius={16}
                style={[
                  styles.tariffCard,
                  isCurrent && { borderColor: 'rgba(0, 132, 255, 0.45)', borderWidth: 1.5 },
                  isPremium && !isCurrent && { borderColor: 'rgba(245, 158, 11, 0.25)', borderWidth: 1 },
                ]}
              >
                {/* ponytail: badge when tariff has isPopular / similar flag from API */}
                {/* {isPremium && (
                  <View style={[styles.tariffBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <IconSymbol name="star.fill" size={10} color="#F59E0B" />
                    <ThemedText style={styles.tariffBadgeText}>ПОПУЛЯРНЫЙ</ThemedText>
                  </View>
                )} */}

                <View style={styles.tariffHeader}>
                  <ThemedText style={styles.tariffTitle}>{tariff.title}</ThemedText>
                  <View style={styles.priceContainer}>
                    <ThemedText style={styles.priceVal}>
                      {tariff.priceRub > 0 ? `${tariff.priceRub} ₽` : 'Бесплатно'}
                    </ThemedText>
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
                  <View style={[styles.tariffStatusBox, { backgroundColor: 'rgba(0, 132, 255, 0.08)', marginTop: tariff.description ? 0 : 16 }]}>
                    <IconSymbol name="checkmark" size={14} color={primary} />
                    <ThemedText style={[styles.tariffStatusText, { color: primary }]}>
                      Ваш текущий тариф
                    </ThemedText>
                  </View>
                ) : isScheduled ? (
                  <View style={[styles.tariffStatusBox, { backgroundColor: 'rgba(128, 128, 128, 0.08)', marginTop: tariff.description ? 0 : 16 }]}>
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
                        backgroundColor: isPremium ? '#F59E0B' : primary,
                        opacity: busyId === tariff.id ? 0.6 : pressed ? 0.85 : 1,
                        marginTop: tariff.description ? 0 : 16,
                      },
                    ]}
                  >
                    {busyId === tariff.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <ThemedText style={styles.subscribeBtnText}>
                        {me && me.priceRub > 0 ? 'Сменить тариф' : 'Подключить тариф'}
                      </ThemedText>
                    )}
                  </Pressable>
                ) : canSelect && tariff.priceRub <= 0 && me && me.priceRub > 0 ? (
                  <View style={[styles.tariffStatusBox, { backgroundColor: 'rgba(128, 128, 128, 0.05)', marginTop: tariff.description ? 0 : 16 }]}>
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
                            ? 'rgba(16, 185, 129, 0.1)'
                            : isPending
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
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
                        color={isSucceeded ? '#10B981' : isPending ? '#F59E0B' : dangerColor}
                      />
                    </View>

                    <View style={styles.paymentInfo}>
                      <View style={styles.paymentAmountRow}>
                        <ThemedText style={styles.paymentAmount}>{p.amountRub} ₽</ThemedText>
                        <ThemedText
                          style={[
                            styles.paymentStatusText,
                            {
                              color: isSucceeded ? '#10B981' : isPending ? '#F59E0B' : dangerColor,
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
                    <View style={[styles.paymentDivider, { backgroundColor: 'rgba(128,128,128,0.1)' }]} />
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
    color: '#fff',
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

  /* Tariff Cards */
  tariffCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  tariffBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
  },
  tariffBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
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
    color: '#fff',
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
