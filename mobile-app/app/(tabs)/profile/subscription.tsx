import { TariffCard } from '@/components/billing/tariff-card';
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
import { pollPaymentUntilSettled } from '@/lib/billing-checkout';
import { formatDate, subscribeTariff } from '@/lib/billing-subscribe';
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

  const subscribe = (tariff: BillingTariff) => {
    subscribeTariff(tariff, { me, refresh, setBusyId });
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

        {tariffs.map((tariff, index) => (
          <Animated.View key={tariff.id} entering={FadeInUp.delay(100 * (index + 1)).duration(400)}>
            <TariffCard tariff={tariff} me={me} busyId={busyId} onSubscribe={subscribe} />
          </Animated.View>
        ))}

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
