import { type BillingMe, type BillingTariff } from '@/api/billing';
import type { ActivePromoOut } from '@/api/generated/types.gen';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

/** Зеркало backend discounted_price: округление до копеек, минимум 1 ₽. */
function discountedPrice(priceRub: number, percent: number): number {
  return Math.max(1, Math.round(priceRub * (100 - percent)) / 100);
}

function promoForTariff(promo: ActivePromoOut | null | undefined, tariff: BillingTariff) {
  if (!promo || tariff.priceRub <= 0) return null;
  if (promo.tariffId != null && promo.tariffId !== tariff.id) return null;
  return promo;
}

type TariffCardProps = {
  tariff: BillingTariff;
  /** Текущая подписка пользователя: статус карточки, промо и текст кнопки. */
  me: BillingMe | null;
  busyId: string | null;
  onSubscribe: (tariff: BillingTariff) => void;
};

/** Карточка тарифа с кнопкой подключения — экран подписки и диалог замка. */
export function TariffCard({ tariff, me, busyId, onSubscribe }: TariffCardProps) {
  const {
    primary,
    neutralSoft,
    success,
    successContainer,
    warning,
    elevated1,
    onPrimary,
  } = useAppTheme();
  const glass = useGlass();

  const isCurrent = me?.tariffId === tariff.id;
  const isScheduled = me?.scheduledTariffId === tariff.id;
  const canSelect = !isCurrent && !me?.scheduledTariffId;
  const isPremium = tariff.priceRub > 0;
  const activePromo = promoForTariff(me?.promo, tariff);
  const discounted = activePromo
    ? discountedPrice(tariff.priceRub, activePromo.discountPercent)
    : null;
  const features = [...(tariff.features ?? [])].sort(
    (a, b) => Number(b.included) - Number(a.included),
  );
  const hasDetails = Boolean(tariff.description) || features.length > 0;

  return (
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
        <ThemedText
          style={[styles.tariffDesc, { color: neutralSoft, marginBottom: features.length > 0 ? 0 : 16 }]}
        >
          {tariff.description}
        </ThemedText>
      ) : null}

      {/* Особенности: входящие в тариф — с зелёной галочкой, остальные — серым с замком */}
      {features.length > 0 ? (
        <View style={styles.featureList}>
          {features.map((f) => (
            <View key={f.id} style={styles.featureRow}>
              <IconSymbol
                name={f.included ? 'checkmark' : 'lock.fill'}
                size={12}
                color={f.included ? success : neutralSoft}
                style={styles.featureIcon}
              />
              <ThemedText
                type="caption"
                style={[styles.featureText, !f.included && { color: neutralSoft }]}
              >
                {f.description}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Tariff Button */}
      {isCurrent ? (
        <View style={[styles.tariffStatusBox, { backgroundColor: glass.primaryTint, marginTop: hasDetails ? 0 : 16 }]}>
          <IconSymbol name="checkmark" size={14} color={primary} />
          <ThemedText style={[styles.tariffStatusText, { color: primary }]}>
            Ваш текущий тариф
          </ThemedText>
        </View>
      ) : isScheduled ? (
        <View style={[styles.tariffStatusBox, { backgroundColor: elevated1, marginTop: hasDetails ? 0 : 16 }]}>
          <IconSymbol name="clock.fill" size={14} color={neutralSoft} />
          <ThemedText style={[styles.tariffStatusText, { color: neutralSoft }]}>
            Запланирован к переходу
          </ThemedText>
        </View>
      ) : canSelect && tariff.priceRub > 0 ? (
        <Pressable
          onPress={() => onSubscribe(tariff)}
          disabled={busyId === tariff.id}
          style={({ pressed }) => [
            styles.subscribeBtn,
            {
              backgroundColor: isPremium ? warning : primary,
              opacity: busyId === tariff.id ? 0.6 : pressed ? 0.85 : 1,
              marginTop: hasDetails ? 0 : 16,
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
        <View style={[styles.tariffStatusBox, { backgroundColor: elevated1, marginTop: hasDetails ? 0 : 16 }]}>
          <ThemedText style={[styles.tariffStatusText, { color: neutralSoft, fontSize: 12, textAlign: 'center' }]}>
            Станет доступен после окончания текущего периода
          </ThemedText>
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
  featureList: {
    marginTop: 6,
    marginBottom: 16,
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  // Иконка 12px в строке текста с lineHeight 16: marginTop = (16 − 12) / 2 — центр
  // иконки совпадает с центром первой строки (при переносе строк — с первой строкой)
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    lineHeight: 16,
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
});
