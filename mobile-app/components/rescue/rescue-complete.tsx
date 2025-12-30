import { useAppTheme } from '@/hooks/use-theme-color';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';

type RescueCompleteProps = {
  onBack: () => void;
};

export function RescueComplete({ onBack }: RescueCompleteProps) {
  const { page: backgroundColor, border: borderColor, primary: primaryShadow } = useAppTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Завершено
        </ThemedText>
        <ThemedText style={styles.description}>
          Режим спасения завершен.
        </ThemedText>
        <Button
          title="Назад"
          onPress={onBack}
          variant="primary"
          size="large"
          fullWidth
          style={[styles.backButton, { shadowColor: primaryShadow }]}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginBottom: 16,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.7,
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

