import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useImmersive } from '@/contexts/immersive-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top toast when a notification arrives. Hidden during immersive content
 * (article / test / rescue) and on the notifications screen itself.
 */
export function GlobalNotificationBanner() {
  const { banner, dismissBanner } = useNotifications();
  const { isImmersive } = useImmersive();
  const { theme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primary, text, neutralSoft, layout1, border } = useAppTheme();

  const onNotificationsScreen = pathname?.includes('notifications') ?? false;
  const hidden = !banner || isImmersive || onNotificationsScreen;
  // Opaque surface so page content cannot show through the toast.
  const cardBg = theme === 'light' ? layout1 : '#1C1C1E';

  useEffect(() => {
    if (hidden || !banner) return;
    const t = setTimeout(() => dismissBanner(), 6000);
    return () => clearTimeout(t);
  }, [banner, hidden, dismissBanner]);

  return (
    <Modal
      visible={!hidden && !!banner}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissBanner}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        {banner ? (
          <Animated.View
            entering={FadeInUp.duration(280)}
            exiting={FadeOutUp.duration(200)}
            pointerEvents="box-none"
            style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 4 }]}
          >
            <Pressable
              onPress={() => {
                dismissBanner();
                router.push('/(tabs)/profile/notifications');
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderColor: border,
                  opacity: pressed ? 0.96 : 1,
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
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  wrap: {
    paddingHorizontal: 12,
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
    shadowOpacity: 0.28,
    shadowRadius: 12,
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
