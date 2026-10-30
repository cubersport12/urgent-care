import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Radius, ResultTileTokens, Spacing } from '@/constants/theme';
import {
  type AppRescueItemVm,
  RescueParameterSeverityEnum,
  type RescueScheneChoiceImplicationVm,
} from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFileImage } from '@/hooks/api/useFileImage';
import {
  buildRescueCompletionDescription,
  parseRescueItemDataVm,
  resolveRescueOutcome,
} from '@/lib/rescue-completion';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
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
  passed: { animation: require('@/assets/images/rescue/success.gif'), final: require('@/assets/images/rescue/success-final.png'), ratio: 485 / 800 },
  failed: { animation: require('@/assets/images/rescue/failure.gif'), final: require('@/assets/images/rescue/failure-final.png'), ratio: 525 / 800 },
} as const;

function ParameterIcon({ icon, color }: { icon?: string; color: string }) {
  const isImage = !!icon && /\.png$/i.test(icon);
  const { response } = useFileImage(isImage ? icon : '');
  if (isImage) {
    return response ? <Image source={{ uri: response }} style={styles.parameterIcon} resizeMode="contain" /> : null;
  }
  return icon && Object.prototype.hasOwnProperty.call(MaterialIcons.glyphMap, icon)
    ? <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={Spacing.card * 1.5} color={color} />
    : null;
}

export function RescueComplete({ rescueItem, parameterValues, selectedImplications = [], onBack }: RescueCompleteProps) {
  const theme = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const compactMetrics = width < ResultTileTokens.metricCompactBreakpoint || fontScale > ResultTileTokens.metricCompactFontScale;
  const data = useMemo(() => parseRescueItemDataVm(rescueItem.data), [rescueItem.data]);
  const parameters = data.parameters ?? [];
  const outcome = resolveRescueOutcome(data.completion, parameterValues, parameters);
  const artwork = outcome === 'undetermined' ? undefined : outcomeImages[outcome];
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
    }, 3500);
  }
  const names = Object.fromEntries(parameters.map((p) => [String(p.id), p.name]));
  const types = Object.fromEntries(parameters.map((p) => [String(p.id), p.type]));
  const { title, body } = buildRescueCompletionDescription(
    outcome, data.completion, parameterValues, names, types, rescueItem.name, parameters,
  );
  const emblemColor = outcome === 'failed' ? theme.error : theme.primary;
  const implications = selectedImplications.filter((item) => item?.description?.trim());
  const visibleParameters = parameters.filter((parameter) => !parameter.isHidden);

  return (
    <ScreenBackground>
      <NoScreenCapture />
      <View style={styles.screen} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {finished ? <Animated.View style={styles.screen} entering={reducedMotion ? undefined : FadeIn.duration(500)}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {artwork && bannerWidth > 0 ? <View style={[styles.frame, styles.banner, { height: bannerWidth * artwork.ratio, borderColor: emblemColor }]}><Image source={artwork.final} style={styles.frameImage} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} /></View> : null}
          <View style={[styles.hero, compactMetrics && styles.heroCompact]}>
            <View style={[styles.emblem, { backgroundColor: outcome === 'failed' ? theme.errorContainer : theme.primaryContainer }]}>
              <MaterialIcons name={outcome === 'failed' ? 'error-outline' : outcome === 'passed' ? 'verified-user' : 'info-outline'} size={Spacing.card * 2} color={emblemColor} accessible={false} />
            </View>
            <View style={styles.heroText}>
              <ThemedText type="h1" accessibilityRole="header">{title}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.neutral }]}>{rescueItem.name}</ThemedText>
            </View>
          </View>

          <ResultTile style={styles.card}>
            <View style={styles.summaryText}>
              <ThemedText type="subtitle" accessibilityRole="header">Итог</ThemedText>
              <ThemedText>{outcome === 'failed' ? `Не удалось достичь успешного исхода. Разберите свои решения и попробуйте ещё раз.\n\n${body}` : outcome === 'undetermined' ? 'Сценарий завершён. Ознакомьтесь с итоговыми показателями и последствиями ваших решений.' : body}</ThemedText>
            </View>
          </ResultTile>

          {visibleParameters.length > 0 && (
            <View style={styles.section}>
              <View style={styles.heading}>
                <ThemedText type="subtitle" accessibilityRole="header">Ключевые показатели</ThemedText>
              </View>
              <View style={styles.metrics}>
                {visibleParameters.map((p) => {
                  const value = parameterValues[p.id];
                  const display = value === undefined ? '—' : p.type === 'timer' ? formatSecondsAsHms(value) : String(value);
                  return (
                    <ResultTile key={p.id} padding={Spacing.card} accessible accessibilityLabel={`${p.name}: ${display}${p.unit ? ` ${p.unit}` : ''}`} style={[styles.metric, compactMetrics && styles.metricFull]}>
                      <View style={styles.metricContent}>
                        <View style={styles.metricHeading}>
                          <ParameterIcon icon={p.icon} color={theme.primary} />
                          <ThemedText type="caption" style={styles.metricName}>{p.name}</ThemedText>
                        </View>
                        <View style={styles.metricValue}>
                          <ThemedText type="subtitle">{display}</ThemedText>
                          {p.unit ? <ThemedText type="caption" style={{ color: theme.neutral }}>{p.unit}</ThemedText> : null}
                        </View>
                      </View>
                    </ResultTile>
                  );
                })}
              </View>
            </View>
          )}

          {implications.length > 0 && (
            <View style={styles.section}>
              <View style={styles.heading}>
                <ThemedText type="subtitle" accessibilityRole="header">Разбор решений</ThemedText>
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
        <Animated.View style={[styles.introImage, styles.frame, { top: (size.height - imageWidth * artwork.ratio) / 2, width: imageWidth, height: imageWidth * artwork.ratio, borderColor: emblemColor }, animatedStyle]}>
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
  banner: { width: '100%' },
  scrollContent: { paddingBottom: Spacing.pageBottom },
  content: { width: '100%', maxWidth: Spacing.pageX * 30, alignSelf: 'center', padding: Spacing.pageX },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.card, marginVertical: Spacing.card },
  heroCompact: { alignItems: 'flex-start', flexDirection: 'column' },
  heroText: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  emblem: { width: Spacing.header, height: Spacing.header, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  subtitle: { marginTop: Radius.sm },
  card: { marginBottom: Spacing.card * 2 },
  section: { marginBottom: Spacing.card * 2 },
  summaryText: { gap: Radius.sm },
  heading: { marginBottom: Radius.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Radius.sm },
  metric: { flexBasis: '48%', flexGrow: 1, minWidth: 0 },
  metricFull: { flexBasis: '100%' },
  metricContent: { flex: 1, gap: Spacing.card, justifyContent: 'space-between' },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: Radius.sm },
  metricName: { flex: 1 },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: Radius.sm },
  parameterIcon: { width: Spacing.card * 1.5, height: Spacing.card * 1.5 },
  decision: { marginBottom: Radius.sm },
  decisionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Radius.md },
  decisionIcon: { width: Spacing.card * 2, height: Spacing.card * 2, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  decisionText: { flex: 1 },
});
