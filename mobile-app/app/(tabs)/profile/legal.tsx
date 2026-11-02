import { useFilePdf } from '@/hooks/api';
import { LEGAL_DOCUMENTS, type LegalDocId } from '@/lib/legal-docs';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { PdfView } from '@/components/pdf-view/pdf-view';
import { BackButton } from '@/components/explorer/back-button';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** Нормативные документы: список + просмотр PDF. */
export default function LegalDocsScreen() {
  const { primary, neutralSoft, text, borderVariant } = useAppTheme();
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
                <View style={[styles.divider, { backgroundColor: borderVariant }]} />
              ) : null}
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function LegalDocViewer({ id, onBack }: { id: LegalDocId; onBack: () => void }) {
  useChromeBack(onBack);
  const { response: pdfUri, isLoading } = useFilePdf(`legal/${id}.pdf`);
  const { neutral } = useAppTheme();
  const glass = useGlass();
  const headerOffset = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(headerOffset.value, { duration: 220 }) }],
  }));
  const title = LEGAL_DOCUMENTS.find((document) => document.id === id)?.title ?? 'Документ';

  return (
    <ScreenBackground style={styles.root}>
      <Animated.View style={[styles.viewerHeader, { backgroundColor: glass.header, borderBottomColor: glass.border }, headerStyle]}>
        <View style={styles.viewerTitle} pointerEvents="none">
          <ThemedText type="defaultSemiBold" style={styles.viewerTitleText} numberOfLines={1} accessibilityRole="header">
            {title}
          </ThemedText>
        </View>
        <View style={styles.viewerCloseButton}>
          <BackButton onPress={onBack} close label="Закрыть документ" />
        </View>
      </Animated.View>
      {isLoading ? (
        <LoadingOverlay />
      ) : pdfUri ? (
        <PdfView source={pdfUri} style={styles.preview} onScrollDirection={(direction) => {
          headerOffset.value = direction === 'down' ? -64 : 0;
        }} />
      ) : (
        <View style={styles.centered}>
          <ThemedText style={{ color: neutral, textAlign: 'center' }}>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  viewerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTitleText: {
    fontSize: 18,
    textAlign: 'center',
    maxWidth: '70%',
  },
  viewerCloseButton: {
    marginLeft: 'auto',
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
