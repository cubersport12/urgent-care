import { DocumentKind } from '@/constants/DocumentKind';
import { useFileContentString } from '@/hooks/api';
import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import WebView from 'react-native-webview';

export default function Article() {
  const { documentId, kind } = useLocalSearchParams<{ documentId: string; kind: DocumentKind }>();
  const isNative = Platform.select({
    web: false,
    default: true
  });
  const html = useFileContentString(`${documentId}.html`)?.replace(/color:#000000/g, 'color:white');
  const htmlContainerClass = 'h-full overflow-y-auto overflow-x-hidden p-2 w-full text-white';
  if (isNative) {
    return (
      <WebView className={htmlContainerClass} source={{ html: '' }} />
    );
  }
  return (<div className={htmlContainerClass} dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>);
}
