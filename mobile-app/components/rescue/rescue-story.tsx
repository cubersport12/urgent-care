import { Fonts } from '@/constants/theme';
import { RescueSceneChoiceVm, RescueTimerParameterVm } from '@/hooks/api/types';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';

/** Проверяет, является ли строка data URI (base64) */
function isDataUri(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}

/** Компонент для отображения одного параметра с анимацией при изменении */
function ParameterBadge({ param, value }: { param: RescueTimerParameterVm; value: number }) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue('rgba(0, 0, 0, 0.6)');
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      const isPositive = value > prevValueRef.current;
      prevValueRef.current = value;
      
      // Анимация увеличения
      scale.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
      
      // Анимация цвета (зеленый при увеличении, красный при уменьшении, возвращается к дефолтному)
      const highlightColor = isPositive ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
      backgroundColor.value = withSequence(
        withTiming(highlightColor, { duration: 150 }),
        withTiming('rgba(0, 0, 0, 0.6)', { duration: 300 })
      );
    }
  }, [value, scale, backgroundColor]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: backgroundColor.value,
    };
  });

  return (
    <Animated.View style={[styles.parameterBadge, animatedStyle]}>
      <ThemedText style={styles.parameterText}>
        {param.name}: {value}
      </ThemedText>
    </Animated.View>
  );
}

type RescueSceneVisualNovelProps = {
  backgroundImage: string;
  /** Текст сцены, который печатается снизу */
  text: string;
  /** Варианты выбора в этой сцене */
  choices: RescueSceneChoiceVm[];
  /** Скорость печати, мс на символ */
  typingSpeedMs?: number;
  /** Список параметров для отображения на экране */
  parametersList?: RescueTimerParameterVm[];
  /** Текущие значения параметров */
  parameterValues?: Record<string, number>;
  /** Вызывается, когда пользователь завершил сцену и нажал "Далее" */
  onNext: (selectedChoice: RescueSceneChoiceVm | null) => void;
};

export function RescueSceneVisualNovel({
  backgroundImage,
  text,
  choices,
  typingSpeedMs = 35,
  parametersList = [],
  parameterValues = {},
  onNext,
}: RescueSceneVisualNovelProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    page: backgroundColor,
    primary: primaryColor,
  } = useAppTheme();

  const textAreaMaxHeight = windowHeight / 3;

  const isInlineDataUri = isDataUri(backgroundImage);
  const { response: fetchedImageUrl, isLoading: isLoadingImage } = useFileImage(
    isInlineDataUri ? '' : backgroundImage,
  );
  const imageDataUrl = isInlineDataUri ? backgroundImage : fetchedImageUrl;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasShownChoices, setHasShownChoices] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullText = text ?? '';

  const hasChoices = useMemo(() => choices && choices.length > 0, [choices]);

  // Запускаем эффект печати при смене текста сцены
  useEffect(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    setDisplayedText('');
    setIsTyping(true);
    setHasShownChoices(false);

    if (!fullText) {
      setIsTyping(false);
      return;
    }

    let index = 0;
    typingIntervalRef.current = setInterval(() => {
      index += 1;
      setDisplayedText(fullText.slice(0, index));
      if (index >= fullText.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);
      }
    }, Math.max(typingSpeedMs, 5));

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [fullText, typingSpeedMs]);

  const handleNextPress = () => {
    // Сначала завершить печать, если она еще идет
    if (isTyping) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    // Затем показать вопрос (если есть) одним нажатием
    if (hasChoices && !hasShownChoices) {
      setHasShownChoices(true);
      return;
    }

    // Если на экране варианты выбора — переход только по нажатию варианта, не по клику
    if (hasChoices && hasShownChoices) {
      return;
    }

    // Сцена завершена — переходим дальше
    onNext(null);
  };

  const showNextButton = hasChoices ? !hasShownChoices : true;
  const canAdvanceOnTap = isTyping || !hasChoices || !hasShownChoices;

  const showImage = imageDataUrl && (isInlineDataUri || !isLoadingImage);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {!isInlineDataUri && isLoadingImage ? (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText>Загрузка изображения...</ThemedText>
        </ThemedView>
      ) : showImage ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleNextPress}
        >
          <Image
            source={{ uri: imageDataUrl }}
            style={styles.backgroundImage}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
      ) : (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.placeholderContainer]}
          onPress={handleNextPress}
        >
          <ThemedText>[Изображение: {backgroundImage}]</ThemedText>
        </Pressable>
      )}

      {/* Полупрозрачный оверлей для читаемости */}
      {/* <ThemedView
        style={[
          styles.overlay,
          { backgroundColor: overlayBackground ?? 'rgba(0,0,0,0.25)' },
        ]}
      /> */}

      {/* Панель параметров */}
      {parametersList.length > 0 && (
        <ThemedView style={[styles.parametersContainer, { paddingTop: insets.top + 16 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parametersScrollContent}
          >
            {parametersList.map((param) => (
              <ParameterBadge
                key={param.id}
                param={param}
                value={parameterValues[param.id] ?? param.startValue}
              />
            ))}
          </ScrollView>
        </ThemedView>
      )}

      {/* Центральный блок вариантов ответа */}
      {hasChoices && hasShownChoices && (
        <ThemedView style={styles.centerChoicesContainer}>
          <ThemedView style={styles.choicesRow}>
            {choices.map((choice) => (
              <Button
                key={choice.id}
                title={choice.text}
                onPress={() => onNext(choice)}
                variant="primary"
                fullWidth
                size="large"
                style={styles.choiceButton}
              />
            ))}
          </ThemedView>
        </ThemedView>
      )}

      {/* Нижняя панель: текст сцены (макс. 1/3 экрана, с прокруткой) и кнопки ниже */}
      <ThemedView style={styles.bottomTextContainer}>
        <ScrollView
          style={[styles.textScrollView, { maxHeight: textAreaMaxHeight }]}
          contentContainerStyle={styles.textScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <ThemedText style={styles.sceneText}>
            {displayedText}
            {isTyping && <ThemedText style={styles.cursor}>▋</ThemedText>}
          </ThemedText>
        </ScrollView>

        <ThemedView style={styles.actionsRow}>
          {showNextButton ? (
            <Pressable
              onPress={handleNextPress}
              style={styles.linkButton}
            >
              <ThemedText
                style={[
                  styles.linkButtonText,
                  { color: canAdvanceOnTap ? primaryColor : 'rgba(255,255,255,0.5)' },
                ]}
              >
                {isTyping ? 'Показать сразу' : hasChoices && !hasShownChoices ? 'Показать варианты' : 'Далее'}
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  parametersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    backgroundColor: 'transparent',
  },
  parametersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  parameterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  parameterText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  bottomTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingVertical: 18,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2,
  },
  textScrollView: {
    flexGrow: 0,
  },
  textScrollContent: {
    paddingRight: 8,
  },
  sceneText: {
    fontFamily: Fonts.sans,
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: 0.5,
    textAlign: 'justify',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cursor: {
    fontFamily: Fonts.sans,
    fontSize: 32,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  centerChoicesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    paddingHorizontal: 20,
    paddingBottom: 150, // смещение немного вверх, чтобы не перекрывалось текстом
  },
  choicesRow: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  choiceButton: {
    width: '100%',
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  linkButtonTextSelected: {
    opacity: 0.9,
  },
});

