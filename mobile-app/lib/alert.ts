import { Alert, Platform } from 'react-native';

/**
 * Alert.alert в react-native-web — no-op (пустой класс), на web ничего не рисует.
 * Показываем через window.alert; onPress единственной кнопки выполняется после закрытия.
 */
export function showAlert(title: string, message?: string, onPress?: () => void): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onPress?.();
    return;
  }
  Alert.alert(title, message, onPress ? [{ text: 'OK', onPress }] : undefined);
}
