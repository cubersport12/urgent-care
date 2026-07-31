import { achievementsApi, type AchievementMe } from '@/api/achievements';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  AppState,
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

type AchievementsContextValue = {
  checkUnlocks: () => Promise<AchievementMe[]>;
};

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

function seenKey(userId: string) {
  return `uc_ach_seen_${userId}`;
}

function PopupIcon({ path, kind }: { path?: string | null; kind: UnlockPopup['kind'] }) {
  const { response, isLoading } = useFileImage(path ?? '');
  const color = kind === 'reward' ? '#F59E0B' : '#F59E0B';
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

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { session, user, initialized } = useAuth();
  const { primary, text, neutralSoft, page } = useAppTheme();
  const [popup, setPopup] = useState<UnlockPopup | null>(null);
  const queueRef = useRef<UnlockPopup[]>([]);
  const checkingRef = useRef(false);

  const dismiss = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setPopup(next);
  }, []);

  const enqueue = useCallback((items: UnlockPopup[]) => {
    if (!items.length) return;
    queueRef.current.push(...items);
    setPopup((cur) => cur ?? queueRef.current.shift() ?? null);
  }, []);

  const checkUnlocks = useCallback(async (): Promise<AchievementMe[]> => {
    if (!session || !user?.id) return [];
    if (checkingRef.current) {
      try {
        return await achievementsApi.listMine();
      } catch {
        return [];
      }
    }
    checkingRef.current = true;
    try {
      const list = await achievementsApi.listMine();
      const unlocked = list.filter((a) => a.unlocked);
      const key = seenKey(user.id);
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) {
        // First sync: remember current unlocks, don't celebrate history.
        await AsyncStorage.setItem(key, JSON.stringify(unlocked.map((a) => a.id)));
        return list;
      }
      const seen = new Set<string>(JSON.parse(raw) as string[]);
      const newly = unlocked.filter((a) => !seen.has(a.id));
      if (newly.length) {
        for (const a of newly) seen.add(a.id);
        await AsyncStorage.setItem(key, JSON.stringify([...seen]));
        const popups: UnlockPopup[] = [];
        for (const a of newly) {
          popups.push({
            kind: 'achievement',
            title: a.title,
            description: a.description,
            iconPath: a.iconPath,
          });
          if (a.reward) {
            popups.push({
              kind: 'reward',
              title: a.reward.title,
              description: a.reward.description,
              iconPath: a.reward.iconPath,
              achievementTitle: a.title,
            });
          }
        }
        enqueue(popups);
      }
      return list;
    } catch {
      return [];
    } finally {
      checkingRef.current = false;
    }
  }, [session, user?.id, enqueue]);

  useEffect(() => {
    if (!initialized) return;
    if (!session) {
      queueRef.current = [];
      setPopup(null);
      return;
    }
    void checkUnlocks();
  }, [initialized, session, checkUnlocks]);

  useEffect(() => {
    if (!session) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkUnlocks();
    });
    return () => sub.remove();
  }, [session, checkUnlocks]);

  const value = useMemo(() => ({ checkUnlocks }), [checkUnlocks]);

  return (
    <AchievementsContext.Provider value={value}>
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
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) {
    throw new Error('useAchievements must be used within AchievementsProvider');
  }
  return ctx;
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
