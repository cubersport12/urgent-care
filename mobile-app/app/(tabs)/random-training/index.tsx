import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Radius, Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const modes: { id: 'ordinary' | 'marathon'; title: string; description: string; icon: IconSymbolName }[] = [
  { id: 'ordinary', title: 'Обычная тренировка', description: 'Выберите уровень и проверьте свои знания', icon: 'list.bullet.clipboard.fill' },
  { id: 'marathon', title: 'Марафон', description: 'Отвечайте на вопросы до первой ошибки', icon: 'bolt.fill' },
];

export default function TrainingMenuScreen() {
  const router = useRouter();
  const { contentPaddingBottom } = useNavRail();
  const { primary, primaryContainer, neutral, neutralSoft, borderVariant, elevated1 } = useAppTheme();

  return (
    <ScreenBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}>
        <ThemedText type="h1">Тренировка</ThemedText>
        <ThemedText type="caption" style={{ color: neutral }}>Выберите, как хотите позаниматься</ThemedText>
        <GlassCard padding={0} borderRadius={Radius.xl}>
          {modes.map((mode, index) => (
            <View key={mode.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={mode.title}
                accessibilityHint={mode.description}
                onPress={() => router.push({ pathname: '/(tabs)/random-training/[mode]', params: { mode: mode.id } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: elevated1 }]}
              >
                <View style={[styles.icon, { backgroundColor: primaryContainer }]}>
                  <IconSymbol name={mode.icon} size={Spacing.card + Spacing.card / 8} color={primary} />
                </View>
                <View style={styles.rowText}>
                  <ThemedText type="defaultSemiBold">{mode.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: neutral }}>{mode.description}</ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={Spacing.card} color={neutralSoft} />
              </Pressable>
              {index < modes.length - 1 && <View style={[styles.divider, { backgroundColor: borderVariant }]} />}
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.pageX, paddingTop: Spacing.card, gap: Spacing.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.card, padding: Spacing.card, minHeight: Spacing.nav },
  icon: { width: Spacing.card * 2, height: Spacing.card * 2, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: Spacing.card / 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.card * 4, marginRight: Spacing.card },
});
