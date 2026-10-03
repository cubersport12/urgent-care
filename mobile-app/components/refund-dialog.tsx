import { billingApi } from '@/api/billing';
import { supportApi } from '@/api/support';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { showAlert } from '@/lib/alert';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

/** Причины возврата; новый пункт = новая строка в списке. */
const REASONS = [{ id: 'subscription', label: 'За подписку' }] as const;

type ReasonId = (typeof REASONS)[number]['id'];

function formatMoney(amountRub: number): string {
  return `${amountRub.toLocaleString('ru-RU')} ₽`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Canned-сообщение в поддержку: причина + последний успешный платёж (если есть). */
async function buildRefundMessage(reasonId: ReasonId): Promise<string> {
  const reason = REASONS.find((r) => r.id === reasonId)?.label ?? reasonId;
  let paymentDetails = '';
  try {
    const [payments, tariffs] = await Promise.all([
      billingApi.listPayments(),
      billingApi.listTariffs(),
    ]);
    const succeeded = payments
      .filter((p) => p.status === 'succeeded')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const last = succeeded[0];
    if (last) {
      const tariffTitle = tariffs.find((t) => t.id === last.tariffId)?.title;
      paymentDetails = ` Платёж: «${tariffTitle ?? last.tariffId}», ${formatMoney(last.amountRub)} от ${formatDate(last.createdAt)}.`;
    }
  } catch {
    // без деталей платежа — поддержка уточнит
  }
  return `Здравствуйте! Прошу оформить возврат денежных средств — ${reason}.${paymentDetails} Спасибо!`;
}

export function RefundDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { primary, text, neutralSoft, page, error: dangerColor } = useAppTheme();
  const glass = useGlass();
  const router = useRouter();
  const [sendingReason, setSendingReason] = useState<ReasonId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReasonPress = async (reasonId: ReasonId) => {
    if (sendingReason) return;
    setSendingReason(reasonId);
    setError(null);
    try {
      await supportApi.send(await buildRefundMessage(reasonId));
      onClose();
      showAlert('Запрос отправлен', 'Мы уже видим ваше обращение в чате поддержки.');
      router.push('/(tabs)/profile/support');
    } catch {
      setError('Не удалось отправить запрос. Попробуйте ещё раз.');
    } finally {
      setSendingReason(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: glass.scrim }]} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: page }]} onPress={(e) => e.stopPropagation()}>
          <ThemedText style={[styles.title, { color: text }]}>Возврат средств</ThemedText>
          <ThemedText style={[styles.subtitle, { color: neutralSoft }]}>
            Выберите, за что нужен возврат. Запрос автоматически уйдёт в чат поддержки.
          </ThemedText>

          <View style={styles.reasons}>
            {REASONS.map((reason) => {
              const busy = sendingReason === reason.id;
              return (
                <Pressable
                  key={reason.id}
                  onPress={() => void handleReasonPress(reason.id)}
                  disabled={!!sendingReason}
                  style={({ pressed }) => [
                    styles.reasonRow,
                    {
                      borderColor: glass.border,
                      backgroundColor: pressed ? glass.backgroundHover : glass.backgroundSubtle,
                      opacity: sendingReason && !busy ? 0.5 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="arrow.counterclockwise" size={18} color={primary} />
                  <ThemedText style={[styles.reasonLabel, { color: text }]}>{reason.label}</ThemedText>
                  {busy ? (
                    <ActivityIndicator size="small" color={primary} />
                  ) : (
                    <IconSymbol name="chevron.right" size={14} color={neutralSoft} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {error ? <ThemedText style={[styles.error, { color: dangerColor }]}>{error}</ThemedText> : null}

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <ThemedText style={[styles.cancelText, { color: neutralSoft }]}>Отмена</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  reasons: {
    marginTop: 12,
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
