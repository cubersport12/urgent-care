import { HapticTab } from '@/components/haptic-tab';
import { GlassTabBarBackground } from '@/components/ui/glass-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  const { theme } = useTheme();
  const { session, initialized } = useAuth();
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
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.neutralSoft,
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarStyle: {
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
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={24}
              name="house.fill"
              color={color}
              style={focused ? styles.activeIcon : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Статистика',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={24}
              name="chart.bar.fill"
              color={color}
              style={focused ? styles.activeIcon : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={24}
              name="person.fill"
              color={color}
              style={focused ? styles.activeIcon : undefined}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIcon: {
    shadowColor: 'rgba(0, 132, 255, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
});
