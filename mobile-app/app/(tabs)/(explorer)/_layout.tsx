import ExplorerHeaderTitle from '@/components/explorer/ExplorerHeaderTitle';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerTitle: () => <ExplorerHeaderTitle /> }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
