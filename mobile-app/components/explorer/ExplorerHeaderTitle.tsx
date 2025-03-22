import { DocumentKind } from '@/constants/DocumentKind';
import { useFolderPath } from '@/hooks/api';
import { useGlobalSearchParams } from 'expo-router';
import { ThemedText } from '../ThemedText';

export default function ExplorerHeaderTitle() {
  const { folderId, documentId, kind } = useGlobalSearchParams<{ folderId: string; documentId?: string; kind?: DocumentKind }>();

  const { data } = useFolderPath(folderId);
  if (documentId == null) {
    return <ThemedText>{data?.map(x => x?.name).join('/')}</ThemedText>;
  }
  if (kind === DocumentKind.Article) {

  }
  return <ThemedText>??</ThemedText>;
}
