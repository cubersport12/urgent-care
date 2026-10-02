import { Fonts, getSceneSurfaces, Radius, Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTheme } from '@/contexts/theme-context';
import {
  type NullableValue,
  RescueParameterSeverityEnum,
  RescueParameterSeverityVm,
  type RescueSceneChoiceVm,
  type RescueSceneDocumentVm,
  RescueTimerParameterVm,
} from '@/hooks/api/types';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../ui/icon-symbol';
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

/** Цвет значения параметра по enum серьёзности */
function colorForSeverity(
  severity: RescueParameterSeverityEnum | undefined,
  c: { success: string; warning: string; error: string; neutral: string },
): string {
  switch (severity) {
    case RescueParameterSeverityEnum.Normal:
    case RescueParameterSeverityEnum.Low:
      return c.success;
    case RescueParameterSeverityEnum.Medium:
      return c.warning;
    case RescueParameterSeverityEnum.High:
      return c.error;
    default:
      return c.neutral;
  }
}

/** Glass-карточка параметра в стиле kimi PatientParameterCard */
function ParameterBadge({
  param,
  value,
}: {
  param: RescueTimerParameterVm;
  value: number;
}) {
  const { theme } = useTheme();
  const glass = useGlass();
  const { border: borderColor } = useAppTheme();
  const { success, warning, error, neutral, surfaceRaised, surfaceRaisedPressed } = useAppTheme();
  const surfaces = getSceneSurfaces(theme, false);
  const severityBand = findSeverityForValue(value, param.severities);
  const severityColor = colorForSeverity(severityBand?.severity, { success, warning, error, neutral });
  const min = severityBand?.min ?? 0;
  const max = severityBand?.max ?? Math.max(value, min + 1, 200);
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));

  const backgroundColor = useSharedValue(surfaceRaised);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current === value) return;

    prevValueRef.current = value;

    const { base, flash } = { base: surfaceRaised, flash: surfaceRaisedPressed };
    backgroundColor.value = withSequence(
      withTiming(flash, { duration: 160 }),
      withTiming(base, { duration: 320 }),
    );
  }, [value, backgroundColor, surfaceRaised, surfaceRaisedPressed]);

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
  documents?: RescueSceneDocumentVm[];
  onOpenDocument?: (articleId: string) => void;
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
  documents = [],
  onOpenDocument,
  typingSpeedMs = 35,
  parametersList = [],
  parameterValues = {},
  isReviewed,
  onNext,
}: RescueSceneVisualNovelProps) {
  const { height: windowHeight } = useWindowDimensions();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useNavRail();
  const glass = useGlass();
  const {
    page: backgroundColor,
    primary: primaryColor,
    error: errorColor,
    onError: onErrorColor,
    text: textColor,
  } = useAppTheme();

  const sceneNotReviewedByAuthor = isReviewed === false;
  // Ниже кнопки «Назад» (телефон) / под статус-бар (wide) — без двойного insets.top
  const parametersTopPad =
    (isWide ? insets.top : 0) + 8 + (sceneNotReviewedByAuthor ? 42 : 0);
  // Отступ снизу: safe area + tab bar на телефоне, чтобы текст не обрезался
  const bottomPad = Math.max(insets.bottom, 12) + (isWide ? 8 : Spacing.nav);
  const textAreaMaxHeight = Math.round(windowHeight * 0.42);

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
  const [docsModalVisible, setDocsModalVisible] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullText = text ?? '';
  const hasChoices = useMemo(() => choices && choices.length > 0, [choices]);
  const hasDocuments = documents.length > 0 && onOpenDocument != null;

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

  const surfaces = getSceneSurfaces(theme, hasCritical);

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
          style={[
            styles.unreviewedBanner,
            { backgroundColor: errorColor, borderBottomColor: glass.imageScrim },
          ]}
          pointerEvents="none"
        >
          <ThemedText style={[styles.unreviewedBannerText, { color: onErrorColor }]}>
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
              paddingTop: parametersTopPad,
              backgroundColor: surfaces.parametersPanelBg,
              borderBottomColor: surfaces.panelBorder,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.parametersGrid}>
            {parametersList.map((param) => (
              <ParameterBadge
                key={param.id}
                param={param}
                value={parameterValues[param.id] ?? param.startValue}
              />
            ))}
          </View>
        </View>
      )}

      {hasChoices && hasShownChoices ? (
        <View style={[styles.choicesOverlay, { backgroundColor: glass.imageScrim }]} pointerEvents="box-none">
          <View style={styles.choicesCenter}>
            {choices.map((choice) => (
              <Button
                key={choice.id}
                title={choice.text}
                onPress={() => onNext(choice)}
                variant="default"
                fullWidth
                size="large"
                style={styles.choiceButton}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Сцена без вариантов выбора: список документов по центру — ключевая информация сцены */}
      {!hasChoices && hasDocuments ? (
        <View style={[styles.choicesOverlay, styles.docsOverlayTransparent]} pointerEvents="box-none">
          <View style={[styles.choicesCenter, styles.docsCard, { backgroundColor: glass.background, borderColor: glass.border }]}>
            <ThemedText style={[styles.docsCardTitle, { color: textColor }]}>Документы</ThemedText>
            {documents.map((doc) => (
              <Button
                key={doc.id}
                title={doc.name}
                icon="doc.fill"
                iconPosition="left"
                onPress={() => onOpenDocument?.(doc.articleId)}
                variant="default"
                fullWidth
                style={styles.choiceButton}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Есть варианты И документы: список открывается кнопкой «Справка» рядом с «Показать варианты» */}
      {hasChoices && hasDocuments ? (
        <Modal visible={docsModalVisible} animationType="slide" onRequestClose={() => setDocsModalVisible(false)}>
          <View style={[styles.docsModalRoot, { backgroundColor: backgroundColor }]}>
            <View style={styles.docsModalHeader}>
              <ThemedText type="h2">Документы</ThemedText>
              <Pressable onPress={() => setDocsModalVisible(false)} style={styles.docsModalClose}>
                <IconSymbol name="xmark.circle.fill" size={26} color={textColor} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.docsModalContent}>
              {documents.map((doc) => (
                <Button
                  key={doc.id}
                  title={doc.name}
                  icon="doc.fill"
                  iconPosition="left"
                  onPress={() => {
                    setDocsModalVisible(false);
                    onOpenDocument?.(doc.articleId);
                  }}
                  variant="default"
                  fullWidth
                  style={styles.choiceButton}
                />
              ))}
            </ScrollView>
          </View>
        </Modal>
      ) : null}

      <View
        style={[
          styles.bottomPanel,
          {
            borderTopColor: surfaces.panelBorder,
            backgroundColor: surfaces.textPanelBg,
            paddingBottom: bottomPad,
          },
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          style={[styles.textScrollView, { maxHeight: textAreaMaxHeight }]}
          contentContainerStyle={styles.textScrollContent}
          showsVerticalScrollIndicator
          bounces={false}
          nestedScrollEnabled
        >
          <Pressable onPress={handleNextPress}>
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
          </Pressable>
        </ScrollView>

        {showNextButton || (hasChoices && hasDocuments) ? (
          <View style={styles.actionsRow}>
            {hasChoices && hasDocuments ? (
              <Pressable onPress={() => setDocsModalVisible(true)} style={styles.linkButton}>
                <ThemedText style={[styles.linkButtonText, { color: primaryColor }]}>
                  Справка
                </ThemedText>
              </Pressable>
            ) : null}
            {showNextButton ? (
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
            ) : null}
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
    paddingHorizontal: 12,
    paddingTop: 0,
    justifyContent: 'center',
    alignContent: 'flex-start',
  },
  parameterCard: {
    width: 168,
    maxWidth: 200,
    flexGrow: 0,
    flexShrink: 1,
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
  choicesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  choicesCenter: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  textScrollView: {
    flexGrow: 0,
  },
  textScrollContent: {
    paddingRight: 4,
    paddingBottom: 4,
    flexGrow: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  choiceButton: {
    width: '100%',
  },
  docsOverlayTransparent: {
    backgroundColor: 'transparent',
  },
  docsCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 10,
  },
  docsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  docsModalRoot: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  docsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  docsModalClose: {
    padding: 4,
  },
  docsModalContent: {
    gap: 10,
    paddingBottom: 24,
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
