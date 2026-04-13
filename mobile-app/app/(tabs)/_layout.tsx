import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  const { theme } = useTheme();
  const { session, initialized } = useAuth();

  if (!initialized) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[theme].page,
        },
        headerStyle: {
          backgroundColor: Colors[theme].page,
        },
        headerTintColor: Colors[theme].onLayout1,
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
              <IconSymbol size={24} name="house.fill" color={Colors[theme].primary} />
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
              <IconSymbol size={24} name="cross.fill" color={Colors[theme].primary} />
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
              <IconSymbol size={24} name="person.fill" color={Colors[theme].primary} />
              <ThemedText style={styles.headerTitleText}>Профиль</ThemedText>
            </View>
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
