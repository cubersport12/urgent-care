import { AppRescueItemVm, RescueLibraryItemVm, RescueLibraryTriggerVm } from '@/hooks/api/types';
import { useAllRescueLibrary, useRescueLibrary } from '@/hooks/api/useRescueLibrary';
import { useRescueStories } from '@/hooks/api/useRescueStories';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';
import { RescueStory } from './rescue-story';

type RescueViewProps = {
  rescueItem: AppRescueItemVm;
  onBack: () => void;
  onComplete: () => void;
};

export function RescueView({ rescueItem, onBack, onComplete }: RescueViewProps) {
  const { page: backgroundColor, border: borderColor } = useAppTheme();
  const { data: stories, isLoading } = useRescueStories(rescueItem.id);
  
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [parameters, setParameters] = useState<Map<string, number>>(new Map());
  const [sceneInitialParameters, setSceneInitialParameters] = useState<Map<string, number>>(new Map()); // Начальные значения параметров для текущей сцены
  const [triggerStates, setTriggerStates] = useState<Map<string, boolean>>(new Map()); // Состояния для toggle триггеров
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // ID последнего активированного триггера с папкой
  const intervalRef = useRef<any>(null);
  const hasTransitionedRef = useRef<any>(false);
  const previousSceneIndexRef = useRef<number>(-1);

  // Получаем triggerId из текущей сцены
  const currentSceneTriggerIds = useMemo(() => {
    if (!stories || stories.length === 0 || currentSceneIndex >= stories.length) return [];
    const currentStory = stories[currentSceneIndex];
    return currentStory.data.scene.items.map(item => item.triggerId);
  }, [stories, currentSceneIndex]);

  // Загружаем все элементы библиотеки
  const { data: libraryItems } = useAllRescueLibrary();

  // Загружаем дочерние элементы активной папки
  const { data: folderChildren } = useRescueLibrary(activeFolderId || undefined);

  // Создаем Map для быстрого доступа к элементам библиотеки по ID
  const libraryItemsMap = useMemo(() => {
    const map = new Map<string, RescueLibraryItemVm>();
    libraryItems?.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [libraryItems]);

  // Находим активную папку и проверяем, должна ли она быть видна
  const activeFolder = useMemo<{ folderId: string; triggerId: string } | null>(() => {
    if (!activeFolderId) return null;
    
    // Находим триггер, который открыл эту папку
    let foundTriggerId: string | null = null;
    
    currentSceneTriggerIds.forEach((triggerId) => {
      const libraryItem = libraryItemsMap.get(triggerId);
      if (libraryItem?.type === 'trigger') {
        const triggerData = (libraryItem as RescueLibraryTriggerVm).data;
        if (triggerData?.rescueLibraryItemId === activeFolderId) {
          const isToggle = triggerData.buttonType === 'toggle';
          const isActive = triggerStates.get(triggerId) || false;
          
          // Если это button или toggle в состоянии true
          if (triggerData.buttonType === 'button' || (isToggle && isActive)) {
            foundTriggerId = triggerId;
          }
        }
      }
    });
    
    return foundTriggerId ? { folderId: activeFolderId, triggerId: foundTriggerId } : null;
  }, [activeFolderId, libraryItemsMap, currentSceneTriggerIds, triggerStates]);

  // Инициализация параметров из rescueItem
  useEffect(() => {
    const initialParams = new Map<string, number>();
    rescueItem.data?.parameters?.forEach((param) => {
      if (typeof param.value === 'number') {
        initialParams.set(param.id, param.value);
      }
    });
    setParameters(initialParams);
    hasTransitionedRef.current = false;
  }, [rescueItem]);

  // Обновление параметров каждую секунду
  useEffect(() => {
    if (!rescueItem.data?.parameters) return;

    intervalRef.current = setInterval(() => {
      setParameters((prev) => {
        const newParams = new Map(prev);
        
        rescueItem.data?.parameters?.forEach((param) => {
          if (param.discriminatorByTimer && typeof param.value === 'number') {
            const currentValue = newParams.get(param.id) ?? param.value;
            let increment = 0;

            if (param.discriminatorByTimer.type === 'value') {
              // Постоянное значение (используем min как значение)
              increment = param.discriminatorByTimer.min;
            } else if (param.discriminatorByTimer.type === 'range') {
              // Случайное число из интервала
              const { min, max } = param.discriminatorByTimer;
              increment = Math.random() * (max - min) + min;
            }

            newParams.set(param.id, currentValue + increment);
          }
        });

        return newParams;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [rescueItem]);

  // Запоминаем начальные значения параметров при старте сцены
  useEffect(() => {
    hasTransitionedRef.current = false;
    
    // Сохраняем текущие значения параметров как начальные только при смене сцены
    // или если начальные значения еще не установлены, а параметры уже инициализированы
    if (previousSceneIndexRef.current !== currentSceneIndex) {
      previousSceneIndexRef.current = currentSceneIndex;
      if (parameters.size > 0) {
        setSceneInitialParameters(new Map(parameters));
      }
      // Закрываем папку при смене сцены
      setActiveFolderId(null);
    } else if (sceneInitialParameters.size === 0 && parameters.size > 0) {
      // Если начальные значения еще не установлены, но параметры уже инициализированы
      setSceneInitialParameters(new Map(parameters));
    }
  }, [currentSceneIndex, parameters, sceneInitialParameters.size]);

  // Проверка ограничений и переход к следующей сцене
  useEffect(() => {
    if (!stories || stories.length === 0 || isLoading) return;
    if (currentSceneIndex >= stories.length) return;
    if (hasTransitionedRef.current) return; // Предотвращаем множественные переходы
    if (parameters.size === 0) return; // Ждем инициализации параметров

    const currentStory = stories[currentSceneIndex];
    const currentScene = currentStory.data.scene;

    // Если нет ограничений, не переходим
    if (!currentScene.restritions || currentScene.restritions.length === 0) {
      return;
    }

    // Проверяем каждое ограничение
    for (const restriction of currentScene.restritions) {
      let shouldTransition = false;

      // Проверяем, что хотя бы один параметр ограничения вышел за границы по модулю
      for (const restrictionParam of restriction.params) {
        const currentValue = parameters.get(restrictionParam.id);
        const initialValue = sceneInitialParameters.get(restrictionParam.id);
        
        if (currentValue === undefined || initialValue === undefined) {
          continue; // Пропускаем параметры без значений
        }

        // restrictionParam.value - это изменение от первоначального значения по модулю
        const restrictionValue = typeof restrictionParam.value === 'number' 
          ? restrictionParam.value 
          : parseFloat(String(restrictionParam.value)) || 0;
        
        // Вычисляем разницу между текущим и начальным значением
        const difference = Math.abs(currentValue - initialValue);
        
        // Если разница по модулю достигла или превысила restrictionValue, то это ограничение выполнено
        if (difference >= restrictionValue) {
          shouldTransition = true;
          break; // Достаточно одного параметра, который вышел за границы
        }
      }

      // Если хотя бы один параметр ограничения вышел за границы, переходим к следующей сцене
      if (shouldTransition) {
        hasTransitionedRef.current = true;
        if (currentSceneIndex + 1 < stories.length) {
          setCurrentSceneIndex(currentSceneIndex + 1);
        } else {
          // Нет следующей сцены - завершаем
          onComplete();
        }
        break;
      }
    }
  }, [parameters, sceneInitialParameters, stories, currentSceneIndex, isLoading, onComplete]);

  const handleItemPress = useCallback((triggerId: string) => {
    const libraryItem = libraryItemsMap.get(triggerId);
    if (libraryItem && libraryItem.type === 'trigger') {
      const triggerData = (libraryItem as RescueLibraryTriggerVm).data;
      console.log('Item pressed:', triggerId);
      if (triggerData?.buttonType === 'toggle') {
        // Переключаем состояние для toggle триггера
        setTriggerStates((prev) => {
          const newStates = new Map(prev);
          const newState = !(prev.get(triggerId) || false);
          newStates.set(triggerId, newState);
          
          // Если toggle выключен, закрываем папку
          if (!newState && triggerData.rescueLibraryItemId === activeFolderId) {
            setActiveFolderId(null);
          } else if (newState && triggerData.rescueLibraryItemId) {
            // Если toggle включен и есть rescueLibraryItemId, проверяем, является ли он папкой
            const targetItem = libraryItemsMap.get(triggerData.rescueLibraryItemId);
            if (targetItem?.type === 'folder') {
              setActiveFolderId(triggerData.rescueLibraryItemId);
            }
          }
          
          return newStates;
        });
      } else if (triggerData?.buttonType === 'button' && triggerData.rescueLibraryItemId) {
        // Для button сразу открываем папку, если она есть
        const targetItem = libraryItemsMap.get(triggerData.rescueLibraryItemId);
        if (targetItem?.type === 'folder') {
          setActiveFolderId(triggerData.rescueLibraryItemId);
        }
      }
    }
  }, [libraryItemsMap, activeFolderId]);

  const handleFolderItemPress = useCallback((itemId: string, triggerId: string) => {
    if (!stories || stories.length === 0 || currentSceneIndex >= stories.length) return;
    
    const currentStory = stories[currentSceneIndex];
    const currentScene = currentStory.data.scene;
    
    // Находим активный триггер в сцене
    const activeTrigger = currentScene.items.find(item => item.triggerId === triggerId);
    
    if (activeTrigger && activeTrigger.parameters) {
      // Находим параметр, соответствующий кликнутому элементу
      const parameter = activeTrigger.parameters.find(param => param.id === itemId);
      
      if (parameter && typeof parameter.value === 'number') {
        // Обновляем значение параметра
        const numericValue = parameter.value as number;
        setParameters((prev) => {
          const newParams = new Map(prev);
          newParams.set(parameter.id, numericValue);
          return newParams;
        });
      }
    }
  }, [stories, currentSceneIndex]);

  if (isLoading || !stories || stories.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedText>Загрузка...</ThemedText>
      </ThemedView>
    );
  }

  const currentStory = stories[currentSceneIndex];
  const currentScene = currentStory.data.scene;

  // Получаем все параметры для отображения (все, у которых value - число)
  const displayParameters = rescueItem.data?.parameters?.filter(
    (param) => typeof param.value === 'number'
  ) || [];

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
      <RescueStory
        backgroundImage={currentScene.backgroundImage}
        items={currentScene.items}
        onItemPress={handleItemPress}
        onFolderItemPress={handleFolderItemPress}
        libraryItemsMap={libraryItemsMap}
        triggerStates={triggerStates}
        parameters={parameters}
        displayParameters={displayParameters}
        activeFolder={activeFolder}
        folderChildren={folderChildren || []}
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

