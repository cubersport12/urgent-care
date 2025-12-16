import { AppTestVm } from '@/hooks/api/types';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type TestViewProps = {
  test: AppTestVm;
  onBack: () => void;
  onStart?: () => void;
};

export function TestView({ test, onBack, onStart }: TestViewProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  // Используем фиксированный синий цвет для кнопок, чтобы текст был всегда виден
  const buttonColor = '#0a7ea4';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ThemedView style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
            },
          ]}
        >
          <IconSymbol name="chevron.left" size={28} color={tintColor} />
          <ThemedText style={styles.backButtonText}>Назад</ThemedText>
        </Pressable>
      </ThemedView>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {test.name}
          </ThemedText>
          <ThemedView style={styles.infoCard}>
            {test.questions && test.questions.length > 0 && (
              <ThemedView style={[styles.infoRow, styles.infoRowFirst]}>
                <IconSymbol name="questionmark.circle.fill" size={24} color={tintColor} />
                <ThemedView style={styles.infoRowContent}>
                  <ThemedText style={styles.infoLabel}>Количество вопросов</ThemedText>
                  <ThemedText style={styles.infoValue}>{test.questions.length}</ThemedText>
                </ThemedView>
              </ThemedView>
            )}
            {test.minScore !== undefined && test.minScore !== null && (
              <ThemedView style={styles.infoRow}>
                <IconSymbol name="star.fill" size={24} color={tintColor} />
                <ThemedView style={styles.infoRowContent}>
                  <ThemedText style={styles.infoLabel}>Минимальный балл</ThemedText>
                  <ThemedText style={styles.infoValue}>{test.minScore}</ThemedText>
                </ThemedView>
              </ThemedView>
            )}
            {test.maxErrors !== undefined && test.maxErrors !== null && (
              <ThemedView style={[styles.infoRow, styles.infoRowLast]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={24} color={tintColor} />
                <ThemedView style={styles.infoRowContent}>
                  <ThemedText style={styles.infoLabel}>Максимальное количество ошибок</ThemedText>
                  <ThemedText style={styles.infoValue}>{test.maxErrors}</ThemedText>
                </ThemedView>
              </ThemedView>
            )}
          </ThemedView>
          {onStart && (
            <Pressable
              onPress={onStart}
              style={({ pressed }) => [
                styles.startButton,
                {
                  backgroundColor: pressed ? buttonColor + 'CC' : buttonColor,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText style={styles.startButtonText}>Начать</ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 32,
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  infoCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  infoRowFirst: {
    marginTop: 0,
  },
  infoRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  infoRowContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.65,
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  startButton: {
    marginTop: 8,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    shadowColor: '#0a7ea4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

