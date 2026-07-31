import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useImmersive } from '@/contexts/immersive-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top toast when a notification arrives. Hidden during immersive content
 * (article / test / rescue) and on the notifications screen itself.
 */
export function GlobalNotificationBanner() {
  const { banner, dismissBanner } = useNotifications();
  const { isImmersive } = useImmersive();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primary, text, neutralSoft } = useAppTheme();
  const glass = useGlass();

  const onNotificationsScreen = pathname?.includes('notifications') ?? false;
  const hidden = !banner || isImmersive || onNotificationsScreen;

  useEffect(() => {
    if (hidden || !banner) return;
    const t = setTimeout(() => dismissBanner(), 6000);
    return () => clearTimeout(t);
  }, [banner, hidden, dismissBanner]);

  if (hidden || !banner) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(280)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="box-none"
      style={[
        styles.wrap,
        Platform.OS === 'web' ? styles.wrapWeb : styles.wrapNative,
        { paddingTop: Math.max(insets.top, 8) + 4 },
      ]}
    >
      <Pressable
        onPress={() => {
          dismissBanner();
          router.push('/(tabs)/profile/notifications');
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: glass.background,
            borderColor: glass.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
          <IconSymbol name="bell.fill" size={16} color={primary} />
        </View>
        <View style={styles.body}>
          <ThemedText style={[styles.title, { color: text }]} numberOfLines={1}>
            {banner.title}
          </ThemedText>
          {banner.body ? (
            <ThemedText type="caption" style={{ color: neutralSoft }} numberOfLines={2}>
              {banner.body}
            </ThemedText>
          ) : null}
        </View>
        <Pressable onPress={dismissBanner} hitSlop={10} accessibilityLabel="Закрыть">
          <IconSymbol name="xmark.circle.fill" size={18} color={neutralSoft} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
  },
  // Above Expo Router / explorer stacking contexts on web
  wrapWeb: {
    position: 'fixed' as unknown as 'absolute',
    zIndex: 2147483646,
  },
  wrapNative: {
    position: 'absolute',
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
});
