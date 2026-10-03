import { usePreventScreenCapture } from 'expo-screen-capture';
import { Platform } from 'react-native';

/**
 * Пока смонтирован, запрещает скриншоты и запись экрана:
 * Android — FLAG_SECURE (пустой экран в снимках, записях и превью недавних приложений),
 * iOS — нативный запрет capture (пустой кадр). Web не поддерживается системно — no-op.
 */
function SecureGuard() {
  usePreventScreenCapture();
  return null;
}

export function NoScreenCapture() {
  return Platform.OS === 'web' ? null : <SecureGuard />;
}
