import {
  type AppRescueItemVm,
  RescueParameterSeverityEnum,
  type RescueScheneChoiceImplicationVm,
} from '@/hooks/api/types';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { useAppTheme } from '@/hooks/use-theme-color';
import {
  buildRescueCompletionDescription,
  parseRescueItemDataVm,
  resolveRescueOutcome,
} from '@/lib/rescue-completion';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';
import { GlassCard } from '../ui/glass-card';
import { IconSymbol } from '../ui/icon-symbol';
import { NoScreenCapture } from '../ui/no-screen-capture';
import { ScreenBackground } from '../ui/screen-background';

type RescueCompleteProps = {
  rescueItem: AppRescueItemVm;
  /** Финальные значения параметров после прохождения сцен */
  parameterValues: Record<string, number>;
  /** Implications всех выбранных вариантов ответа по порядку прохождения */
  selectedImplications?: RescueScheneChoiceImplicationVm[];
  onBack: () => void;
};

function normalizeImplicationSeverity(raw: unknown): RescueParameterSeverityEnum | undefined {
  if (typeof raw !== 'string') {
    for (const s of Object.values(RescueParameterSeverityEnum)) {
      if (s === raw) return s;
    }
    return undefined;
  }
  const v = raw.toLowerCase().trim();
  for (const s of Object.values(RescueParameterSeverityEnum)) {
    if (s === v) return s;
  }
  return undefined;
}

export function RescueComplete({
  rescueItem,
  parameterValues,
  selectedImplications = [],
  onBack,
}: RescueCompleteProps) {
  const {
    success,
    error,
    primary,
    successContainer,
    errorContainer,
    primaryContainer,
    white,
    border,
    severityNormal,
    severityLow,
    severityMedium,
    severityHigh,
    neutral,
  } = useAppTheme();

  const implicationTagBackground = (severity?: RescueParameterSeverityEnum): string => {
    switch (severity) {
      case RescueParameterSeverityEnum.Normal:
        return severityNormal;
      case RescueParameterSeverityEnum.Low:
        return severityLow;
      case RescueParameterSeverityEnum.Medium:
        return severityMedium;
      case RescueParameterSeverityEnum.High:
        return severityHigh;
      default:
        return neutral;
    }
  };

  const data = useMemo(() => parseRescueItemDataVm(rescueItem.data), [rescueItem.data]);

  const outcome = useMemo(
    () => resolveRescueOutcome(data.completion, parameterValues, data.parameters ?? []),
    [data.completion, parameterValues, data.parameters],
  );

  const parameterNamesById = useMemo(() => {
    const m: Record<string, string> = {};
    (data.parameters ?? []).forEach((p) => {
      m[String(p.id)] = p.name;
    });
    return m;
  }, [data.parameters]);

  const parameterTypesById = useMemo(() => {
    const m: Record<string, 'timer' | 'numeric' | undefined> = {};
    (data.parameters ?? []).forEach((p) => {
      const t = p.type === 'timer' ? 'timer' : p.type === 'numeric' ? 'numeric' : undefined;
      m[String(p.id)] = t;
    });
    return m;
  }, [data.parameters]);

  const { title, body } = useMemo(
    () =>
      buildRescueCompletionDescription(
        outcome,
        data.completion,
        parameterValues,
        parameterNamesById,
        parameterTypesById,
        rescueItem.name,
        data.parameters ?? [],
      ),
    [
      outcome,
      data.completion,
      parameterValues,
      parameterNamesById,
      parameterTypesById,
      rescueItem.name,
      data.parameters,
    ],
  );

  const emblem = useMemo(() => {
    if (outcome === 'passed') {
      return { icon: 'checkmark.circle.fill' as const, color: success, bg: successContainer };
    }
    if (outcome === 'failed') {
      return { icon: 'xmark.circle.fill' as const, color: error, bg: errorContainer };
    }
    return { icon: 'info.circle.fill' as const, color: primary, bg: primaryContainer };
  }, [outcome, success, error, primary, successContainer, errorContainer, primaryContainer]);

  /** Финальные значения параметров: таймеры — в формате ЧЧ:ММ:СС */
  const parameterRows = useMemo(() => {
    return (data.parameters ?? []).map((p) => {
      const value = parameterValues[p.id];
      const display =
        value === undefined
          ? '—'
          : p.type === 'timer'
            ? formatSecondsAsHms(value)
            : String(value);
      return { id: p.id, name: p.name, display };
    });
  }, [data.parameters, parameterValues]);

  const titleColor =
    outcome === 'passed' ? success : outcome === 'failed' ? error : undefined;

  const implicationTags = useMemo(() => {
    return selectedImplications.filter((imp) => imp?.description?.trim());
  }, [selectedImplications]);

  return (
    <ScreenBackground style={styles.container}>
      <NoScreenCapture />
      <Animated.View style={styles.flex} entering={FadeIn.duration(300)}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
            {/* Эмблема результата */}
            <View style={[styles.emblem, { backgroundColor: emblem.bg }]}>
              <IconSymbol name={emblem.icon} size={44} color={emblem.color} />
            </View>
            <ThemedText type="title" style={[styles.title, titleColor ? { color: titleColor } : undefined]}>
              {title}
            </ThemedText>
            <ThemedText type="caption" style={styles.subtitle} numberOfLines={2}>
              {rescueItem.name}
            </ThemedText>

            {/* Итог: связное объяснение, почему такой исход */}
            <GlassCard padding={16} borderRadius={16} style={styles.card}>
              <ThemedText type="label" style={styles.cardHeading}>
                Итог
              </ThemedText>
              <ThemedText style={styles.body}>{body}</ThemedText>
            </GlassCard>

            {/* Финальные значения параметров сцены */}
            {parameterRows.length > 0 ? (
              <GlassCard padding={16} borderRadius={16} style={styles.card}>
                <ThemedText type="label" style={styles.cardHeading}>
                  Показатели
                </ThemedText>
                <View style={styles.rowsWrap}>
                  {parameterRows.map((row) => (
                    <View key={row.id} style={[styles.parameterRow, { borderBottomColor: border }]}>
                      <ThemedText style={styles.parameterName}>{row.name}</ThemedText>
                      <ThemedText type="mono" style={styles.parameterValue}>
                        {row.display}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ) : null}

            {implicationTags.length > 0 ? (
              <GlassCard padding={16} borderRadius={16} style={styles.card}>
                <ThemedText type="label" style={styles.cardHeading}>
                  Последствия ваших ответов
                </ThemedText>
                <View style={styles.tagsWrap}>
                  {implicationTags.map((imp, i) => {
                    const sev = normalizeImplicationSeverity(imp.severity);
                    const bg = implicationTagBackground(sev);
                    return (
                      <View
                        key={`${i}-${imp.description.slice(0, 32)}`}
                        style={[styles.implicationTag, { backgroundColor: bg }]}
                      >
                        <ThemedText style={[styles.implicationTagText, { color: white }]}>
                          {imp.description.trim()}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </GlassCard>
            ) : null}

            <Button
              title="Готово"
              onPress={onBack}
              variant="primary"
              size="large"
              fullWidth
              style={styles.backButton}
            />
          </ThemedView>
        </ScrollView>
      </Animated.View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  content: {
    padding: 16,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  emblem: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    marginBottom: 4,
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
  card: {
    marginBottom: 12,
    width: '100%',
  },
  cardHeading: {
    opacity: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  rowsWrap: {
    gap: 10,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  parameterName: {
    fontSize: 15,
    flex: 1,
    opacity: 0.85,
  },
  parameterValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  implicationTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: '100%',
  },
  implicationTagText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  backButton: {
    marginTop: 8,
    maxWidth: 300,
    alignSelf: 'center',
  },
});
