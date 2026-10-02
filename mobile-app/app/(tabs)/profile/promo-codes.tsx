import { promoApi } from '@/api/promo';
import { billingApi } from '@/api/billing';
import { ApiError } from '@/api/utils';
import type { ActivePromoOut } from '@/api/generated/types.gen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassInput } from '@/components/ui/glass-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { showAlert } from '@/lib/alert';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return iso;
  }
}

export default function PromoCodesScreen() {
  const { primary, neutralSoft, success, successContainer, primaryContainer } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [code, setCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [promo, setPromo] = useState<ActivePromoOut | null>(null);
  const [loadingPromo, setLoadingPromo] = useState(true);

  const loadPromo = useCallback(async () => {
    try {
      const me = await billingApi.me();
      setPromo(me.promo ?? null);
    } catch {
      setPromo(null);
    } finally {
      setLoadingPromo(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPromo();
    }, [loadPromo]),
  );

  const activate = async () => {
    const trimmed = code.trim();
    if (!trimmed || activating) return;
    setActivating(true);
    try {
      const result = await promoApi.activate(trimmed);
      setCode('');
      setPromo(result);
      showAlert('Готово', result.message);
    } catch (e) {
      showAlert('Ошибка', e instanceof ApiError ? e.detail : 'Не удалось активировать промокод');
    } finally {
      setActivating(false);
    }
  };

  const promoTarget = promo ? promo.tariffTitle ?? 'все платные тарифы' : null;

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Промокоды" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding={20} borderRadius={16}>
          <ThemedText style={styles.hint}>
            Введите промокод, чтобы получить скидку на покупку тарифа. Скидка применится
            автоматически при оплате.
          </ThemedText>
          <GlassInput
            label="Промокод"
            icon="ticket.fill"
            placeholder="XXXX-XXXX"
            value={code}
            onChangeText={(t) => setCode(t)}
            autoCapitalize="none"
          />
          <Button
            title={activating ? 'Активация…' : 'Активировать'}
            onPress={() => void activate()}
            disabled={!code.trim() || activating}
            fullWidth
            size="large"
          />
        </GlassCard>

        {loadingPromo ? (
          <ActivityIndicator color={primary} style={styles.loader} />
        ) : promo ? (
          <GlassCard padding={20} borderRadius={16} style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View style={[styles.activeIconBg, { backgroundColor: primaryContainer }]}>
                <IconSymbol name="ticket.fill" size={18} color={primary} />
              </View>
              <View style={styles.activeInfo}>
                <ThemedText type="caption" style={{ color: neutralSoft }}>
                  Активный купон
                </ThemedText>
                <ThemedText style={styles.activeCode}>{promo.code}</ThemedText>
              </View>
              <View style={[styles.discountBadge, { backgroundColor: successContainer }]}>
                <ThemedText style={[styles.discountText, { color: success }]}>−{promo.discountPercent}%</ThemedText>
              </View>
            </View>
            <ThemedText type="caption" style={[styles.activeMeta, { color: neutralSoft }]}>
              На «{promoTarget}»
              {promo.validUntil ? ` · до ${formatDate(promo.validUntil)}` : ''}
            </ThemedText>
          </GlassCard>
        ) : null}
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
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    opacity: 0.9,
  },
  loader: {
    marginTop: 16,
  },
  activeCard: {},
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInfo: {
    flex: 1,
  },
  activeCode: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  discountBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeMeta: {
    fontSize: 12,
    marginTop: 10,
  },
});
