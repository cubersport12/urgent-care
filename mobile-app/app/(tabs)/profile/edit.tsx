import { updateMe, uploadAvatar, deleteAvatar } from '@/lib/auth-api';
import type { City } from '@/api/cities';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CityPicker } from '@/components/ui/city-picker';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassInput } from '@/components/ui/glass-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFileImage } from '@/hooks/api/useFileImage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const OCCUPATION_PRESETS = ['Студент', 'Врач', 'Ассистент', 'Руководитель'] as const;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { primary, neutralSoft, border } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const { response: avatarUri } = useFileImage(user?.avatar_key ?? '');

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [age, setAge] = useState(() => {
    if (!user?.birth_year) return '';
    return String(new Date().getFullYear() - user.birth_year);
  });
  const [occupation, setOccupation] = useState(user?.occupation ?? '');
  const [city, setCity] = useState<City | null>(
    user?.city
      ? {
          id: user.city.id,
          name: user.city.name,
          region: user.city.region,
          label: user.city.label,
          address: user.city.address,
        }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках устройства');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar(result.assets[0].uri);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось загрузить фото');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await deleteAvatar();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось удалить фото');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const trimmedAge = age.trim();
    let birthYear: number | null = null;
    if (trimmedAge) {
      const parsed = Number(trimmedAge);
      if (!Number.isInteger(parsed) || parsed < 5 || parsed > 120) {
        Alert.alert('Ошибка', 'Укажите возраст от 5 до 120 лет');
        return;
      }
      birthYear = new Date().getFullYear() - parsed;
    }
    setSaving(true);
    try {
      await updateMe({
        full_name: fullName.trim(),
        birth_year: birthYear,
        occupation: occupation.trim(),
        city_id: city?.id ?? null,
      });
      router.back();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName.trim() || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Редактирование профиля" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding={20} borderRadius={16}>
          <View style={styles.avatarSection}>
            <Pressable onPress={() => void pickAvatar()} style={[styles.avatar, { borderColor: primary }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : initials ? (
                <ThemedText style={[styles.avatarText, { color: primary }]}>{initials}</ThemedText>
              ) : (
                <IconSymbol name="person.fill" size={32} color={primary} />
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: primary }]}>
                <IconSymbol name="photo.fill" size={13} color="#FFFFFF" />
              </View>
            </Pressable>
            {uploadingAvatar ? <ActivityIndicator style={styles.avatarSpinner} /> : null}
            {user?.avatar_key && !uploadingAvatar ? (
              <Pressable onPress={() => void handleRemoveAvatar()}>
                <ThemedText style={[styles.removePhoto, { color: neutralSoft }]}>
                  Удалить фото
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <GlassInput
            label="ФИО"
            icon="person.fill"
            placeholder="Иванов Иван Иванович"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <GlassInput
            label="Возраст"
            icon="clock.fill"
            placeholder="Полных лет"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />

          <View style={styles.block}>
            <ThemedText style={styles.label}>Кем работаете</ThemedText>
            <View style={styles.chipsRow}>
              {OCCUPATION_PRESETS.map((preset) => {
                const active = occupation.toLowerCase() === preset.toLowerCase();
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setOccupation(preset)}
                    style={[
                      styles.chip,
                      { borderColor: active ? primary : border },
                      active && { backgroundColor: `${primary}22` },
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipText, active && { color: primary, fontWeight: '600' }]}
                    >
                      {preset}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <GlassInput
              label="Или укажите сами"
              icon="briefcase.fill"
              placeholder="Например: студент 3 курса"
              value={occupation}
              onChangeText={setOccupation}
              autoCapitalize="sentences"
            />
          </View>

          <View style={styles.block}>
            <ThemedText style={styles.label}>Город</ThemedText>
            <CityPicker
              value={city}
              onChange={(c) => {
                setCity(c);
              }}
            />
          </View>

          <Button
            title={saving ? 'Сохранение...' : 'Сохранить'}
            onPress={() => void handleSave()}
            disabled={saving}
            fullWidth
            size="large"
          />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 132, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpinner: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  removePhoto: {
    fontSize: 13,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  block: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
    paddingLeft: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
  },
});
