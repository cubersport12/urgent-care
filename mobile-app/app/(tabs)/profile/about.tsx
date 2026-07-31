import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function AboutScreen() {
  const { neutralSoft, text } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0';

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="О приложении" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding={20} borderRadius={16}>
          <ThemedText style={[styles.appName, { color: text }]}>TroubleDent</ThemedText>
          <ThemedText type="caption" style={{ color: neutralSoft, marginTop: 4 }}>
            Версия {version}
          </ThemedText>
          <View style={styles.divider} />
          <ThemedText style={[styles.body, { color: text }]}>
            Учебное приложение для студентов стоматологического факультета: материалы,
            тесты и сценарии оказания неотложной помощи.
          </ThemedText>
          <ThemedText type="caption" style={{ color: neutralSoft, marginTop: 16 }}>
            Контент и подписки управляются через TroubleDent. Это временная заглушка
            раздела «О приложении» — позже здесь появятся контакты поддержки, политика
            конфиденциальности и условия использования.
          </ThemedText>
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginVertical: 16,
  },
});
