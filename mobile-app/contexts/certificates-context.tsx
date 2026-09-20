import { shareOrDownloadFile } from '@/components/reward-file-viewer';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import {
  subscribeNotifications,
  type CertificateIssuedPayload,
} from '@/lib/notifications-ws';
import React, { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

/**
 * Fullscreen «вам выдан сертификат» — по WS-событию certificate_issued.
 * Очередь сообщений — как в AchievementsProvider.
 */
export function CertificatesProvider({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  const { primary, text, neutralSoft, page } = useAppTheme();
  const [popup, setPopup] = useState<CertificateIssuedPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const queueRef = useRef<CertificateIssuedPayload[]>([]);

  const dismiss = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setPopup(next);
  }, []);

  React.useEffect(() => {
    if (!initialized) return;
    if (!session) {
      queueRef.current = [];
      setPopup(null);
      return;
    }
    return subscribeNotifications((ev) => {
      if (ev.type !== 'certificate_issued') return;
      queueRef.current.push(ev.data);
      setPopup((cur) => cur ?? queueRef.current.shift() ?? null);
    });
  }, [initialized, session]);

  const download = async () => {
    if (!popup || busy) return;
    setBusy(true);
    try {
      await shareOrDownloadFile(popup.filePath);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {children}
      <Modal visible={!!popup} animationType="fade" onRequestClose={dismiss}>
        <View style={[styles.fullscreen, { backgroundColor: page }]}>
          <View style={[styles.iconBox, { borderColor: primary }]}>
            <IconSymbol name="doc.text.fill" size={56} color={primary} />
          </View>
          <ThemedText style={[styles.eyebrow, { color: primary }]}>Поздравляем!</ThemedText>
          <ThemedText style={[styles.title, { color: text }]}>
            Вам выдан сертификат
          </ThemedText>
          <ThemedText style={[styles.name, { color: text }]} numberOfLines={2}>
            {popup?.fullName}
          </ThemedText>
          <ThemedText style={[styles.number, { color: neutralSoft }]}>
            № {popup?.numberLabel}
          </ThemedText>
          <View style={styles.buttons}>
            <Button
              title={busy ? 'Сохранение…' : 'Скачать'}
              onPress={() => void download()}
              disabled={busy}
              fullWidth
              size="large"
            />
            <Button title="Закрыть" onPress={dismiss} disabled={busy} fullWidth size="large" />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  iconBox: {
    width: 108,
    height: 108,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  name: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  number: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttons: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
});
