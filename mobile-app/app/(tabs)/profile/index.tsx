import { billingApi, type BillingMe } from '@/api/billing';
import { certificatesApi, type AppCertificate } from '@/api/certificates';
import type { City } from '@/api/cities';
import { ThemedText } from '@/components/themed-text';
import { CityPicker } from '@/components/ui/city-picker';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { prefersDarkTariffText } from '@/lib/tariff-contrast';
import { useAuth } from '@/contexts/auth-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useTheme } from '@/contexts/theme-context';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { useAppTheme, useGlass, useGlow } from '@/hooks/use-theme-color';
import { updateMe } from '@/lib/auth-api';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

function UnreadNotificationBadge({
  count,
  backgroundColor,
  textColor,
}: {
  count: number;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.unreadBadge, { backgroundColor }]}>
      <ThemedText
        type="caption"
        style={[styles.unreadBadgeText, { color: textColor, fontSize: count > 99 ? 9 : 12 }]}
      >
        {count > 99 ? '99+' : count}
      </ThemedText>
    </View>
  );
}

function ProfileRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onPress,
  showChevron = true,
  isLast = false,
  textColor,
  isLoading = false,
  unreadCount = 0,
}: {
  icon: IconSymbolName;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
  isLast?: boolean;
  textColor?: string;
  isLoading?: boolean;
  unreadCount?: number;
}) {
  const { text, neutralSoft, borderVariant, elevated1, primary, onPrimary } = useAppTheme();

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={unreadCount > 0 ? `${label}, непрочитанных: ${unreadCount}` : undefined}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: elevated1 },
        ]}
      >
        <View style={[styles.rowIconContainer, { backgroundColor: iconBg }]}>
          <IconSymbol name={icon} size={18} color={iconColor} />
        </View>
        <ThemedText style={[styles.rowLabel, textColor ? { color: textColor } : { color: text }]}>
          {label}
        </ThemedText>
        {unreadCount > 0 ? (
          <UnreadNotificationBadge count={unreadCount} backgroundColor={primary} textColor={onPrimary} />
        ) : value ? (
          <ThemedText style={[styles.rowValue, { color: neutralSoft }]}>
            {value}
          </ThemedText>
        ) : null}
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} style={styles.rowChevron} />
        ) : showChevron ? (
          <IconSymbol name="chevron.right" size={14} color={neutralSoft} style={styles.rowChevron} />
        ) : (
          <View style={styles.rowChevronSpacer} />
        )}
      </Pressable>
      {!isLast && <View style={[styles.rowDivider, { backgroundColor: borderVariant }]} />}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { themePreference, setThemePreference } = useTheme();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [certificate, setCertificate] = useState<AppCertificate | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const {
    primary,
    neutralSoft,
    error: dangerColor,
    success,
    warning,
    accentPurple,
    neutral,
    warningContainer,
    primaryContainer,
    successContainer,
    accentPurpleContainer,
    elevated1,
    elevated2,
    borderVariant,
  } = useAppTheme();
  const glass = useGlass();
  const glow = useGlow();
  const { contentPaddingBottom } = useNavRail();
  const { unreadCount: unreadNotifications, refreshUnread } = useNotifications();

  const loadBilling = useCallback(() => {
    void billingApi
      .me()
      .then(setBilling)
      .catch(() => setBilling(null));
  }, []);

  const loadCertificate = useCallback(() => {
    void certificatesApi
      .my()
      .then((list) => setCertificate(list[0] ?? null))
      .catch(() => setCertificate(null));
  }, []);

  const accountName =
    user?.full_name ||
    (user?.email ? String(user.email).split('@')[0] : null) ||
    'Студент';

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const tariffColor = billing?.effectColor && /^#[0-9a-f]{6}$/i.test(billing.effectColor) ? billing.effectColor : null;
  const badgeTextColor = tariffColor ? (prefersDarkTariffText(tariffColor) ? Colors.light.shadow : Colors.light.white) : primary;
  const initials = getInitials(accountName);
  const { response: avatarUri } = useFileImage(user?.avatar_key ?? '');

  useFocusEffect(
    useCallback(() => {
      loadBilling();
      loadCertificate();
      refreshUnread();
    }, [loadBilling, loadCertificate, refreshUnread]),
  );

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('signOut', e);
      Alert.alert('Ошибка', 'Не удалось выйти из учётной записи');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <ScreenBackground style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <Animated.View entering={staggerEnter(0)}>
          <ThemedText
            type="h1"
            style={{
              textShadowColor: glow.title,
              textShadowRadius: 20,
              textShadowOffset: { width: 0, height: 0 },
              marginBottom: 16,
            }}
          >
            Профиль
          </ThemedText>
        </Animated.View>

        <Animated.View entering={staggerEnter(1)}>
          <GlassCard padding={Spacing.card} tintColor={tariffColor ?? undefined}>
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, { backgroundColor: primaryContainer }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} accessibilityLabel="Фото профиля" />
                ) : initials ? (
                  <ThemedText type="subtitle" style={{ color: primary }}>{initials}</ThemedText>
                ) : (
                  <IconSymbol name="person.fill" size={Spacing.card * 2} color={primary} />
                )}
              </View>
              <View style={styles.profileInfo}>
                <ThemedText type="defaultSemiBold">{accountName}</ThemedText>
                {user?.email ? <ThemedText type="caption" style={{ color: neutral }}>{user.email}</ThemedText> : null}
                {(user?.city || user?.occupation) ? <ThemedText type="caption" style={{ color: neutral }}>
                  {[user?.city?.label || user?.city?.name, user?.occupation ? `${user.occupation}${user.birth_year ? `, ${new Date().getFullYear() - user.birth_year} лет` : ''}` : null].filter(Boolean).join(' · ')}
                </ThemedText> : null}
                <View style={[styles.badge, {
                  backgroundColor: tariffColor ?? glass.primaryTint,
                  borderColor: tariffColor ?? glass.primaryBorder,
                }]}>
                  <IconSymbol name={tariffColor ? 'star.fill' : 'person.fill'} size={Spacing.card} color={badgeTextColor} />
                  <ThemedText type="caption" style={{ color: badgeTextColor }}>
                    {billing?.tariffTitle ?? 'Загрузка…'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Section: ПОДПИСКА */}
        <Animated.View entering={staggerEnter(3)} style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            ПОДПИСКА
          </ThemedText>
          <GlassCard padding={0} borderRadius={16}>
            <ProfileRow
              icon="star.fill"
              iconBg={warningContainer}
              iconColor={warning}
              label="Мой тарифный план"
              value={billing?.tariffTitle ?? 'Загрузка…'}
              onPress={() => router.push('/(tabs)/profile/subscription')}
              isLast={false}
            />
            <ProfileRow
              icon="ticket.fill"
              iconBg={warningContainer}
              iconColor={warning}
              label="Промокоды"
              onPress={() => router.push('/(tabs)/profile/promo-codes')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Section: АККАУНТ */}
        <Animated.View entering={staggerEnter(4)} style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            АККАУНТ
          </ThemedText>
          <GlassCard padding={0} borderRadius={16}>
            <ProfileRow
              icon="person.fill"
              iconBg={primaryContainer}
              iconColor={primary}
              label="Редактировать профиль"
              onPress={() => router.push('/(tabs)/profile/edit')}
              isLast={false}
            />
            <ProfileRow
              icon="shield.fill"
              iconBg={successContainer}
              iconColor={success}
              label="Активные сессии"
              onPress={() => router.push('/(tabs)/profile/sessions')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Section: НАСТРОЙКИ */}
        <Animated.View entering={staggerEnter(4)} style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            НАСТРОЙКИ
          </ThemedText>
          <GlassCard padding={0} borderRadius={16}>
            {/* Theme Row */}
            <ProfileRow
              icon="moon.fill"
              iconBg={accentPurpleContainer}
              iconColor={accentPurple}
              label="Тема оформления"
              value={
                themePreference === 'system'
                  ? 'Системная'
                  : themePreference === 'light'
                    ? 'Светлая'
                    : 'Тёмная'
              }
              onPress={() => setThemeOpen(!themeOpen)}
              showChevron={true}
              isLast={false}
            />

            {/* Theme Options Dropdown */}
            {themeOpen && (
              <View style={[styles.themeOptions, { backgroundColor: elevated1 }]}>
                {(['system', 'light', 'dark'] as const).map((pref, idx) => {
                  const active = themePreference === pref;
                  const label = pref === 'system' ? 'Системная' : pref === 'light' ? 'Светлая' : 'Тёмная';
                  return (
                    <Pressable
                      key={pref}
                      onPress={() => {
                        void setThemePreference(pref);
                        setThemeOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.themeOptionRow,
                        { borderBottomColor: borderVariant },
                        pressed && { backgroundColor: elevated1 },
                        idx === 2 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.themeOptionLabel,
                          active && { color: primary, fontWeight: '600' },
                        ]}
                      >
                        {label}
                      </ThemedText>
                      {active && (
                        <IconSymbol name="checkmark" size={16} color={primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Language Row */}
            <ProfileRow
              icon="globe"
              iconBg={primaryContainer}
              iconColor={primary}
              label="Язык приложения"
              value="Русский"
              onPress={() => Alert.alert('Язык', 'В данный момент поддерживается только русский язык')}
              isLast={false}
            />

            <ProfileRow
              icon="mappin.and.ellipse"
              iconBg={glass.dangerTint}
              iconColor={dangerColor}
              label="Город"
              value={user?.city?.label || user?.city?.name || 'Не указан'}
              onPress={() => setCityOpen(true)}
              isLast={false}
            />
            <CityPicker
              showField={false}
              open={cityOpen}
              onOpenChange={setCityOpen}
              value={
                user?.city
                  ? ({
                      id: user.city.id,
                      name: user.city.name,
                      region: user.city.region,
                      label: user.city.label,
                      address: user.city.address,
                    } satisfies City)
                  : null
              }
              onChange={(c) => {
                void updateMe({ city_id: c.id })
                  .then(() => setCityOpen(false))
                  .catch((e) =>
                    Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить'),
                  );
              }}
            />
            {/* Notifications Row */}
            <ProfileRow
              icon="bell.fill"
              iconBg={successContainer}
              iconColor={success}
              label="Уведомления"
              unreadCount={unreadNotifications}
              onPress={() => router.push('/(tabs)/profile/notifications')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Section: ПРОГРЕСС */}
        <Animated.View entering={staggerEnter(5)} style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            ПРОГРЕСС
          </ThemedText>
          <GlassCard padding={0} borderRadius={16}>
            <ProfileRow
              icon="qrcode"
              iconBg={primaryContainer}
              iconColor={primary}
              label="QR-код"
              onPress={() => router.push('/(tabs)/profile/qr-code')}
              isLast={false}
            />
            {certificate ? (
              <ProfileRow
                icon="doc.text.fill"
                iconBg={successContainer}
                iconColor={success}
                label="Мой сертификат"
                onPress={() => router.push('/(tabs)/profile/certificate')}
                isLast={false}
              />
            ) : null}
            <ProfileRow
              icon="trophy.fill"
              iconBg={warningContainer}
              iconColor={warning}
              label="Достижения и награды"
              onPress={() => router.push('/(tabs)/profile/achievements')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Section: ПОДДЕРЖКА */}
        <Animated.View entering={staggerEnter(6)} style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            ПОДДЕРЖКА
          </ThemedText>
          <GlassCard padding={0} borderRadius={16}>
            <ProfileRow
              icon="bubble.left.and.bubble.right.fill"
              iconBg={primaryContainer}
              iconColor={primary}
              label="Чат с поддержкой"
              onPress={() => router.push('/(tabs)/profile/support')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Section: О ПРИЛОЖЕНИИ */}
        <Animated.View entering={staggerEnter(7)} style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            О ПРИЛОЖЕНИИ
          </ThemedText>
          <GlassCard padding={0} borderRadius={16}>
            <ProfileRow
              icon="info.circle.fill"
              iconBg={elevated2}
              iconColor={neutral}
              label="Нормативные документы"
              onPress={() => router.push('/(tabs)/profile/legal')}
              isLast={false}
            />

            <ProfileRow
              icon="info.circle.fill"
              iconBg={elevated2}
              iconColor={neutral}
              label="О приложении"
              onPress={() => router.push('/(tabs)/profile/about')}
              isLast={false}
            />

            <ProfileRow
              icon="trash.fill"
              iconBg={glass.dangerTint}
              iconColor={dangerColor}
              label="Удалить аккаунт"
              onPress={() => router.push('/(tabs)/profile/delete-account')}
              textColor={dangerColor}
              isLast={false}
            />

            <ProfileRow
              icon="rectangle.portrait.and.arrow.right"
              iconBg={glass.dangerTint}
              iconColor={dangerColor}
              label="Выйти из аккаунта"
              onPress={() => void handleSignOut()}
              textColor={dangerColor}
              isLoading={isSigningOut}
              showChevron={false}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  unreadBadge: {
    width: 24,
    aspectRatio: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card,
  },
  avatar: {
    width: Spacing.nav,
    height: Spacing.nav,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.card / 4,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card / 4,
    paddingHorizontal: Spacing.card / 2,
    paddingVertical: Spacing.card / 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    marginRight: 8,
  },
  rowChevron: {
    marginLeft: 4,
  },
  rowChevronSpacer: {
    width: 14,
    marginLeft: 4,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    marginRight: 16,
  },
  themeOptions: {
    paddingLeft: 60,
    paddingRight: 16,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeOptionLabel: {
    fontSize: 14,
  },
});
