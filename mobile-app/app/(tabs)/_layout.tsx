import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[theme].tabBarBackground,
        },
        headerStyle: {
          backgroundColor: Colors[theme].tabBarBackground,
        },
        headerTintColor: Colors[theme].text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Обучение',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <IconSymbol size={24} name="house.fill" color={Colors[theme].tint} />
              <ThemedText style={styles.headerTitleText}>Обучение</ThemedText>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rescue"
        options={{
          title: 'Спасение',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cross.fill" color={color} />,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <IconSymbol size={24} name="cross.fill" color={Colors[theme].tint} />
              <ThemedText style={styles.headerTitleText}>Спасение</ThemedText>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <IconSymbol size={24} name="person.fill" color={Colors[theme].tint} />
              <ThemedText style={styles.headerTitleText}>Профиль</ThemedText>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
