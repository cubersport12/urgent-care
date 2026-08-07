import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { subscribeNotifications } from '@/lib/notifications-ws';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type UnlockPopup =
  | {
      kind: 'achievement';
      title: string;
      description?: string | null;
      iconPath?: string | null;
    }
  | {
      kind: 'reward';
      title: string;
      description?: string | null;
      iconPath?: string | null;
      achievementTitle: string;
    };

function PopupIcon({ path, kind }: { path?: string | null; kind: UnlockPopup['kind'] }) {
  const { response, isLoading } = useFileImage(path ?? '');
  const color = '#F59E0B';
  const name = kind === 'reward' ? 'gift.fill' : 'trophy.fill';

  return (
    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
      {path && isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : path && response ? (
        <Image source={{ uri: response }} style={styles.iconImg} resizeMode="cover" />
      ) : (
        <IconSymbol name={name} size={36} color={color} />
      )}
    </View>
  );
}

/** Listens for `achievement_unlocked` on the notifications WS and shows unlock modals. */
export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  const { primary, text, neutralSoft, page } = useAppTheme();
  const [popup, setPopup] = useState<UnlockPopup | null>(null);
  const queueRef = useRef<UnlockPopup[]>([]);

  const dismiss = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setPopup(next);
  }, []);

  const enqueue = useCallback((items: UnlockPopup[]) => {
    if (!items.length) return;
    queueRef.current.push(...items);
    setPopup((cur) => cur ?? queueRef.current.shift() ?? null);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!session) {
      queueRef.current = [];
      setPopup(null);
      return;
    }
    return subscribeNotifications((ev) => {
      if (ev.type !== 'achievement_unlocked') return;
      const { achievement, reward } = ev.data;
      const popups: UnlockPopup[] = [
        {
          kind: 'achievement',
          title: achievement.title,
          description: achievement.description,
          iconPath: achievement.iconPath,
        },
      ];
      if (reward) {
        popups.push({
          kind: 'reward',
          title: reward.title,
          description: reward.description,
          iconPath: reward.iconPath,
          achievementTitle: achievement.title,
        });
      }
      enqueue(popups);
    });
  }, [initialized, session, enqueue]);

  return (
    <>
      {children}
      <Modal visible={!!popup} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: page }]}>
            {popup ? <PopupIcon path={popup.iconPath} kind={popup.kind} /> : null}
            <ThemedText style={[styles.eyebrow, { color: primary }]}>
              {popup?.kind === 'reward' ? 'Вы получили награду!' : 'Вы открыли достижение!'}
            </ThemedText>
            <ThemedText style={[styles.title, { color: text }]}>{popup?.title}</ThemedText>
            {popup?.description ? (
              <ThemedText style={[styles.desc, { color: neutralSoft }]}>{popup.description}</ThemedText>
            ) : null}
            {popup?.kind === 'reward' ? (
              <ThemedText type="caption" style={{ color: neutralSoft, textAlign: 'center' }}>
                За достижение «{popup.achievementTitle}»
              </ThemedText>
            ) : null}
            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <ThemedText style={styles.btnText}>Отлично</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  iconImg: {
    width: 72,
    height: 72,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
