import { billingApi, type BillingMe, type BillingTariff } from '@/api/billing';
import { ApiError } from '@/api/utils';
import { TariffCard } from '@/components/billing/tariff-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useGlass, useThemeShadow } from '@/hooks/use-theme-color';
import { subscribeTariff } from '@/lib/billing-subscribe';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

/** Заблокированный тарифом материал: для диалога хватает имени и тарифа. */
export type LockedTariffItem = {
  name: string;
  requiredTariffId: string;
};

type Props = {
  item: LockedTariffItem | null;
  onClose: () => void;
  /** Подписка активировалась и контент разблокирован — спискам нужно обновиться. */
  onUnlocked: () => void;
};

/** Диалог «нужна подписка» по тапу на заблокированный материал: снизу выезжает
 *  карточка по высоте контента с конкретным требуемым тарифом (карточка с экрана
 *  подписки) — оформить можно не покидая раздел. */
export function LockedTariffSheet({ item, onClose, onUnlocked }: Props) {
  const { primary, neutralSoft, page, error: dangerColor, onPrimary } = useAppTheme();
  const glass = useGlass();
  const insets = useSafeAreaInsets();
  const shadow = useThemeShadow('large');
  const router = useRouter();

  // Контент держим по последнему открытому элементу, чтобы он не мигал
  // при закрывающей анимации Modal
  const [openedItem, setOpenedItem] = useState<LockedTariffItem | null>(null);
  const [tariff, setTariff] = useState<BillingTariff | null>(null);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (item) setOpenedItem(item);
  }, [item]);

  const load = async () => {
    if (!item) return null;
    setLoading(true);
    setError(null);
    try {
      const [list, billingMe] = await Promise.all([billingApi.listTariffs(), billingApi.me()]);
      setTariff(list.find((t) => t.id === item.requiredTariffId) ?? null);
      setMe(billingMe);
      return billingMe;
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'Не удалось загрузить тарифы');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const refresh = async () => {
    const billingMe = await load();
    // Ранг подписки теперь покрывает требуемый тариф — разблокировано
    if (billingMe && tariff && billingMe.rank >= tariff.rank) {
      onUnlocked();
      onClose();
    }
  };

  const showAllTariffs = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <Modal visible={item != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: glass.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={[styles.sheet, shadow, { backgroundColor: page, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <ThemedText type="h2">Требуется подписка</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText style={{ color: primary }}>Закрыть</ThemedText>
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator size="large" color={primary} style={styles.centered} />
            ) : error ? (
              <View style={styles.centered}>
                <ThemedText style={[styles.notice, { color: dangerColor }]}>{error}</ThemedText>
                <Pressable onPress={() => void load()} style={[styles.btn, { backgroundColor: primary }]}>
                  <ThemedText style={[styles.btnText, { color: onPrimary }]}>Повторить</ThemedText>
                </Pressable>
              </View>
            ) : !tariff || !openedItem ? (
              // Требуемый тариф неактивен или удалён — ведём к полному списку
              <View style={styles.centered}>
                <IconSymbol name="lock.fill" size={28} color={neutralSoft} />
                <ThemedText style={[styles.notice, { color: neutralSoft }]}>
                  Материал «{openedItem?.name}» требует подписку, которая сейчас недоступна.
                  Посмотрите другие тарифы.
                </ThemedText>
                <Pressable onPress={showAllTariffs} style={[styles.btn, { backgroundColor: primary }]}>
                  <ThemedText style={[styles.btnText, { color: onPrimary }]}>Все тарифы</ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                <ThemedText style={[styles.lead, { color: neutralSoft }]}>
                  Для доступа к «{openedItem.name}» оформите подписку:
                </ThemedText>
                <TariffCard
                  tariff={tariff}
                  me={me}
                  busyId={busyId}
                  onSubscribe={(t) => subscribeTariff(t, { me, refresh, setBusyId })}
                />
                <Pressable onPress={showAllTariffs} style={styles.allTariffs} hitSlop={8}>
                  <ThemedText style={{ color: primary }}>Смотреть все тарифы →</ThemedText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    paddingTop: 16,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pageX,
    paddingBottom: 12,
  },
  content: {
    paddingHorizontal: Spacing.pageX,
    gap: 12,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  lead: {
    marginTop: 4,
  },
  notice: {
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    alignSelf: 'stretch',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  allTariffs: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 4,
  },
});
