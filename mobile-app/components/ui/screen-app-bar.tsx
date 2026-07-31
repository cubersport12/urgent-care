import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/explorer/back-button';
import { Spacing } from '@/constants/theme';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { safeGoBack } from '@/lib/tab-navigation';
import { useRouter } from 'expo-router';
import { ReactNode, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenAppBarProps = {
  title: string;
  subtitle?: string;
  /** Fallback when stack has no history (e.g. `/(tabs)/profile`) */
  backFallbackHref?: string;
  /** Force show/hide back; default: show when can go back or fallback is set */
  showBack?: boolean;
  right?: ReactNode;
};

/**
 * Top bar with optional back — use above screen content.
 * On wide layout, back is also registered for the side rail chrome.
 */
export function ScreenAppBar({
  title,
  subtitle,
  backFallbackHref,
  showBack,
  right,
}: ScreenAppBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWide } = useNavRail();
  const { text, neutralSoft } = useAppTheme();

  const canGoBack = router.canGoBack() || !!backFallbackHref;
  const visibleBack = showBack ?? canGoBack;

  const onBack = useCallback(() => {
    if (backFallbackHref) {
      safeGoBack(backFallbackHref);
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [backFallbackHref, router]);

  useChromeBack(visibleBack ? onBack : null);

  return (
    <View style={[styles.bar, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.row}>
        {visibleBack && !isWide ? (
          <BackButton onPress={onBack} />
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titles}>
          <ThemedText style={[styles.title, { color: text }]} numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="caption" style={{ color: neutralSoft }} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.right}>{right ?? <View style={styles.backSpacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.pageX,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
  },
  backSpacer: {
    width: 36,
    height: 36,
  },
  titles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  right: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
});
