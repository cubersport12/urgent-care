import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import {
  subscribeNotifications,
  type AchievementUnlockPayload,
} from '@/lib/notifications-ws';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const { warning, warningContainer } = useAppTheme();
  const color = warning;
  const name = kind === 'reward' ? 'gift.fill' : 'trophy.fill';

  return (
    <View style={[styles.iconBox, { backgroundColor: warningContainer }]}>
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

type AchievementsUnlockContextValue = {
  /** Показать разблокировки из HTTP-ответа (дубль WS-события achievement_unlocked). */
  showUnlocks: (payloads: AchievementUnlockPayload[] | null | undefined) => void;
};

const AchievementsUnlockContext = createContext<AchievementsUnlockContextValue>({
  showUnlocks: () => {},
});

/** Доступ к показу попапов достижений/наград из любого места дерева. */
export function useAchievementUnlocks() {
  return useContext(AchievementsUnlockContext);
}

/** Listens for `achievement_unlocked` on the notifications WS and shows unlock modals. */
export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  const { primary, text, neutralSoft, page, onPrimary } = useAppTheme();
  const glass = useGlass();
  const [popup, setPopup] = useState<UnlockPopup | null>(null);
  const queueRef = useRef<UnlockPopup[]>([]);
  // WS и HTTP-ответ теста могут доставить одно и то же событие — показываем один раз
  const shownIdsRef = useRef<Set<string>>(new Set());

  const dismiss = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setPopup(next);
  }, []);

  const enqueue = useCallback((items: UnlockPopup[]) => {
    if (!items.length) return;
    queueRef.current.push(...items);
    setPopup((cur) => cur ?? queueRef.current.shift() ?? null);
  }, []);

  const showUnlocks = useCallback(
    (payloads: AchievementUnlockPayload[] | null | undefined) => {
      if (!payloads?.length) return;
      const popups: UnlockPopup[] = [];
      for (const { notification, achievement, reward } of payloads) {
        const dedupId = notification?.id ?? achievement?.id;
        if (!dedupId || shownIdsRef.current.has(dedupId)) continue;
        shownIdsRef.current.add(dedupId);
        popups.push({
          kind: 'achievement',
          title: achievement.title,
          description: achievement.description,
          iconPath: achievement.iconPath,
        });
        if (reward) {
          popups.push({
            kind: 'reward',
            title: reward.title,
            description: reward.description,
            iconPath: reward.iconPath,
            achievementTitle: achievement.title,
          });
        }
      }
      enqueue(popups);
    },
    [enqueue],
  );

  const contextValue = useMemo(() => ({ showUnlocks }), [showUnlocks]);

  useEffect(() => {
    if (!initialized) return;
    if (!session) {
      queueRef.current = [];
      shownIdsRef.current.clear();
      setPopup(null);
      return;
    }
    return subscribeNotifications((ev) => {
      if (ev.type !== 'achievement_unlocked') return;
      showUnlocks([ev.data]);
    });
  }, [initialized, session, showUnlocks]);

  return (
    <AchievementsUnlockContext.Provider value={contextValue}>
      {children}
      <Modal visible={!!popup} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={[styles.backdrop, { backgroundColor: glass.scrim }]}>
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
              <ThemedText style={[styles.btnText, { color: onPrimary }]}>Отлично</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AchievementsUnlockContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
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
    fontWeight: '600',
    fontSize: 16,
  },
});
