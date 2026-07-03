import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import {
  type NullableValue,
  RescueParameterSeverityEnum,
  RescueParameterSeverityVm,
  RescueSceneChoiceVm,
  RescueTimerParameterVm,
} from '@/hooks/api/types';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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

/** Цвет значения по enum серьёзности (kimi palette) */
function colorForSeverity(severity?: RescueParameterSeverityEnum): string {
  switch (severity) {
    case RescueParameterSeverityEnum.Normal:
    case RescueParameterSeverityEnum.Low:
      return '#4D8B31';
    case RescueParameterSeverityEnum.Medium:
      return '#F59E0B';
    case RescueParameterSeverityEnum.High:
      return '#FF6B6B';
    default:
      return '#7E7E7E';
  }
}

/** Сплошные цвета карточки параметра */
function solidCardColors(theme: 'light' | 'dark'): { base: string; flash: string } {
  return theme === 'dark'
    ? { base: '#1C1C1E', flash: '#2C2C2E' }
    : { base: '#FFFFFF', flash: '#EEF2F7' };
}

/** Панели новеллы: полупрозрачные подложки + читаемый текст */
function novelSurfaces(theme: 'light' | 'dark', hasCritical: boolean) {
  if (theme === 'dark') {
    return {
      textPanelBg: hasCritical ? 'rgba(36, 18, 18, 0.5)' : 'rgba(5, 5, 5, 0.5)',
      parametersPanelBg: hasCritical ? 'rgba(255, 107, 107, 0.1)' : 'rgba(5, 5, 5, 0.1)',
      panelBorder: hasCritical ? 'rgba(255, 107, 107, 0.35)' : 'rgba(255, 255, 255, 0.12)',
      sceneText: '#EAEAEA',
      mutedText: '#9CA3AF',
    };
  }
  return {
    textPanelBg: hasCritical ? 'rgba(255, 245, 245, 0.5)' : 'rgba(255, 255, 255, 0.5)',
    parametersPanelBg: hasCritical ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    panelBorder: hasCritical ? 'rgba(224, 85, 85, 0.35)' : 'rgba(0, 0, 0, 0.1)',
    sceneText: '#1A1A1A',
    mutedText: '#6B7280',
  };
}

/** Базовый и «вспышечный» фон карточки при смене значения */
function flashColorsForSeverity(
  theme: 'light' | 'dark',
  _severity?: RescueParameterSeverityEnum,
): { base: string; flash: string } {
  return solidCardColors(theme);
}

/** Toast описания уровня */
function SeverityDescriptionToast({ message }: { message: string | null }) {
  const glass = useGlass();

  if (!message) return null;

  return (
    <View
      style={[
        styles.severityToast,
        {
          backgroundColor: 'rgba(28, 28, 30, 0.92)',
          borderColor: glass.border,
        },
      ]}
      pointerEvents="none"
    >
      <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.severityToastText}>
        {message}
      </ThemedText>
    </View>
  );
}

/** Glass-карточка параметра в стиле kimi PatientParameterCard */
function ParameterBadge({
  param,
  value,
  onSeverityDescription,
}: {
  param: RescueTimerParameterVm;
  value: number;
  onSeverityDescription?: (description: string) => void;
}) {
  const { theme } = useTheme();
  const glass = useGlass();
  const { border: borderColor } = useAppTheme();
  const surfaces = novelSurfaces(theme, false);
  const severityBand = findSeverityForValue(value, param.severities);
  const severityColor = colorForSeverity(severityBand?.severity);
  const min = severityBand?.min ?? 0;
  const max = severityBand?.max ?? Math.max(value, min + 1, 200);
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));

  const backgroundColor = useSharedValue(flashColorsForSeverity(theme, severityBand?.severity).base);
  const prevValueRef = useRef(value);
  const prevBandKeyRef = useRef(severityBandKey(severityBand));

  useEffect(() => {
    if (prevValueRef.current === value) return;

    prevValueRef.current = value;

    const newBand = findSeverityForValue(value, param.severities);
    const newKey = severityBandKey(newBand);
    if (newKey !== prevBandKeyRef.current && newBand?.description?.trim()) {
      onSeverityDescription?.(newBand.description.trim());
    }
    prevBandKeyRef.current = newKey;

    const { base, flash } = flashColorsForSeverity(theme, newBand?.severity);
    backgroundColor.value = withSequence(
      withTiming(flash, { duration: 160 }),
      withTiming(base, { duration: 320 }),
    );
  }, [value, param.severities, backgroundColor, onSeverityDescription, theme]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  const valueLabel = param.type === 'timer' ? formatSecondsAsHms(value) : String(value);
  const isHigh = severityBand?.severity === RescueParameterSeverityEnum.High;

  return (
    <Animated.View
      style={[
        styles.parameterCard,
        animatedStyle,
        {
          borderColor,
        },
      ]}
    >
      <View style={styles.parameterCardRow}>
        <ThemedText
          lightColor={surfaces.mutedText}
          darkColor={surfaces.mutedText}
          style={styles.parameterName}
        >
          {param.name}
        </ThemedText>
        <ThemedText
          type="mono"
          lightColor={severityColor}
          darkColor={severityColor}
          style={styles.parameterValue}
        >
          {valueLabel}
        </ThemedText>
      </View>
      <View style={[styles.parameterTrack, { backgroundColor: glass.progressTrack }]}>
        <View
          style={[
            styles.parameterFill,
            {
              width: `${pct}%`,
              backgroundColor: severityColor,
              shadowColor: isHigh ? severityColor : 'transparent',
              shadowOpacity: isHigh ? 0.8 : 0,
              shadowRadius: isHigh ? 6 : 0,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

type RescueSceneVisualNovelProps = {
  backgroundImage?: string;
  defaultBackground?: string;
  text: string;
  choices: RescueSceneChoiceVm[];
  typingSpeedMs?: number;
  parametersList?: RescueTimerParameterVm[];
  parameterValues?: Record<string, number>;
  isReviewed?: NullableValue<boolean>;
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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    page: backgroundColor,
    primary: primaryColor,
    error: errorColor,
    text: textColor,
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

  const fullText = text ?? '';
  const hasChoices = useMemo(() => choices && choices.length > 0, [choices]);

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
    if (isTyping) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    if (hasChoices && !hasShownChoices) {
      setHasShownChoices(true);
      return;
    }

    if (hasChoices && hasShownChoices) {
      return;
    }

    onNext(null);
  };

  const showNextButton = hasChoices ? !hasShownChoices : true;
  const canAdvanceOnTap = isTyping || !hasChoices || !hasShownChoices;
  const showImage = imageDataUrl && (isInlineDataUri || !isLoadingImage);

  const hasCritical = parametersList.some((param) => {
    const val = parameterValues[param.id] ?? param.startValue;
    const band = findSeverityForValue(val, param.severities);
    return band?.severity === RescueParameterSeverityEnum.High;
  });

  const surfaces = novelSurfaces(theme, hasCritical);

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor },
        sceneNotReviewedByAuthor && [styles.unreviewedSceneFrame, { borderColor: errorColor }],
      ]}
    >
      {sceneNotReviewedByAuthor ? (
        <View
          style={[styles.unreviewedBanner, { backgroundColor: `${errorColor}E6` }]}
          pointerEvents="none"
        >
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.unreviewedBannerText}>
            Сцена не проверена автором на ошибки и корректность содержимого
          </ThemedText>
        </View>
      ) : null}

      {!isInlineDataUri && isLoadingImage ? (
        <View style={styles.loadingContainer}>
          <ThemedText>Загрузка изображения...</ThemedText>
        </View>
      ) : showImage ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleNextPress}>
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
          <ThemedText>[Изображение: {resolvedBackground || 'не задано'}]</ThemedText>
        </Pressable>
      )}

      {parametersList.length > 0 && (
        <View
          style={[
            styles.parametersPanel,
            {
              paddingTop: 8 + (sceneNotReviewedByAuthor ? 42 : 0),
              backgroundColor: surfaces.parametersPanelBg,
              borderBottomColor: surfaces.panelBorder,
            },
          ]}
          pointerEvents="box-none"
        >
          <SeverityDescriptionToast
            key={severityToastMessage ?? 'empty'}
            message={severityToastMessage}
          />
          <View style={styles.parametersGrid}>
            {parametersList.map((param) => (
              <ParameterBadge
                key={param.id}
                param={param}
                value={parameterValues[param.id] ?? param.startValue}
                onSeverityDescription={setSeverityToastMessage}
              />
            ))}
          </View>
        </View>
      )}

      <View
        style={[
          styles.bottomPanel,
          {
            borderTopColor: surfaces.panelBorder,
            backgroundColor: surfaces.textPanelBg,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
        pointerEvents="box-none"
      >
        {hasChoices && hasShownChoices ? (
          <View style={styles.choicesSection}>
            {choices.map((choice) => (
              <Button
                key={choice.id}
                title={choice.text}
                onPress={() => onNext(choice)}
                variant="glass"
                fullWidth
                size="large"
                style={styles.choiceButton}
              />
            ))}
          </View>
        ) : null}

        <ScrollView
          style={[styles.textScrollView, { maxHeight: textAreaMaxHeight }]}
          contentContainerStyle={styles.textScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <ThemedText
            lightColor={surfaces.sceneText}
            darkColor={surfaces.sceneText}
            style={styles.sceneText}
          >
            {displayedText}
            {isTyping ? (
              <ThemedText lightColor={primaryColor} darkColor={primaryColor} style={styles.cursor}>
                ▋
              </ThemedText>
            ) : null}
          </ThemedText>
        </ScrollView>

        {showNextButton ? (
          <View style={styles.actionsRow}>
            <Pressable onPress={handleNextPress} style={styles.linkButton}>
              <ThemedText
                style={[
                  styles.linkButtonText,
                  { color: canAdvanceOnTap ? primaryColor : `${textColor}80` },
                ]}
              >
                {isTyping
                  ? 'Показать сразу'
                  : hasChoices && !hasShownChoices
                    ? 'Показать варианты'
                    : 'Далее'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  parametersPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  parametersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    justifyContent: 'center',
  },
  parameterCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  parameterCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  parameterName: {
    fontSize: 13,
    flexShrink: 1,
  },
  parameterValue: {
    fontSize: 18,
    fontWeight: '400',
  },
  parameterTrack: {
    marginTop: 8,
    height: 3,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  parameterFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  severityToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    zIndex: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  severityToastText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
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
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
    gap: 12,
  },
  textScrollView: {
    flexGrow: 0,
  },
  textScrollContent: {
    paddingRight: 4,
  },
  sceneText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  cursor: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  choicesSection: {
    width: '100%',
    gap: 10,
  },
  choiceButton: {
    width: '100%',
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
