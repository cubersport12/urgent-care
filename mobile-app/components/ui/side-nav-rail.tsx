import { Colors, NavRail } from '@/constants/theme';
import { useChromeBackContext } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useTheme } from '@/contexts/theme-context';
import { useGlass } from '@/hooks/use-theme-color';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';

const TAB_ICONS: Partial<Record<string, IconSymbolName>> = {
  index: 'house.fill',
  stats: 'chart.bar.fill',
  profile: 'person.fill',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Обучение',
  stats: 'Статистика',
  profile: 'Профиль',
};

export function SideNavRail({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const glass = useGlass();
  const insets = useSafeAreaInsets();
  const { expanded, toggleExpanded, railOuterWidth } = useNavRail();
  const { chromeBack } = useChromeBackContext();
  const { unreadCount } = useNotifications();

  // insets.left — «островок» под камеру слева; иконки рисуются правее выреза
  const leftSafePad = Math.max(insets.left, 8);

  const widthSv = useSharedValue(railOuterWidth);

  useEffect(() => {
    widthSv.value = withTiming(railOuterWidth, { duration: 220 });
  }, [railOuterWidth, widthSv]);

  const animatedRailStyle = useAnimatedStyle(() => ({
    width: widthSv.value,
  }));

  return (
    <Animated.View
      style={[
        styles.rail,
        animatedRailStyle,
        {
          backgroundColor: colors.page,
          borderRightColor: glass.border,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingLeft: leftSafePad,
        },
      ]}
    >
      {chromeBack ? (
        <>
          <Pressable
            onPress={chromeBack}
            style={({ pressed }) => [
              styles.item,
              expanded && styles.itemExpanded,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <IconSymbol name="chevron.left" size={22} color={colors.text} />
            {expanded ? (
              <ThemedText type="caption" style={styles.label} numberOfLines={1}>
                Назад
              </ThemedText>
            ) : null}
          </Pressable>
          <View style={[styles.divider, { backgroundColor: glass.border }]} />
        </>
      ) : null}

      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            TAB_LABELS[route.name] ??
            (typeof options.title === 'string' ? options.title : route.name);
          const isFocused = state.index === index;
          const color = isFocused ? colors.primary : colors.neutralSoft;
          const iconName: IconSymbolName = TAB_ICONS[route.name] ?? 'house.fill';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) {
              return;
            }
            // Fallback if listeners didn't handle nested stack (wide rail path)
            if (isFocused) {
              const nested = route.state;
              if (nested && typeof nested.index === 'number' && nested.index > 0) {
                const rootName = nested.routes[0]?.name;
                if (rootName) {
                  navigation.navigate(route.name, { screen: rootName });
                  return;
                }
              }
              return;
            }
            navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                expanded && styles.itemExpanded,
                isFocused && { backgroundColor: glass.primaryTint },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <View>
                <IconSymbol name={iconName} size={24} color={color} />
                {route.name === 'profile' && unreadCount > 0 ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.primary, borderColor: colors.page },
                    ]}
                  >
                    <ThemedText style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              {expanded ? (
                <ThemedText
                  type="caption"
                  style={[styles.label, { color }]}
                  numberOfLines={1}
                >
                  {label}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.item,
          expanded && styles.itemExpanded,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Свернуть меню' : 'Развернуть меню'}
      >
        <IconSymbol
          name={expanded ? 'chevron.left' : 'chevron.right'}
          size={20}
          color={colors.neutralSoft}
        />
        {expanded ? (
          <ThemedText type="caption" style={[styles.label, { color: colors.neutralSoft }]}>
            Свернуть
          </ThemedText>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Invisible placeholder matching collapsed/expanded width — used only for layout typing */
export const SIDE_NAV_COLLAPSED = NavRail.collapsedWidth;
export const SIDE_NAV_EXPANDED = NavRail.expandedWidth;

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    borderRightWidth: 1,
    paddingRight: 8,
    alignItems: 'stretch',
  },
  tabs: {
    gap: 4,
    marginTop: 4,
  },
  item: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  itemExpanded: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginHorizontal: 8,
  },
  spacer: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
