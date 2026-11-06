import { apiFetch } from '@/lib/api';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

let currentToken: string | null = null;
let handlerReady = false;

async function savePushToken(token: string): Promise<void> {
  const previousToken = currentToken;
  await apiFetch('/api/v1/push-tokens', {
    method: 'PUT',
    body: JSON.stringify({ token, platform: 'android' }),
  });
  currentToken = token;
  if (previousToken && previousToken !== token) {
    await apiFetch(`/api/v1/push-tokens?token=${encodeURIComponent(previousToken)}`, {
      method: 'DELETE',
    });
  }
}

export function subscribePushTokenChanges(): () => void {
  if (Platform.OS !== 'android') return () => {};
  const subscription = Notifications.addPushTokenListener((token) => {
    if (token.type === 'android') {
      void savePushToken(token.data).catch((error) => console.warn('push register failed', error));
    }
  });
  return () => subscription.remove();
}

function ensureHandler() {
  if (handlerReady) return;
  handlerReady = true;
  // Foreground: in-app toast via WS. Background: system notification via FCM.
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const active = AppState.currentState === 'active';
      return {
        shouldShowBanner: !active,
        shouldShowList: !active,
        shouldPlaySound: !active,
        shouldSetBadge: true,
      };
    },
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Уведомления',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Request permission and register the Android FCM token with the API. */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS !== 'android') return;
  ensureHandler();

  try {
    await ensureAndroidChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const tokenRes = await Notifications.getDevicePushTokenAsync();
    const token = tokenRes.data;
    if (!token) return;

    await savePushToken(token);
  } catch (e) {
    console.warn('push register failed', e);
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!currentToken || Platform.OS === 'web') {
    currentToken = null;
    return;
  }
  const token = currentToken;
  currentToken = null;
  try {
    await apiFetch(`/api/v1/push-tokens?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  } catch {
    // ignore
  }
}
