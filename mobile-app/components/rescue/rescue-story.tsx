import { Fonts } from '@/constants/theme';
import {
  type NullableValue,
  RescueParameterSeverityEnum,
  RescueParameterSeverityVm,
  RescueSceneChoiceVm,
  RescueTimerParameterVm,
} from '@/hooks/api/types';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';

/** Проверяет, является ли строка data URI (base64) */
function isDataUri(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}

/** Находит первый подходящий по min/max уровень серьёзности для значения */
function findSeverityForValue(
  v: number,
  severities?: RescueParameterSeverityVm[],
): RescueParameterSeverityVm | null {
  if (!severities?.length) return null;
  for (const s of severities) {
    const min = s.min ?? -Infinity;
    const max = s.max ?? Infinity;
    if (v >= min && v <= max) return s;
  }
  return null;
}

function severityBandKey(s: RescueParameterSeverityVm | null): string {
  if (!s) return '';
  return `${s.min ?? ''}:${s.max ?? ''}:${s.severity ?? ''}`;
}

/** Базовый и «вспышечный» цвет по enum серьёзности */
function colorsForSeverity(severity?: RescueParameterSeverityEnum): { base: string; flash: string } {
  switch (severity) {
    case RescueParameterSeverityEnum.Normal:
      return { base: 'rgba(96, 125, 139, 0.88)', flash: 'rgba(178, 223, 219, 0.95)' };
    case RescueParameterSeverityEnum.Low:
      return { base: 'rgba(33, 150, 243, 0.88)', flash: 'rgba(144, 202, 249, 0.95)' };
    case RescueParameterSeverityEnum.Medium:
      return { base: 'rgba(255, 152, 0, 0.88)', flash: 'rgba(255, 204, 128, 0.95)' };
    case RescueParameterSeverityEnum.High:
      return { base: 'rgba(211, 47, 47, 0.88)', flash: 'rgba(255, 138, 128, 0.95)' };
    default:
      return { base: 'rgba(0, 0, 0, 0.65)', flash: 'rgba(120, 120, 120, 0.92)' };
  }
}

function isHeartbeatSeverity(severity?: RescueParameterSeverityEnum): boolean {
  return (
    severity === RescueParameterSeverityEnum.Medium ||
    severity === RescueParameterSeverityEnum.High
  );
}

/** Toast описания уровня: появление сверху вниз */
function SeverityDescriptionToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!message) {
      translateY.value = -120;
      opacity.value = 0;
      return;
    }

    translateY.value = -100;
    opacity.value = 0;
    translateY.value = withTiming(0, { duration: 280 });
    opacity.value = withTiming(1, { duration: 280 });

    const hideTimer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 240 }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
      opacity.value = withTiming(0, { duration: 240 });
    }, 3200);

    return () => clearTimeout(hideTimer);
  }, [message, onDismiss, translateY, opacity]);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message) return null;

  return (
    <Animated.View style={[styles.severityToast, toastStyle]} pointerEvents="none">
      <ThemedText style={styles.severityToastText}>{message}</ThemedText>
    </Animated.View>
  );
}

/** Компонент для отображения одного параметра с анимацией при изменении (цвета из severities) */
function ParameterBadge({
  param,
  value,
  onSeverityDescription,
}: {
  param: RescueTimerParameterVm;
  value: number;
  onSeverityDescription?: (description: string) => void;
}) {
  const changeScale = useSharedValue(1);
  const heartbeatScale = useSharedValue(1);
  const backgroundColor = useSharedValue(
    colorsForSeverity(findSeverityForValue(value, param.severities)?.severity).base,
  );
  const prevValueRef = useRef(value);
  const prevBandKeyRef = useRef(severityBandKey(findSeverityForValue(value, param.severities)));

  const currentSeverity = findSeverityForValue(value, param.severities)?.severity;

  /** «Сердцебиение»: два удара + пауза, только для Medium / High */
  useEffect(() => {
    if (!isHeartbeatSeverity(currentSeverity)) {
      cancelAnimation(heartbeatScale);
      heartbeatScale.value = withTiming(1, { duration: 200 });
      return;
    }

    const isHigh = currentSeverity === RescueParameterSeverityEnum.High;
    const peak1 = isHigh ? 1.12 : 1.08;
    const trough = isHigh ? 1.02 : 1.03;
    const peak2 = isHigh ? 1.09 : 1.05;
    const pauseMs = isHigh ? 320 : 420;

    const beat = withSequence(
      withTiming(peak1, { duration: 160 }),
      withTiming(trough, { duration: 110 }),
      withTiming(peak2, { duration: 130 }),
      withTiming(1, { duration: 240 }),
      withTiming(1, { duration: pauseMs }),
    );
    heartbeatScale.value = withRepeat(beat, -1, false);

    return () => {
      cancelAnimation(heartbeatScale);
      heartbeatScale.value = 1;
    };
  }, [currentSeverity, heartbeatScale]);

  useEffect(() => {
    if (prevValueRef.current === value) return;

    prevValueRef.current = value;

    const newBand = findSeverityForValue(value, param.severities);
    const newKey = severityBandKey(newBand);
    if (newBand?.description?.trim()) {
      onSeverityDescription?.(newBand.description.trim());
    }
    prevBandKeyRef.current = newKey;

    const { base: nextBase, flash } = colorsForSeverity(newBand?.severity);

    changeScale.value = withSequence(
      withTiming(1.15, { duration: 140 }),
      withTiming(1, { duration: 160 }),
    );
    backgroundColor.value = withSequence(
      withTiming(flash, { duration: 160 }),
      withTiming(nextBase, { duration: 320 }),
    );
  }, [value, param.severities, changeScale, backgroundColor, onSeverityDescription]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: changeScale.value * heartbeatScale.value }],
    backgroundColor: backgroundColor.value,
  }));

  const valueLabel = param.type === 'timer' ? formatSecondsAsHms(value) : String(value);

  return (
    <Animated.View style={[styles.parameterBadge, animatedStyle]}>
      <ThemedText style={styles.parameterText}>
        {param.name}: {valueLabel}
      </ThemedText>
    </Animated.View>
  );
}

type RescueSceneVisualNovelProps = {
  /** Фон сцены (URL или id); пустой — берётся defaultBackground из {@link AppRescueItemDataVm} */
  backgroundImage?: string;
  /** Фон по умолчанию из AppRescueItemDataVm.defaultBackground, если у сцены нет своего */
  defaultBackground?: string;
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
  /**
   * Явно false — сцена не отмечена автором как проверенная: показываем красную рамку-предупреждение.
   * null/undefined/true — без рамки.
   */
  isReviewed?: NullableValue<boolean>;
  /** Вызывается, когда пользователь завершил сцену и нажал "Далее" */
  onNext: (selectedChoice: RescueSceneChoiceVm | null) => void;
};

export function RescueSceneVisualNovel({
  backgroundImage,
  defaultBackground,
  text,
  choices,
  typingSpeedMs = 35,
  parametersList = [],
  parameterValues = {},
  isReviewed,
  onNext,
}: RescueSceneVisualNovelProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    page: backgroundColor,
    primary: primaryColor,
    error: errorColor,
  } = useAppTheme();

  const sceneNotReviewedByAuthor = isReviewed === false;

  const textAreaMaxHeight = windowHeight / 3;

  const resolvedBackground = useMemo(() => {
    const scene = (backgroundImage ?? '').trim();
    if (scene.length > 0) return scene;
    return (defaultBackground ?? '').trim();
  }, [backgroundImage, defaultBackground]);

  const isInlineDataUri = isDataUri(resolvedBackground);
  const { response: fetchedImageUrl, isLoading: isLoadingImage } = useFileImage(
    isInlineDataUri ? '' : resolvedBackground,
  );
  const imageDataUrl = isInlineDataUri ? resolvedBackground : fetchedImageUrl;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasShownChoices, setHasShownChoices] = useState(false);
  const [severityToastMessage, setSeverityToastMessage] = useState<string | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissSeverityToast = useCallback(() => {
    setSeverityToastMessage(null);
  }, []);

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
    <ThemedView
      style={[
        styles.container,
        { backgroundColor },
        sceneNotReviewedByAuthor && [
          styles.unreviewedSceneFrame,
          { borderColor: errorColor },
        ],
      ]}
    >
      {sceneNotReviewedByAuthor ? (
        <ThemedView
          style={[styles.unreviewedBanner, { backgroundColor: `${errorColor}E6` }]}
          pointerEvents="none"
        >
          <ThemedText style={styles.unreviewedBannerText}>
            Сцена не проверена автором на ошибки и корректность содержимого
          </ThemedText>
        </ThemedView>
      ) : null}

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
          <ThemedText>
            [Изображение: {resolvedBackground || 'не задано'}]
          </ThemedText>
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
        <ThemedView
          style={[
            styles.parametersContainer,
            {
              paddingTop: insets.top + 16 + (sceneNotReviewedByAuthor ? 42 : 0),
            },
          ]}
        >
          <SeverityDescriptionToast
            key={severityToastMessage ?? 'empty'}
            message={severityToastMessage}
            onDismiss={dismissSeverityToast}
          />
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
                onSeverityDescription={setSeverityToastMessage}
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
    paddingTop: 4,
  },
  severityToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    zIndex: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  severityToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
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
  unreviewedSceneFrame: {
    borderWidth: 4,
    borderStyle: 'solid',
  },
  unreviewedBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  unreviewedBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
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

