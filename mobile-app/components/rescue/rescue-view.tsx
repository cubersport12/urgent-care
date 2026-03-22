import { AppRescueItemVm, RescueSceneChoiceVm, RescueSceneVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';
import { RescueSceneVisualNovel } from './rescue-story';

type RescueViewProps = {
  rescueItem: AppRescueItemVm;
  onBack: () => void | Promise<void>;
  /** Финальные значения параметров после последнего шага (для расчёта completion) */
  onComplete: (finalParameters: Record<string, number>) => void | Promise<void>;
  /** Скорость эффекта печати в миллисекундах на символ */
  typingSpeedMs?: number;
};

export function RescueView({ rescueItem, onBack, onComplete, typingSpeedMs = 35 }: RescueViewProps) {
  const { page: backgroundColor, border: borderColor } = useAppTheme();

  const orderedScenes = useMemo<RescueSceneVm[]>(() => {
    const scenes = rescueItem.data?.scenes ?? [];
    return [...scenes].sort((a, b) => {
      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      return ao - bo;
    });
  }, [rescueItem]);

  const [currentSceneIndex, setCurrentSceneIndex] = useState(() => {
    const firstNonHidden = orderedScenes.findIndex(s => !s.hidden);
    return firstNonHidden >= 0 ? firstNonHidden : 0;
  });

  // Инициализация состояния параметров
  const [parameters, setParameters] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    rescueItem.data?.parameters?.forEach((p) => {
      initial[p.id] = p.startValue;
    });
    return initial;
  });

  if (!orderedScenes.length) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedText>Сцены для режима спасения не найдены.</ThemedText>
      </ThemedView>
    );
  }

  const currentScene = orderedScenes[currentSceneIndex];

  const handleNextScene = (choice: RescueSceneChoiceVm | null) => {
    let nextParams = { ...parameters };
    if (choice?.parameterChanges && choice.parameterChanges.length > 0) {
      choice.parameterChanges.forEach((change) => {
        if (nextParams[change.parameterId] !== undefined) {
          nextParams[change.parameterId] += change.value;
        }
      });
      setParameters(nextParams);
    }

    // Пытаемся перейти по nextSceneId из выбранного варианта, если он есть
    if (choice?.nextSceneId) {
      const targetIndex = orderedScenes.findIndex((s) => s.id === choice.nextSceneId);
      if (targetIndex >= 0) {
        setCurrentSceneIndex(targetIndex);
        return;
      }
    }

    // Если нет nextSceneId или сцена не найдена — идем по порядку, пропуская скрытые
    let nextIndex = currentSceneIndex + 1;
    while (nextIndex < orderedScenes.length && orderedScenes[nextIndex].hidden) {
      nextIndex++;
    }

    if (nextIndex < orderedScenes.length) {
      setCurrentSceneIndex(nextIndex);
    } else {
      onComplete(nextParams);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
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
      <RescueSceneVisualNovel
        backgroundImage={currentScene.background}
        defaultBackground={rescueItem.data?.defaultBackground}
        text={currentScene.text}
        choices={currentScene.choices ?? []}
        typingSpeedMs={typingSpeedMs}
        onNext={handleNextScene}
        parametersList={rescueItem.data?.parameters ?? []}
        parameterValues={parameters}
        isReviewed={currentScene.isReviewed}
      />
    </ThemedView>
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
});

