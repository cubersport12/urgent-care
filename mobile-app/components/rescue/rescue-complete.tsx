import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { IconSize, Radius, ResultTileTokens, Spacing } from '@/constants/theme';
import {
  type AppRescueItemVm,
  RescueParameterSeverityEnum,
  type RescueScheneChoiceImplicationVm,
} from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import {
  buildRescueCompletionDescription,
  parseRescueItemDataVm,
  resolveRescueOutcome,
} from '@/lib/rescue-completion';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { colorForSeverity, findSeverityForValue } from '@/lib/rescue-parameter-severity';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { Button } from '../ui/button';
import { NoScreenCapture } from '../ui/no-screen-capture';
import { ScreenBackground } from '../ui/screen-background';
import { ResultTile } from '../ui/result-tile';

type RescueCompleteProps = {
  rescueItem: AppRescueItemVm;
  parameterValues: Record<string, number>;
  selectedImplications?: RescueScheneChoiceImplicationVm[];
  onBack: () => void;
};

const outcomeImages = {
  passed: {
    light: { animation: require('@/assets/images/rescue/success.gif'), final: require('@/assets/images/rescue/success-final.png'), ratio: 485 / 800 },
    dark: { animation: require('@/assets/images/rescue/success-dark.gif'), final: require('@/assets/images/rescue/success-dark-final.png'), ratio: 485 / 800 },
  },
  failed: {
    light: { animation: require('@/assets/images/rescue/failure.gif'), final: require('@/assets/images/rescue/failure-final.png'), ratio: 525 / 800 },
    dark: { animation: require('@/assets/images/rescue/failure-dark.gif'), final: require('@/assets/images/rescue/failure-dark-final.png'), ratio: 525 / 800 },
  },
} as const;

function ParameterIcon({ icon, color }: { icon?: string; color: string }) {
  const isImage = !!icon && /\.png$/i.test(icon);
  const { response } = useFileImage(isImage ? icon : '');
  if (isImage) {
    return response ? <Image source={{ uri: response }} style={styles.parameterIcon} resizeMode="contain" /> : null;
  }
  return icon && Object.prototype.hasOwnProperty.call(MaterialIcons.glyphMap, icon)
    ? <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={IconSize.resultMetric} color={color} accessible={false} />
    : null;
}

export function RescueComplete({ rescueItem, parameterValues, selectedImplications = [], onBack }: RescueCompleteProps) {
  const theme = useAppTheme();
  const { theme: themeName } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compactMetrics = width < ResultTileTokens.metricCompactBreakpoint || fontScale > ResultTileTokens.metricCompactFontScale;
  const data = useMemo(() => parseRescueItemDataVm(rescueItem.data), [rescueItem.data]);
  const parameters = data.parameters ?? [];
  const outcome = resolveRescueOutcome(data.completion, parameterValues, parameters);
  const artwork = outcome === 'undetermined' ? undefined : outcomeImages[outcome][themeName];
  const reducedMotion = useReducedMotion();
  const [finished, setFinished] = useState(!artwork || reducedMotion);
  const [loaded, setLoaded] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }, { scale: scale.value }] }));
  const imageWidth = artwork && size.width && size.height ? Math.max(0, Math.min(size.width - Spacing.pageX * 2, (size.height - Spacing.pageX * 2) / artwork.ratio)) : 0;
  const bannerWidth = Math.min(size.width - Spacing.pageX * 2, Spacing.pageX * 28);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function startTransition() {
    if (!artwork || timer.current || !imageWidth) return;
    timer.current = setTimeout(() => {
      setLoaded(true);
      const targetScale = bannerWidth / imageWidth;
      scale.value = withSequence(withTiming(0.9, { duration: 300 }), withTiming(targetScale, { duration: 600 }));
      translateY.value = withSequence(withTiming(0, { duration: 300 }), withTiming(Spacing.pageX + bannerWidth * artwork.ratio / 2 - size.height / 2, { duration: 600 }, (done) => {
        if (done) runOnJS(setFinished)(true);
      }));
    }, 2500);
  }
  const names = Object.fromEntries(parameters.map((p) => [String(p.id), p.name]));
  const types = Object.fromEntries(parameters.map((p) => [String(p.id), p.type]));
  const { body } = buildRescueCompletionDescription(
    outcome, data.completion, parameterValues, names, types, rescueItem.name, parameters,
  );
  const artworkBorderColor = outcome === 'failed' ? theme.error : theme.success;
  const implications = selectedImplications.filter((item) => item?.description?.trim());
  const visibleParameters = parameters.filter((parameter) => !parameter.isHidden);

  return (
    <ScreenBackground>
      <NoScreenCapture />
      <View style={styles.screen} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {finished ? <Animated.View style={styles.screen} entering={reducedMotion ? undefined : FadeIn.duration(500)}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {artwork && bannerWidth > 0 ? <View style={[styles.frame, styles.banner, { height: bannerWidth * artwork.ratio, borderColor: artworkBorderColor }]}><Image source={artwork.final} style={styles.frameImage} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} /></View> : null}
          <ResultTile style={styles.card}>
            <View style={styles.summaryText}>
              <View style={styles.headingRow}>
                <MaterialIcons name="summarize" size={Spacing.card * 1.5} color={theme.primary} accessible={false} />
                <ThemedText type="subtitle" accessibilityRole="header" style={styles.headingText}>Итог</ThemedText>
              </View>
              <ThemedText>{outcome === 'failed' ? body : outcome === 'undetermined' ? 'Сценарий завершён. Ознакомьтесь с итоговыми показателями и последствиями ваших решений.' : body}</ThemedText>
            </View>
          </ResultTile>

          {visibleParameters.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.heading, styles.headingRow]}>
                <MaterialIcons name="bar-chart" size={Spacing.card * 1.5} color={theme.primary} accessible={false} />
                <ThemedText type="subtitle" accessibilityRole="header" style={styles.headingText}>Ключевые показатели</ThemedText>
              </View>
              <View style={styles.metrics}>
                {visibleParameters.map((p) => {
                  const value = parameterValues[p.id];
                  const display = value === undefined ? '—' : p.type === 'timer' ? formatSecondsAsHms(value) : String(value);
                  const band = value === undefined ? null : findSeverityForValue(value, p.severities);
                  const labels = { normal: 'Нормальная серьёзность', low: 'Низкая серьёзность', medium: 'Средняя серьёзность', high: 'Высокая серьёзность' };
                  const status = band?.severity ? labels[band.severity] : value !== undefined && p.severities?.length && !band ? 'Вне заданных диапазонов' : '';
                  const description = band?.description?.trim();
                  const color = colorForSeverity(band?.severity, {
                    success: theme.onSuccessContainer,
                    warning: theme.onWarningContainer,
                    error: theme.onErrorContainer,
                    neutral: theme.neutral,
                  });
                  return (
                    <ResultTile key={p.id} padding={Spacing.card} accessible accessibilityLabel={`${p.name}: ${display}${p.unit ? ` ${p.unit}` : ''}${status ? `. ${status}` : ''}${description ? `. ${description}` : ''}`} style={[styles.metric, compactMetrics && styles.metricFull]}>
                      <View style={styles.metricContent}>
                        {p.icon ? <View style={[styles.metricIcon, { backgroundColor: theme.primaryContainer }]}>
                          <ParameterIcon icon={p.icon} color={theme.primary} />
                        </View> : null}
                        <View style={styles.metricText}>
                          <ThemedText type="caption" style={{ color: theme.neutral }}>{p.name}</ThemedText>
                          <View style={styles.metricValue}>
                            <ThemedText type="subtitle" style={band?.severity ? { color } : undefined}>{display}</ThemedText>
                            {p.unit ? <ThemedText type="caption" style={{ color: theme.neutral }}>{p.unit}</ThemedText> : null}
                          </View>
                        </View>
                      </View>
                      {status || description ? <View style={styles.metricDescription}>
                        {status ? <ThemedText type="label">{status}</ThemedText> : null}
                        {description ? <ThemedText type="label">{description}</ThemedText> : null}
                      </View> : null}
                    </ResultTile>
                  );
                })}
              </View>
            </View>
          )}

          {implications.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.heading, styles.headingRow]}>
                <MaterialIcons name="fact-check" size={Spacing.card * 1.5} color={theme.primary} accessible={false} />
                <ThemedText type="subtitle" accessibilityRole="header" style={styles.headingText}>Разбор решений</ThemedText>
              </View>
              {implications.map((item, index) => {
                const severity = String(item.severity).toLowerCase();
                const isWarning = severity === RescueParameterSeverityEnum.Medium || severity === RescueParameterSeverityEnum.High;
                const color = severity === RescueParameterSeverityEnum.High ? theme.error : isWarning ? theme.warning : theme.primary;
                const backgroundColor = severity === RescueParameterSeverityEnum.High ? theme.errorContainer : isWarning ? theme.warningContainer : theme.primaryContainer;
                return (
                  <ResultTile key={`${index}-${item.description}`} variant={severity === RescueParameterSeverityEnum.High ? 'danger' : isWarning ? 'warning' : 'primary'} padding={Radius.lg} style={styles.decision} accessible accessibilityLabel={`${severity === RescueParameterSeverityEnum.High ? 'Важное замечание' : isWarning ? 'Предупреждение' : 'Решение'}: ${item.description.trim()}`}>
                    <View style={styles.decisionRow}>
                      <View style={[styles.decisionIcon, { backgroundColor }]}>
                        <MaterialIcons name={isWarning ? 'error-outline' : 'check-circle-outline'} size={Spacing.card * 1.5} color={color} accessible={false} />
                      </View>
                      <ThemedText style={styles.decisionText}>{item.description.trim()}</ThemedText>
                    </View>
                  </ResultTile>
                );
              })}
            </View>
          )}
          <Button title="Завершить" onPress={onBack} variant="primary" size="large" fullWidth accessibilityRole="button" />
        </View>
      </ScrollView>
      </Animated.View> : artwork && imageWidth > 0 ? (
        <Animated.View style={[styles.introImage, loaded && styles.frame, { top: (size.height - imageWidth * artwork.ratio) / 2, width: imageWidth, height: imageWidth * artwork.ratio, borderColor: artworkBorderColor }, animatedStyle]}>
          <ExpoImage source={loaded ? artwork.final : artwork.animation} style={styles.screen} contentFit="cover" onLoad={startTransition} onError={() => setFinished(true)} accessible={false} />
        </Animated.View>
      ) : null}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  introImage: { position: 'absolute', alignSelf: 'center' },
  frame: { borderRadius: Radius.xl, borderWidth: ResultTileTokens.borderWidth, overflow: 'hidden' },
  frameImage: { width: '100%', height: '100%' },
  banner: { width: '100%', marginBottom: Spacing.card },
  scrollContent: { paddingBottom: Spacing.pageBottom },
  content: { width: '100%', maxWidth: Spacing.pageX * 30, alignSelf: 'center', padding: Spacing.pageX },
  card: { marginBottom: Spacing.card * 2 },
  section: { marginBottom: Spacing.card * 2 },
  summaryText: { gap: Radius.sm },
  heading: { marginBottom: Radius.lg },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: Radius.sm },
  headingText: { flexShrink: 1 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Radius.sm },
  metric: { flexBasis: '48%', flexGrow: 1, maxWidth: '50%', minWidth: 0 },
  metricFull: { flexBasis: '100%', maxWidth: '100%' },
  metricContent: { flexDirection: 'row', alignItems: 'center', gap: Radius.sm },
  metricIcon: { width: Spacing.minTouchTarget, height: Spacing.minTouchTarget, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  metricText: { flex: 1, minWidth: 0 },
  metricDescription: { marginTop: Radius.sm },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: Radius.sm },
  parameterIcon: { width: IconSize.resultMetric, height: IconSize.resultMetric },
  decision: { marginBottom: Radius.sm },
  decisionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Radius.md },
  decisionIcon: { width: Spacing.card * 2, height: Spacing.card * 2, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  decisionText: { flex: 1 },
});
