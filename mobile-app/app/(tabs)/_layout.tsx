import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Icon } from '@/components/ui/icon';
import { House, UserRound } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <Tabs
      initialRouteName="(explorer)"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarButton: HapticTab,
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarIconStyle: Platform.select({
          default: {
          }
        }),
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute'
          },
          default: {
          }
        })
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen
        name="(explorer)"
        options={{
          tabBarHideOnKeyboard: true,
          href: '/',
          headerTitle: 'Главная',
          tabBarLabel: 'Главная',
          tabBarIcon: ({ color }) => <Icon as={House} size="xl" color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: 'Профиль',
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color }) => <Icon as={UserRound} size="xl" color={color} />
        }}
      />
    </Tabs>
  );
}
