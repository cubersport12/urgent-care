import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFileImage } from '@/hooks/api/useFileImage';

export function NotificationIcon({ path }: { path?: string | null }) {
  const { response } = useFileImage(path ?? '');
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const { primary, primaryContainer } = useAppTheme();
  const size = Spacing.lg + Spacing.sm;

  if (response && failedPath !== response) {
    return <Image source={{ uri: response }} style={{ width: size, height: size, borderRadius: Radius.md }} onError={() => setFailedPath(response)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: Radius.md, backgroundColor: primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
      <IconSymbol name="bell.fill" size={Spacing.pageX} color={primary} />
    </View>
  );
}
