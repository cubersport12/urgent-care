import { AppTestVm } from '@/hooks/api/types';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Button } from './ui/button';
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

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
      <ThemedView style={styles.header}>
        <Button
          title="Назад"
          onPress={onBack}
          variant="default"
          icon="chevron.left"
          iconPosition="left"
          size="medium"
          style={styles.backButton}
        />
      </ThemedView>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {test.name}
          </ThemedText>
          <ThemedView style={styles.infoCard}>
            <ThemedView style={styles.infoRow}>
              {test.questions && test.questions.length > 0 && (
                <ThemedView style={styles.infoItem}>
                  <IconSymbol name="questionmark.circle.fill" size={20} color={tintColor} />
                  <ThemedText style={styles.infoValue}>{test.questions.length}</ThemedText>
                  <ThemedText style={styles.infoLabel}>Вопросов</ThemedText>
                </ThemedView>
              )}
              {test.minScore !== undefined && test.minScore !== null && (
                <ThemedView style={styles.infoItem}>
                  <IconSymbol name="star.fill" size={20} color={tintColor} />
                  <ThemedText style={styles.infoValue}>{test.minScore}</ThemedText>
                  <ThemedText style={styles.infoLabel}>Мин. балл</ThemedText>
                </ThemedView>
              )}
              {test.maxErrors !== undefined && test.maxErrors !== null && (
                <ThemedView style={styles.infoItem}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color={tintColor} />
                  <ThemedText style={styles.infoValue}>{test.maxErrors}</ThemedText>
                  <ThemedText style={styles.infoLabel}>Макс. ошибок</ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          </ThemedView>
          {onStart && (
            <Button
              title="Начать"
              onPress={onStart}
              variant="primary"
              size="large"
              fullWidth
              style={styles.startButton}
            />
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
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginBottom: 24,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    // backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 24,
    shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.08,
    // shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  infoItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 70,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  startButton: {
    marginTop: 0,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: '100%',
    maxWidth: 300,
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

