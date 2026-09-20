import { shareOrDownloadFile } from '@/components/reward-file-viewer';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { certificatesApi, type AppCertificate } from '@/api/certificates';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { Image, ScrollView, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Просмотр и скачивание сертификата пользователя (PNG из S3).
 * Изображение грузится авторизованным запросом (useFileImage → downloadMediaBlob).
 */
export default function CertificateScreen() {
  const { neutralSoft } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [certificate, setCertificate] = useState<AppCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    certificatesApi
      .my()
      .then((list) => {
        if (!cancelled) setCertificate(list[0] ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { response: imageUri } = useFileImage(certificate?.filePath ?? '');

  const download = async () => {
    if (!certificate || saving) return;
    setSaving(true);
    try {
      await shareOrDownloadFile(certificate.filePath);
    } finally {
      setSaving(false);
    }
  };

  const numberLabel = certificate
    ? `TD-${new Date(certificate.issuedAt).getFullYear()}-${String(certificate.number).padStart(6, '0')}`
    : '';

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Мой сертификат" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ThemedText style={{ color: neutralSoft }}>Загрузка…</ThemedText>
        ) : !certificate ? (
          <ThemedText style={{ color: neutralSoft, textAlign: 'center' }}>
            Сертификат пока не выдан
          </ThemedText>
        ) : (
          <>
            <GlassCard padding={12} borderRadius={16} style={styles.card}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : (
                <ThemedText style={{ color: neutralSoft, textAlign: 'center' }}>
                  Не удалось загрузить изображение
                </ThemedText>
              )}
            </GlassCard>
            <ThemedText type="caption" style={{ color: neutralSoft, textAlign: 'center' }}>
              № {numberLabel}
            </ThemedText>
            <Button
              title={saving ? 'Сохранение…' : 'Скачать'}
              onPress={() => void download()}
              disabled={saving || !imageUri}
              fullWidth
              size="large"
            />
            <ThemedText type="caption" style={[styles.hint, { color: neutralSoft }]}>
              Подлинность можно проверить по QR-коду на сертификате
            </ThemedText>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    gap: 12,
  },
  card: { width: '100%' },
  image: { width: '100%', aspectRatio: 1491 / 1055 },
  hint: {
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});
