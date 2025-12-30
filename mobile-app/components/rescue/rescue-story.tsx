import { AppRescueItemParameterVm, RescueLibraryItemVm, RescueLibraryTriggerVm, RescueStorySceneTriggerVm } from '@/hooks/api/types';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';

type RescueStoryProps = {
  backgroundImage: string;
  items: RescueStorySceneTriggerVm[];
  onItemPress?: (triggerId: string) => void;
  onFolderItemPress?: (itemId: string, triggerId: string) => void;
  libraryItemsMap: Map<string, RescueLibraryItemVm>;
  triggerStates: Map<string, boolean>;
  parameters?: Map<string, number>;
  displayParameters?: AppRescueItemParameterVm[];
  activeFolder?: { folderId: string; triggerId: string } | null;
  folderChildren?: RescueLibraryItemVm[];
};

export function RescueStory({ backgroundImage, items, onItemPress, onFolderItemPress, libraryItemsMap, triggerStates, parameters, displayParameters, activeFolder, folderChildren = [] }: RescueStoryProps) {
  const { page: backgroundColor, primary: primaryColor, onPrimary: onPrimaryColor, layout1: cardBackground, border: borderColor } = useAppTheme();
  const { response: imageDataUrl, isLoading: isLoadingImage } = useFileImage(backgroundImage);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // Анимация для folder-container - opacity зависит от activeFolder
  const folderOpacity = useSharedValue(activeFolder ? 1 : 0);
  
  // Обновляем opacity при изменении activeFolder
  useEffect(() => {
    if (activeFolder) {
      folderOpacity.value = withTiming(1, { duration: 300 });
    } else {
      folderOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [activeFolder, folderOpacity]);
  
  const folderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: folderOpacity.value,
  }));
  
  // Находим folder-container элемент
  const folderContainerItem = items.find((item) => {
    const libraryItem = libraryItemsMap.get(item.triggerId);
    return libraryItem?.type === 'folder-container';
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {isLoadingImage ? (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText>Загрузка изображения...</ThemedText>
        </ThemedView>
      ) : imageDataUrl ? (
        <Image
          source={{ uri: imageDataUrl }}
          style={styles.backgroundImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <ThemedView style={styles.placeholderContainer}>
          <ThemedText>[Изображение: {backgroundImage}]</ThemedText>
        </ThemedView>
      )}
      
      {/* Элементы на сцене */}
      {items.map((item) => {
        // Используем проценты напрямую
        const left = `${item.position.x}%` as const;
        const top = `${item.position.y}%` as const;
        const width = `${item.size.width}%` as const;
        const height = `${item.size.height}%` as const;

        const libraryItem = libraryItemsMap.get(item.triggerId);
        const isParamsState = libraryItem?.type === 'params-state';
        const isTrigger = libraryItem?.type === 'trigger';
        const triggerData = isTrigger ? (libraryItem as RescueLibraryTriggerVm).data : null;
        const isToggle = triggerData?.buttonType === 'toggle';
        const isActive = triggerStates.get(item.triggerId) || false;

        // Если это элемент params-state, отображаем параметры
        if (isParamsState && displayParameters && displayParameters.length > 0) {
          return (
            <ThemedView
              key={item.triggerId}
              style={[
                styles.sceneItem,
                {
                  left,
                  top,
                  width,
                  height,
                  backgroundColor: 'transparent',
                },
              ]}
            >
              <ThemedView style={styles.paramsStateContent}>
                {displayParameters.map((param) => {
                  const currentValue = parameters?.get(param.id) ?? param.value;
                  return (
                    <ThemedView key={param.id} style={[styles.parameterBadge, { backgroundColor: cardBackground }]}>
                      <ThemedText style={styles.parameterBadgeText}>
                        {param.label}: {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue}
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </ThemedView>
            </ThemedView>
          );
        }
        
        // Определяем какой SVG использовать
        let svgToUse: string | undefined;
        if (isTrigger && triggerData) {
          if (isToggle) {
            svgToUse = isActive ? triggerData.onSvg : triggerData.offSvg;
          } else {
            // Для button используем onSvg или offSvg (что есть)
            svgToUse = triggerData.onSvg || triggerData.offSvg;
          }
        }

        // Функция для извлечения SVG XML из data URL
        const extractSvgFromDataUrl = (dataUrl: string): string | null => {
          if (dataUrl.startsWith('data:image/svg+xml')) {
            // Извлекаем base64 или URL-encoded часть
            const base64Match = dataUrl.match(/data:image\/svg\+xml;base64,(.+)/);
            const urlMatch = dataUrl.match(/data:image\/svg\+xml,(.+)/);
            
            if (base64Match) {
              try {
                return atob(base64Match[1]);
              } catch (e) {
                console.error('Error decoding base64 SVG:', e);
                return null;
              }
            } else if (urlMatch) {
              try {
                return decodeURIComponent(urlMatch[1]);
              } catch (e) {
                console.error('Error decoding URL-encoded SVG:', e);
                return null;
              }
            }
          }
          return null;
        };

        // Получаем чистый SVG XML
        let svgXml: string | null = null;
        if (svgToUse) {
          if (svgToUse.startsWith('data:image/svg+xml')) {
            svgXml = extractSvgFromDataUrl(svgToUse);
          } else if (svgToUse.startsWith('<svg') || svgToUse.startsWith('<?xml')) {
            // Уже чистый XML
            svgXml = svgToUse;
          } else if (svgToUse.startsWith('data:')) {
            // Другие data URL - используем Image
            svgXml = null;
          }
        }

        return (
          <Pressable
            key={item.triggerId}
            style={[
              styles.sceneItem,
              {
                left,
                top,
                width,
                height,
                backgroundColor: svgToUse ? 'transparent' : primaryColor,
                opacity: libraryItem?.type === 'folder-container' ? 0 : 1
              },
            ]}
            onPress={() => onItemPress?.(item.triggerId)}
          >
            {svgToUse ? (
              svgXml ? (
                // Если есть SVG XML, используем SvgXml
                <ThemedView style={styles.svgContainer}>
                  <SvgXml
                    xml={svgXml}
                    width="100%"
                    height="100%"
                  />
                </ThemedView>
              ) : (
                // Если SVG в формате data URL (не SVG), используем Image
                <Image
                  source={{ uri: svgToUse }}
                  style={styles.svgImage}
                  contentFit="contain"
                />
              )
            ) : (
              <ThemedView style={styles.sceneItemContent}>
                {libraryItem ? (() => {
                  // Вычисляем размер иконки как 60% от минимального размера элемента
                  const iconSize = Math.min(
                    (item.size.width / 100) * screenWidth,
                    (item.size.height / 100) * screenHeight
                  ) * 0.6;
                  
                  // Определяем иконку в зависимости от типа элемента
                  return libraryItem.type === 'trigger' ? (
                    <IconSymbol name="bolt.fill" size={iconSize} color={onPrimaryColor} />
                  ) : libraryItem.type === 'test' ? (
                    <IconSymbol name="list.bullet.clipboard.fill" size={iconSize} color={onPrimaryColor} />
                  ) : libraryItem.type === 'question' ? (
                    <IconSymbol name="questionmark.circle.fill" size={iconSize} color={onPrimaryColor} />
                  ) : libraryItem.type === 'folder' ? (
                    <IconSymbol name="folder.fill" size={iconSize} color={onPrimaryColor} />
                  ) : (
                    <ThemedText style={[styles.sceneItemText, { color: onPrimaryColor }]}>
                      {libraryItem.name || item.triggerId}
                    </ThemedText>
                  );
                })() : (
                  <ThemedText style={[styles.sceneItemText, { color: onPrimaryColor }]}>
                    {item.triggerId}
                  </ThemedText>
                )}
              </ThemedView>
            )}
          </Pressable>
        );
      })}
      
      {/* Отображение folder-container с элементами папки */}
      {folderContainerItem && (
        <Animated.View
          style={[
            styles.sceneItem,
            {
              left: `${folderContainerItem.position.x}%` as const,
              top: `${folderContainerItem.position.y}%` as const,
              width: `${folderContainerItem.size.width}%` as const,
              height: `${folderContainerItem.size.height}%` as const,
              backgroundColor: cardBackground,
              borderColor,
              borderWidth: 1,
            },
            folderAnimatedStyle,
          ]}
        >
          {activeFolder && folderChildren.length > 0 && (
            <ThemedView style={styles.folderContainerContent}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.folderItemsScrollContent}
              >
                {folderChildren.map((childItem) => {
                  return (
                    <Pressable
                      key={childItem.id}
                      onPress={() => {
                        if (activeFolder && onFolderItemPress) {
                          onFolderItemPress(childItem.id, activeFolder.triggerId);
                        }
                      }}
                    >
                      <ThemedView style={[styles.folderItemBadge, { backgroundColor: primaryColor }]}>
                        <ThemedText style={[styles.folderItemBadgeText, { color: onPrimaryColor }]}>
                          {childItem.name}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </ThemedView>
          )}
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sceneItem: {
    position: 'absolute',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  svgContainer: {
    width: '100%',
    height: '100%',
  },
  svgImage: {
    width: '100%',
    height: '100%',
  },
  sceneItemContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4
  },
  sceneItemText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  paramsStateContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
  parameterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parameterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  folderContainerContent: {
    width: '100%',
    height: '100%',
    padding: 8,
    justifyContent: 'center'
  },
  folderItemsScrollContent: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4
  },
  folderItemBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderItemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  folderEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderEmptyText: {
    fontSize: 12,
    opacity: 0.6,
  },
});

