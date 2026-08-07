import { supportApi, type SupportMessage } from '@/api/support';
import { ApiError } from '@/api/utils';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import {
  connectSupportWs,
  disconnectSupportWs,
  subscribeSupport,
} from '@/lib/support-ws';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUGGESTIONS = [
  'Вопрос по подписке и тарифам',
  'Нашёл ошибку в материалах',
  'Проблема в работе приложения',
  'Идея по улучшению',
];

function getMessageTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getDayHeader(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Сегодня';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

export default function SupportChatScreen() {
  const { primary, neutralSoft, text, error: dangerColor, page, layout1, border } = useAppTheme();
  const glass = useGlass();
  const { isWide } = useNavRail();
  const insets = useSafeAreaInsets();
  // Tab bar is ~60–64 absolute; keep a tight gap above it (not contentPaddingBottom=96).
  const composerPad = isWide ? Math.max(insets.bottom, 8) : 64;
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const refresh = useCallback(async () => {
    const thread = await supportApi.getMine();
    setMessages(thread.messages ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setError(null);
          await refresh();
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof ApiError ? e.detail : 'Не удалось загрузить чат');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      void connectSupportWs();
      const unsub = subscribeSupport((m) => {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      });
      return () => {
        cancelled = true;
        unsub();
        disconnectSupportWs();
      };
    }, [refresh]),
  );

  const send = async (customBody?: string) => {
    const body = (customBody ?? draft).trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await supportApi.send(body);
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
      if (!customBody) setDraft('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  const handleSuggestionPress = (prompt: string) => {
    setDraft(`${prompt}: `);
    inputRef.current?.focus();
  };

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar
        title="Служба поддержки"
        subtitle="Отвечаем в течение дня"
        backFallbackHref="/(tabs)/profile"
        right={
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <View style={styles.statusDot} />
            <ThemedText style={styles.statusText}>Онлайн</ThemedText>
          </View>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
            <ThemedText style={[styles.loadingText, { color: neutralSoft }]}>
              Загрузка диалога...
            </ThemedText>
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.centered}>
            <GlassCard padding={20} borderRadius={16} style={styles.errorCard}>
              <ThemedText style={{ color: dangerColor, textAlign: 'center', marginBottom: 12 }}>
                {error}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setLoading(true);
                  void refresh().finally(() => setLoading(false));
                }}
                style={[styles.retryBtn, { backgroundColor: primary }]}
              >
                <IconSymbol name="arrow.counterclockwise" size={16} color="#ffffff" />
                <ThemedText style={styles.retryText}>Повторить</ThemedText>
              </Pressable>
            </GlassCard>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={[styles.list, { paddingBottom: 16 }]}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.welcomeWrap}>
                  <GlassCard padding={20} borderRadius={20}>
                    <View style={styles.welcomeHeader}>
                      <View style={[styles.welcomeIconWrap, { backgroundColor: `${primary}1E` }]}>
                        <IconSymbol name="bubble.left.and.bubble.right.fill" size={26} color={primary} />
                      </View>
                      <View style={styles.welcomeTitleWrap}>
                        <ThemedText style={styles.welcomeTitle}>Чем вам помочь?</ThemedText>
                        <ThemedText style={[styles.welcomeSubtitle, { color: neutralSoft }]}>
                          Задайте вопрос — мы ответим вам в чате и продублируем ответ на почту.
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.suggestionsList}>
                      {SUGGESTIONS.map((s, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => handleSuggestionPress(s)}
                          style={({ pressed }) => [
                            styles.suggestionChip,
                            {
                              borderColor: glass.border,
                              backgroundColor: pressed ? glass.backgroundHover : glass.backgroundSubtle,
                            },
                          ]}
                        >
                          <ThemedText style={[styles.chipText, { color: text }]}>{s}</ThemedText>
                          <IconSymbol name="chevron.right" size={14} color={neutralSoft} />
                        </Pressable>
                      ))}
                    </View>
                  </GlassCard>
                </View>
              }
              renderItem={({ item, index }) => {
                const mine = item.senderRole === 'user';
                const createdIso = item.createdAt || (item as any).created_at;
                const timeStr = getMessageTime(createdIso);

                const prevItem = index > 0 ? messages[index - 1] : null;
                const prevIso = prevItem ? (prevItem.createdAt || (prevItem as any).created_at) : null;
                const currentDay = getDayHeader(createdIso);
                const prevDay = getDayHeader(prevIso);
                const showDateHeader = currentDay && currentDay !== prevDay;

                return (
                  <View key={item.id}>
                    {showDateHeader ? (
                      <View style={styles.dateHeader}>
                        <View style={[styles.dateBadge, { backgroundColor: 'rgba(128,128,128,0.14)' }]}>
                          <ThemedText style={[styles.dateBadgeText, { color: neutralSoft }]}>
                            {currentDay}
                          </ThemedText>
                        </View>
                      </View>
                    ) : null}

                    <View style={[styles.bubbleWrap, mine ? styles.mine : styles.theirs]}>
                      {!mine ? (
                        <View style={[styles.avatarCircle, { backgroundColor: `${primary}20` }]}>
                          <IconSymbol name="bubble.left.and.bubble.right.fill" size={13} color={primary} />
                        </View>
                      ) : null}

                      <View
                        style={[
                          styles.bubble,
                          mine
                            ? [styles.mineBubble, { backgroundColor: primary }]
                            : [
                                styles.theirsBubble,
                                {
                                  backgroundColor: layout1,
                                  borderColor: glass.border,
                                },
                              ],
                        ]}
                      >
                        {!mine ? (
                          <ThemedText style={[styles.senderName, { color: primary }]}>
                            Служба поддержки
                          </ThemedText>
                        ) : null}

                        <ThemedText style={[styles.bodyText, { color: mine ? '#FFFFFF' : text }]}>
                          {item.body}
                        </ThemedText>

                        {timeStr ? (
                          <View style={styles.timeRow}>
                            <ThemedText
                              style={[
                                styles.timeText,
                                { color: mine ? 'rgba(255,255,255,0.75)' : neutralSoft },
                              ]}
                            >
                              {timeStr}
                            </ThemedText>
                            {mine ? (
                              <IconSymbol name="checkmark" size={11} color="rgba(255,255,255,0.75)" />
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              }}
            />

            <View
              style={[
                styles.composer,
                {
                  backgroundColor: page,
                  borderTopColor: border,
                  paddingBottom: composerPad,
                },
              ]}
            >
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: glass.backgroundSubtle,
                    borderColor: glass.border,
                  },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: text }]}
                  placeholder="Сообщение..."
                  placeholderTextColor={neutralSoft}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={2000}
                />
              </View>

              <Pressable
                onPress={() => void send()}
                disabled={sending || !draft.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor: draft.trim() ? primary : 'rgba(128,128,128,0.18)',
                    opacity: pressed ? 0.8 : sending || !draft.trim() ? 0.6 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <IconSymbol
                    name="paperplane.fill"
                    size={16}
                    color={draft.trim() ? '#FFFFFF' : neutralSoft}
                  />
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorCard: { width: '100%', maxWidth: 320, alignItems: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },

  list: { paddingHorizontal: Spacing.pageX, paddingTop: 8, gap: 10, flexGrow: 1 },

  welcomeWrap: { marginTop: 16 },
  welcomeHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 16 },
  welcomeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitleWrap: { flex: 1, gap: 4 },
  welcomeTitle: { fontSize: 17, fontWeight: '700' },
  welcomeSubtitle: { fontSize: 13, lineHeight: 18 },
  suggestionsList: { gap: 8, marginTop: 4 },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '500', flex: 1, marginRight: 8 },

  dateHeader: { alignItems: 'center', marginVertical: 12 },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateBadgeText: { fontSize: 11, fontWeight: '600' },

  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 2,
    maxWidth: '86%',
  },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  mineBubble: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  theirsBubble: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
  },
  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  bodyText: { fontSize: 15, lineHeight: 20 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  timeText: { fontSize: 10, fontWeight: '500' },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' as never },
      default: {},
    }),
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
