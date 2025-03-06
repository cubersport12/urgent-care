import { DocumentKind } from '@/constants/DocumentKind';
import { useFolder, useFolderPath } from '@/hooks/api';
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';

export default function ExplorerHeaderTitle() {
  const { folderId, documentId, kind } = useGlobalSearchParams<{ folderId: string; documentId?: string; kind?: DocumentKind }>();

  const { data } = useFolderPath(folderId);
  if (documentId == null) {
    return <>{data?.map(x => x.name).join('/')}</>;
  }
  if (kind === DocumentKind.Article) {

  }
  return <>Adasd</>;
}
