import type { AppRescueItemVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import {
  getRescueOutcomeBecauseLines,
  parseRescueItemDataVm,
  rescueCompletionHasConfiguredRules,
  resolveRescueOutcome,
  type RescueOutcome,
} from '@/lib/rescue-completion';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';

type RescueCompleteProps = {
  rescueItem: AppRescueItemVm;
  /** Финальные значения параметров после прохождения сцен */
  parameterValues: Record<string, number>;
  onBack: () => void;
};

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

export function RescueComplete({ rescueItem, parameterValues, onBack }: RescueCompleteProps) {
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
        return `${p.name}: ${v}`;
      })
      .join('\n');
  }, [data.parameters, parameterValues]);

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
