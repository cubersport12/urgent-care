/** Метка сборки для выбора платёжного провайдера на бекенде. */
export const buildChannel: string = process.env.EXPO_PUBLIC_BUILD_CHANNEL || 'web';
