import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import QRCode from 'react-native-qrcode-svg';
import { ScrollView, StyleSheet, View } from 'react-native';

/**
 * Личный QR-код пользователя. Внутри — id пользователя (UUID);
 * по нему сканер может подгрузить профиль через GET /api/v1/users/{id}/qr-profile.
 */
export default function QrCodeScreen() {
  const { user } = useAuth();
  const { text, neutralSoft } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();

  const name = user?.full_name || user?.email || 'Пользователь';

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="QR-код" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding={24} borderRadius={20} style={styles.card}>
          {user?.id ? (
            // Тёмные модули на белой плитке в обеих темах — иначе QR не сканируется
            // и не виден в тёмной теме.
            <View style={styles.qrBox}>
              <QRCode value={user.id} size={220} color="#111111" backgroundColor="#FFFFFF" />
            </View>
          ) : (
            <ThemedText style={{ color: neutralSoft }}>Пользователь не загружен</ThemedText>
          )}
          <ThemedText type="title" style={[styles.name, { color: text }]} numberOfLines={2}>
            {name}
          </ThemedText>
          {user?.email ? (
            <ThemedText type="caption" style={{ color: neutralSoft }} numberOfLines={1}>
              {user.email}
            </ThemedText>
          ) : null}
        </GlassCard>
        <ThemedText type="caption" style={[styles.hint, { color: neutralSoft }]}>
          Покажите этот код, чтобы поделиться своим профилем, достижениями и наградами
        </ThemedText>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 12,
    alignItems: 'center',
    gap: 16,
  },
  card: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  qrBox: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});
