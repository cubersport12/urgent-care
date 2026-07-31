/**
 * Deep-link target for YooKassa return_url
 * (troubledent://billing/return / exp://…/billing/return).
 * AuthSession usually dismisses before this mounts; still route to subscription.
 */
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function BillingReturnScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.page,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Redirect href="/(tabs)/profile/subscription?paid=1" />
    </View>
  );
}
