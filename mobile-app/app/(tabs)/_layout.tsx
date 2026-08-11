import { HapticTab } from '@/components/haptic-tab';
import { GlassTabBarBackground } from '@/components/ui/glass-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SideNavRail } from '@/components/ui/side-nav-rail';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ChromeBackProvider } from '@/contexts/chrome-back-context';
import { NavRailProvider, useNavRail } from '@/contexts/nav-rail-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useTheme } from '@/contexts/theme-context';
import { handleTabPressToRoot } from '@/lib/tab-navigation';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

function AppTabBar(props: BottomTabBarProps) {
  const { isWide } = useNavRail();
  if (isWide) {
    return <SideNavRail {...props} />;
  }
  return <BottomTabBar {...props} />;
}

function TabsInner() {
  const { theme } = useTheme();
  const { session, initialized } = useAuth();
  const { isWide, railOuterWidth } = useNavRail();
  const { unreadCount } = useNotifications();
  const colors = Colors[theme];

  if (!initialized) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.page }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutralSoft,
        tabBarBackground: isWide ? undefined : () => <GlassTabBarBackground />,
        tabBarStyle: isWide
          ? {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: railOuterWidth,
              height: '100%',
              borderTopWidth: 0,
              elevation: 0,
              backgroundColor: 'transparent',
            }
          : {
              position: 'absolute',
              backgroundColor: colors.page,
              borderTopWidth: 0,
              elevation: 8,
              height: Platform.OS === 'ios' ? 64 : 60,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Обучение',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => handleTabPressToRoot('/(tabs)', navigation, 'index', e),
        })}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Статистика',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="chart.bar.fill" color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => handleTabPressToRoot('/(tabs)/stats', navigation, 'stats', e),
        })}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Тренировка',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="bolt.fill" color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => handleTabPressToRoot('/(tabs)/training', navigation, 'training', e),
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
            minWidth: 16,
            height: 16,
            lineHeight: 14,
          },
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.fill" color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => handleTabPressToRoot('/(tabs)/profile', navigation, 'profile', e),
        })}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <NavRailProvider>
      <ChromeBackProvider>
        <TabsInner />
      </ChromeBackProvider>
    </NavRailProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
