import {
  type AppRescueItemVm,
  RescueParameterSeverityEnum,
  type RescueScheneChoiceImplicationVm,
} from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import {
  buildRescueCompletionDescription,
  parseRescueItemDataVm,
  resolveRescueOutcome,
} from '@/lib/rescue-completion';
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

export function RescueComplete({
  rescueItem,
  parameterValues,
  selectedImplications = [],
  onBack,
}: RescueCompleteProps) {
  const { page: backgroundColor, primary: primaryShadow, success, error } = useAppTheme();

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

  const titleColor =
    outcome === 'passed' ? success : outcome === 'failed' ? error : undefined;

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
          <ThemedText style={styles.description}>{body}</ThemedText>
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
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
    alignSelf: 'stretch',
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
