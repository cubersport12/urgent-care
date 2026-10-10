/**
 * Метка сборки для биллинга: бекенд по ней выбирает платёжную систему.
 * EXPO_PUBLIC_BUILD_CHANNEL=rustore инлайнится только в rustore-сборку (CI),
 * в вебе и обычном APK переменной нет → 'web' (YooKassa redirect).
 */
export const buildChannel: 'rustore' | 'web' =
  process.env.EXPO_PUBLIC_BUILD_CHANNEL === 'rustore' ? 'rustore' : 'web';
