import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/explorer/back-button';
import { Spacing } from '@/constants/theme';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { safeGoBack } from '@/lib/tab-navigation';
import { useRouter } from 'expo-router';
import { ReactNode, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

type ScreenAppBarProps = {
  title: string;
  subtitle?: string;
  /** Fallback when stack has no history (e.g. `/(tabs)/profile`) */
  backFallbackHref?: string;
  /** Force show/hide back; default: show when can go back or fallback is set */
  showBack?: boolean;
  right?: ReactNode;
  onBack?: () => void;
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
  onBack: customOnBack,
}: ScreenAppBarProps) {
  const router = useRouter();
  const { text, neutralSoft } = useAppTheme();

  const canGoBack = !!customOnBack || router.canGoBack() || !!backFallbackHref;
  const visibleBack = showBack ?? canGoBack;

  const onBack = useCallback(() => {
    if (customOnBack) {
      customOnBack();
    } else if (backFallbackHref) {
      safeGoBack(backFallbackHref);
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [backFallbackHref, customOnBack, router]);

  useChromeBack(visibleBack ? onBack : null);

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {visibleBack ? (
          <BackButton onPress={onBack} />
        ) : (
          null
        )}
        <View pointerEvents="none" style={styles.titles}>
          <ThemedText
            type="defaultSemiBold"
            style={[styles.title, { color: text }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="caption" style={{ color: neutralSoft }} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.card / 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card / 2,
    minHeight: Spacing.minTouchTarget,
  },
  titles: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    maxWidth: '70%',
  },
  right: {
    alignItems: 'flex-end',
  },
});
