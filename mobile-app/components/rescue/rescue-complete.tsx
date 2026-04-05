import {
  type AppRescueItemVm,
  RescueParameterSeverityEnum,
  type RescueScheneChoiceImplicationVm,
} from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import {
  getRescueOutcomeBecauseLines,
  parseRescueItemDataVm,
  rescueCompletionHasConfiguredRules,
  resolveRescueOutcome,
  type RescueOutcome,
} from '@/lib/rescue-completion';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';

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

/** Заливка тега по серьёзности (как у бейджей параметров в сцене) */
function implicationTagBackground(severity?: RescueParameterSeverityEnum): string {
  switch (severity) {
    case RescueParameterSeverityEnum.Normal:
      return 'rgba(96, 125, 139, 0.92)';
    case RescueParameterSeverityEnum.Low:
      return 'rgba(33, 150, 243, 0.92)';
    case RescueParameterSeverityEnum.Medium:
      return 'rgba(255, 152, 0, 0.92)';
    case RescueParameterSeverityEnum.High:
      return 'rgba(211, 47, 47, 0.92)';
    default:
      return 'rgba(0, 0, 0, 0.65)';
  }
}

function outcomeCopy(
  outcome: RescueOutcome,
  hasCompletionRules: boolean,
): { title: string; description: string } {
  switch (outcome) {
    case 'passed':
      return {
        title: 'Успех',
        description: 'Поздравляем! Вы успешно прошли этот режим спасения.',
      };
    case 'failed':
      return {
        title: 'Не пройдено',
        description: 'К сожалению, по итогам сценария этот режим спасения не засчитан как успешный.',
      };
    default:
      if (hasCompletionRules) {
        return {
          title: 'Завершено',
          description:
            'Режим спасения завершён. Итоговые значения параметров не совпали ни с условием успеха, ни с условием неуспеха — результат нельзя отнести к одному из этих исходов.',
        };
      }
      return {
        title: 'Завершено',
        description:
          'Режим спасения завершён. Для автоматической оценки результата в контенте должны быть заданы условия завершения (успех и/или неуспех).',
      };
  }
}

export function RescueComplete({
  rescueItem,
  parameterValues,
  selectedImplications = [],
  onBack,
}: RescueCompleteProps) {
  const { page: backgroundColor, border: borderColor, primary: primaryShadow, success, error } =
    useAppTheme();

  const data = useMemo(() => parseRescueItemDataVm(rescueItem.data), [rescueItem.data]);

  const hasCompletionRules = useMemo(
    () => rescueCompletionHasConfiguredRules(data.completion),
    [data.completion],
  );

  const outcome = useMemo(
    () => resolveRescueOutcome(data.completion, parameterValues),
    [data.completion, parameterValues],
  );

  const parameterNamesById = useMemo(() => {
    const m: Record<string, string> = {};
    (data.parameters ?? []).forEach((p) => {
      m[p.id] = p.name;
    });
    return m;
  }, [data.parameters]);

  const becauseLines = useMemo(
    () => getRescueOutcomeBecauseLines(outcome, data.completion, parameterValues, parameterNamesById),
    [outcome, data.completion, parameterValues, parameterNamesById],
  );

  const { title, description } = outcomeCopy(outcome, hasCompletionRules);

  const titleColor =
    outcome === 'passed' ? success : outcome === 'failed' ? error : undefined;

  const parametersSummary = useMemo(() => {
    const list = data.parameters ?? [];
    if (list.length === 0) return null;
    return list
      .map((p) => {
        const v = parameterValues[p.id];
        if (v === undefined) return `${p.name}: —`;
        const shown = p.type === 'timer' ? formatSecondsAsHms(v) : String(v);
        return `${p.name}: ${shown}`;
      })
      .join('\n');
  }, [data.parameters, parameterValues]);

  const implicationTags = useMemo(() => {
    return selectedImplications.filter((imp) => imp?.description?.trim());
  }, [selectedImplications]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={[styles.title, titleColor ? { color: titleColor } : undefined]}>
            {title}
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {rescueItem.name}
          </ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
          {becauseLines.length > 0 ? (
            <ThemedView style={styles.becauseBlock}>
              <ThemedText style={styles.becauseHeading}>Потому что:</ThemedText>
              {becauseLines.map((line, i) => (
                <ThemedText key={`${i}-${line.slice(0, 24)}`} style={styles.becauseLine}>
                  • {line}
                </ThemedText>
              ))}
            </ThemedView>
          ) : null}
          {implicationTags.length > 0 ? (
            <ThemedView style={styles.implicationsSection}>
              <ThemedText style={styles.implicationsHeading}>Последствия ваших ответов</ThemedText>
              <View style={styles.tagsWrap}>
                {implicationTags.map((imp, i) => {
                  const sev = normalizeImplicationSeverity(imp.severity);
                  const bg = implicationTagBackground(sev);
                  return (
                    <View
                      key={`${i}-${imp.description.slice(0, 32)}`}
                      style={[styles.implicationTag, { backgroundColor: bg }]}
                    >
                      <ThemedText style={styles.implicationTagText}>{imp.description.trim()}</ThemedText>
                    </View>
                  );
                })}
              </View>
            </ThemedView>
          ) : null}
          {parametersSummary ? (
            <ThemedView style={[styles.paramsBox, { borderColor }]}>
              <ThemedText style={styles.paramsLabel}>Итоговые параметры</ThemedText>
              <ThemedText style={styles.paramsText}>{parametersSummary}</ThemedText>
            </ThemedView>
          ) : null}
          <Button
            title="Назад"
            onPress={onBack}
            variant="primary"
            size="large"
            fullWidth
            style={[styles.backButton, { shadowColor: primaryShadow }]}
          />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginBottom: 8,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.75,
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 24,
  },
  becauseBlock: {
    alignSelf: 'stretch',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  becauseHeading: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  becauseLine: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.88,
    marginBottom: 6,
    textAlign: 'left',
  },
  implicationsSection: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  implicationsHeading: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.9,
    textAlign: 'center',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  implicationTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: '100%',
  },
  implicationTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
  paramsBox: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  paramsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  paramsText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: '100%',
    maxWidth: 300,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});
