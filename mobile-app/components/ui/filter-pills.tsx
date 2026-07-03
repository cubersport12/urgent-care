import { ThemedText } from '@/components/themed-text';
import { useGlass } from '@/hooks/use-theme-color';
import { ScrollView, Pressable, StyleSheet } from 'react-native';

export type FilterKey = 'all' | 'article' | 'test' | 'rescue';

const tabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'article', label: 'Статьи' },
  { key: 'test', label: 'Тесты' },
  { key: 'rescue', label: 'Режимы' },
];

type FilterPillsProps = {
  value: FilterKey;
  onChange: (key: FilterKey) => void;
};

export function FilterPills({ value, onChange }: FilterPillsProps) {
  const glass = useGlass();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? 'rgba(0, 132, 255, 0.15)' : glass.backgroundSubtle,
                borderColor: active ? 'rgba(0, 132, 255, 0.4)' : glass.borderSubtle,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.label,
                { color: active ? '#0084FF' : undefined },
              ]}
              lightColor={active ? '#0070E0' : undefined}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
