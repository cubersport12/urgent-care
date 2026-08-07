import { apiFetch } from '@/lib/api';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

let currentToken: string | null = null;
let handlerReady = false;

function ensureHandler() {
  if (handlerReady) return;
  handlerReady = true;
  // Foreground: in-app toast via WS. Background/killed: system tray via Expo push.
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

function projectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
  );
}

/** Request permission, get Expo push token, register with API. No-op on web / emulator. */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureHandler();

  if (!Device.isDevice) {
    // Remote push is not delivered on Android Emulator / iOS Simulator.
    return;
  }

  try {
    await ensureAndroidChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const id = projectId();
    const tokenRes = id
      ? await Notifications.getExpoPushTokenAsync({ projectId: id })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenRes.data;
    if (!token) return;

    await apiFetch('/api/v1/push-tokens', {
      method: 'PUT',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    currentToken = token;
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
