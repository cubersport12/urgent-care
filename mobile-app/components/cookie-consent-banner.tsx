import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/api/client';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const STORAGE_KEY = 'cookieConsent';

/**
 * Веб-баннер согласия с использованием cookie (152-ФЗ, ст. 10).
 * Выбор сохраняется в localStorage и больше не показывается.
 * Монтируется в корневом layout — absolute внизу работает как fixed.
 */
export function CookieConsentBanner() {
  const { layout1, text, border } = useAppTheme();
  const [choice, setChoice] = useState<'accepted' | 'declined' | null | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setChoice(saved === 'accepted' || saved === 'declined' ? saved : null);
  }, []);

  if (Platform.OS !== 'web' || choice === undefined || choice !== null) {
    return null;
  }

  const save = (value: 'accepted' | 'declined') => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
  };

  return (
    <View style={[styles.banner, { backgroundColor: layout1, borderTopColor: border }]}>
      <ThemedText style={styles.text}>
        Мы используем файлы cookie для корректной работы сайта. Оставаясь на сайте, вы
        соглашаетесь с{' '}
        <Text
          style={styles.link}
          onPress={() =>
            window.open(`${API_BASE_URL}/api/v1/legal/documents/cookies/file`, '_blank')
          }
        >
          правилами использования cookie
        </Text>
        .
      </ThemedText>
      <View style={styles.actions}>
        <Pressable onPress={() => save('declined')} style={styles.declineBtn}>
          <ThemedText style={styles.declineText}>Отклонить</ThemedText>
        </Pressable>
        <Button title="Принять" onPress={() => save('accepted')} size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  link: {
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  declineText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
