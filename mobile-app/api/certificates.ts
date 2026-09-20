import { apiCall } from '@/api/utils';
import { certificatesListMyCertificates } from '@/api/generated/sdk.gen';
import type { CertificateOut } from '@/api/generated/types.gen';

export type AppCertificate = CertificateOut;

export const certificatesApi = {
  /** Сертификаты текущего пользователя (обычно 0 или 1). */
  my: (): Promise<AppCertificate[]> => apiCall(() => certificatesListMyCertificates()),
};
