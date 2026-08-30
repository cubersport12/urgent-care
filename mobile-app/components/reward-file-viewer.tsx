import { IconSymbol } from '@/components/ui/icon-symbol';
import { PdfView } from '@/components/pdf-view/pdf-view';
import { ThemedText } from '@/components/themed-text';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useFilePdf } from '@/hooks/api/useFilePdf';
import { useAppTheme } from '@/hooks/use-theme-color';
import { downloadMediaBlob } from '@/lib/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp)$/i;
const PDF_RE = /\.pdf$/i;

export const baseFileName = (path: string): string => path.split('/').pop() || path;

/**
 * Читаемое имя файла: конструктор кодирует исходное имя в ключ как {guid}--{имя}.{ext}.
 * Для старых вложений (просто {guid}.{ext}) возвращается имя ключа.
 */
export const friendlyFileName = (path: string): string => {
  const base = baseFileName(path);
  const match = base.match(/^[0-9a-f-]{36}--(.+)$/i);
  return match ? match[1] : base;
};

function mimeFor(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

/** Скачивает файл во временный кэш и открывает системный шерит — так файл можно сохранить. */
export async function shareOrDownloadFile(path: string): Promise<void> {
  const blob = await downloadMediaBlob(path);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = friendlyFileName(path);
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(blob);
  });
  const uri = `${FileSystem.cacheDirectory}${friendlyFileName(path)}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(uri, { mimeType: mimeFor(path) });
}

function ImagePreview({ path }: { path: string }) {
  const { primary } = useAppTheme();
  const { response, isLoading } = useFileImage(path);
  if (isLoading) {
    return <ActivityIndicator size="large" color={primary} />;
  }
  if (!response) {
    return <ThemedText style={styles.hint}>Не удалось загрузить изображение</ThemedText>;
  }
  return (
    <Image
      source={{ uri: response }}
      style={styles.preview}
      resizeMode="contain"
    />
  );
}

function PdfPreview({ path }: { path: string }) {
  const { response, isLoading } = useFilePdf(path);
  const { page } = useAppTheme();
  if (isLoading || !response) {
    return <ActivityIndicator size="large" />;
  }
  return (
    <View style={[styles.previewWrap, { backgroundColor: page }]}>
      <PdfView source={response} style={styles.preview} />
    </View>
  );
}

type Props = {
  files: string[];
  index: number | null;
  onClose: () => void;
};

export function RewardFileViewer({ files, index, onClose }: Props) {
  const { text, neutralSoft, layout1: cardColor } = useAppTheme();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const open = index != null && files[index] != null;
  const path = open ? files[index!] : '';

  const handleShare = useCallback(async () => {
    if (!path) return;
    setSharing(true);
    setShareError(null);
    try {
      await shareOrDownloadFile(path);
    } catch {
      setShareError('Не удалось скачать файл');
    } finally {
      setSharing(false);
    }
  }, [path]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: cardColor }]}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: text }]} numberOfLines={1}>
            {friendlyFileName(path)}
          </ThemedText>
          <View style={styles.headerActions}>
            <Pressable onPress={handleShare} disabled={sharing} style={styles.headerBtn}>
              {sharing ? (
                <ActivityIndicator size="small" color={text} />
              ) : (
                <IconSymbol name="square.and.arrow.up.fill" size={22} color={text} />
              )}
            </Pressable>
            <Pressable onPress={onClose} style={styles.headerBtn}>
              <IconSymbol name="xmark.circle.fill" size={26} color={neutralSoft} />
            </Pressable>
          </View>
        </View>
        {shareError ? <ThemedText style={styles.hint}>{shareError}</ThemedText> : null}
        {open ? (
          IMAGE_RE.test(path) ? (
            <ImagePreview path={path} />
          ) : PDF_RE.test(path) ? (
            <PdfPreview path={path} />
          ) : (
            <ThemedText style={styles.hint}>
              Предпросмотр недоступен — скачайте файл кнопкой выше
            </ThemedText>
          )
        ) : null}
      </View>
    </Modal>
  );
}

const SCREEN_W = Dimensions.get('window').width;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBtn: {
    padding: 4,
  },
  preview: {
    flex: 1,
    width: SCREEN_W,
  },
  previewWrap: {
    flex: 1,
    width: '100%',
  },
  hint: {
    textAlign: 'center',
    opacity: 0.6,
    padding: 24,
  },
});
