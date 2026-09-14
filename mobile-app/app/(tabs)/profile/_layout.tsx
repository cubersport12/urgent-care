import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="qr-code" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="support" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="sessions" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
