import { searchCities, type City } from '@/api/cities';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  value: City | null;
  onChange: (city: City) => void;
  label?: string;
  placeholder?: string;
  /** Controlled modal (profile). Omit for field+internal open (register). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showField?: boolean;
};

export function CityPicker({
  value,
  onChange,
  label = 'Город',
  placeholder = 'Начните вводить город',
  open: openProp,
  onOpenChange,
  showField = openProp === undefined,
}: Props) {
  const { primary, text, neutralSoft, page, layout1 } = useAppTheme();
  const glass = useGlass();
  const insets = useSafeAreaInsets();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setInternalOpen(v);
  };
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      void searchCities(query)
        .then((rows) => {
          if (!cancelled) setItems(rows);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query]);

  const display = value?.label || value?.name || '';

  return (
    <>
      {showField ? (
        <View style={styles.fieldWrap}>
          <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
          <Pressable
            onPress={() => {
              setQuery(value?.name ?? '');
              setOpen(true);
            }}
            style={[
              styles.fieldTrigger,
              {
                borderColor: glass.border,
                backgroundColor: glass.backgroundSubtle,
              },
            ]}
          >
            <IconSymbol name="mappin.and.ellipse" size={20} color={neutralSoft} />
            <ThemedText
              style={[styles.fieldValue, { color: display ? text : neutralSoft }]}
              numberOfLines={1}
            >
              {display || placeholder}
            </ThemedText>
            <IconSymbol name="chevron.down" size={16} color={neutralSoft} />
          </Pressable>
        </View>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: page, paddingTop: insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">Город</ThemedText>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <ThemedText style={{ color: primary }}>Закрыть</ThemedText>
            </Pressable>
          </View>
          <View
            style={[
              styles.searchBox,
              { borderColor: glass.border, backgroundColor: layout1 },
            ]}
          >
            <IconSymbol name="magnifyingglass" size={18} color={neutralSoft} />
            <TextInput
              style={[styles.searchInput, { color: text }]}
              placeholder={placeholder}
              placeholderTextColor={neutralSoft}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {loading ? <ActivityIndicator size="small" color={primary} /> : null}
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            ListEmptyComponent={
              !loading ? (
                <ThemedText style={[styles.empty, { color: neutralSoft }]}>
                  Ничего не найдено
                </ThemedText>
              ) : null
            }
            renderItem={({ item }) => {
              const active = value?.id === item.id;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { opacity: 0.7 },
                    active && { backgroundColor: glass.backgroundHover },
                  ]}
                >
                  <View style={styles.rowText}>
                    <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
                    <ThemedText style={[styles.rowSub, { color: neutralSoft }]} numberOfLines={2}>
                      {item.label || item.address || item.region}
                    </ThemedText>
                  </View>
                  {active ? <IconSymbol name="checkmark" size={18} color={primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  fieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  fieldValue: { flex: 1, fontSize: 16 },
  modal: { flex: 1, paddingHorizontal: 16 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
    borderRadius: 8,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 32 },
});
