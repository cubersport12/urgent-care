import { AppRescueItemVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';
import { IconSymbol } from '../ui/icon-symbol';

type RescueStartProps = {
  rescueItem: AppRescueItemVm;
  onBack: () => void;
  onStart: () => void;
};

export function RescueStart({ rescueItem, onBack, onStart }: RescueStartProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const { primary: tintColor, page: backgroundColor, border: borderColor, shadow: shadowColor, primary: primaryShadow } = useAppTheme();

  // Находим параметр duration отдельно
  const durationParameter = rescueItem.data?.parameters?.find(p => p.category === 'duration');
  const otherParameters = rescueItem.data?.parameters?.filter(p => p.category !== 'duration') || [];

  // Форматируем дату создания
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Форматируем значение параметра
  const formatParameterValue = (value: string | number, category: 'number' | 'duration') => {
    if (category === 'duration') {
      // Если это число, считаем его секундами
      if (typeof value === 'number') {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        if (minutes > 0) {
          return `${minutes} мин ${seconds} сек`;
        }
        return `${seconds} сек`;
      }
      return value;
    }
    return String(value);
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
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
        contentContainerStyle={[styles.scrollViewContent, styles.scrollViewContentWithButton]}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {rescueItem.name}
          </ThemedText>
          
          {/* Дата создания */}
          {rescueItem.createdAt && (
            <ThemedView style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="star.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Создано:</ThemedText>
              </ThemedView>
              <ThemedText style={styles.infoValue}>{formatDate(rescueItem.createdAt)}</ThemedText>
            </ThemedView>
          )}

          {/* Описание */}
          {rescueItem.description && (
            <ThemedView style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="doc.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Описание:</ThemedText>
              </ThemedView>
              <ThemedText style={styles.descriptionText}>{rescueItem.description}</ThemedText>
            </ThemedView>
          )}

          {/* Duration - отдельно */}
          {durationParameter && (
            <ThemedView style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Время на прохождение:</ThemedText>
              </ThemedView>
              <ThemedText style={styles.infoValue}>
                {formatParameterValue(durationParameter.value, durationParameter.category)}
              </ThemedText>
            </ThemedView>
          )}

          {/* Остальные параметры */}
          {otherParameters.length > 0 && (
            <ThemedView style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="list.bullet.clipboard.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Параметры:</ThemedText>
              </ThemedView>
              <ThemedView style={styles.parametersContainer}>
                {otherParameters.map((param) => (
                  <ThemedView key={param.id} style={styles.parameterItem}>
                    <ThemedText style={styles.parameterLabel}>{param.label}:</ThemedText>
                    <ThemedText style={styles.parameterValue}>
                      {formatParameterValue(param.value, param.category)}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
      <ThemedView style={styles.startButtonContainer}>
        <Button
          title="Старт"
          onPress={onStart}
          variant="primary"
          size="large"
          fullWidth
          style={[styles.startButton, { shadowColor: primaryShadow }]}
        />
      </ThemedView>
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 20,
  },
  scrollViewContentWithButton: {
    paddingBottom: 100, // Отступ снизу для кнопки
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  infoRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  parametersContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  parameterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  parameterLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: '100%',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});

