import { useFilePdf } from '@/hooks/api';
import { LEGAL_DOCUMENTS, legalDocTitle, type LegalDocId } from '@/lib/legal-docs';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { PdfView } from '@/components/pdf-view/pdf-view';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

/** Нормативные документы: список + просмотр PDF. */
export default function LegalDocsScreen() {
  const { primary, neutralSoft, text } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [selected, setSelected] = useState<{ id: LegalDocId } | null>(null);

  if (selected) {
    return (
      <LegalDocViewer id={selected.id} onBack={() => setSelected(null)} />
    );
  }

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Нормативные документы" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding={0} borderRadius={16}>
          {LEGAL_DOCUMENTS.map((doc, idx) => (
            <View key={doc.id}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                onPress={() => setSelected({ id: doc.id })}
              >
                <IconSymbol name="doc.fill" size={20} color={primary} />
                <ThemedText style={[styles.rowTitle, { color: text }]} numberOfLines={2}>
                  {doc.title}
                </ThemedText>
                <IconSymbol name="chevron.right" size={14} color={neutralSoft} />
              </Pressable>
              {idx < LEGAL_DOCUMENTS.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: 'rgba(128,128,128,0.12)' }]} />
              ) : null}
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function LegalDocViewer({ id, onBack }: { id: LegalDocId; onBack: () => void }) {
  const { response: pdfUri, isLoading } = useFilePdf(`legal/${id}.pdf`);
  const { primary } = useAppTheme();

  return (
    <ScreenBackground style={styles.root}>
      <View style={styles.viewerHeader}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <IconSymbol name="chevron.left" size={26} color={primary} />
          <ThemedText style={[styles.backText, { color: primary }]}>Назад</ThemedText>
        </Pressable>
        <ThemedText type="caption" style={{ color: 'rgba(128,128,128,0.9)' }} numberOfLines={1}>
          {legalDocTitle(id)}
        </ThemedText>
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : pdfUri ? (
        <PdfView source={pdfUri} style={styles.preview} />
      ) : (
        <View style={styles.centered}>
          <ThemedText style={{ color: 'rgba(128,128,128,0.9)', textAlign: 'center' }}>
            Документ ещё не загружен
          </ThemedText>
        </View>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
    marginRight: 16,
  },
  viewerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '400',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  preview: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
});
