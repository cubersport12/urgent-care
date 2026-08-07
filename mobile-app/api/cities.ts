import { apiFetch } from '@/lib/api';

export type City = {
  id: string;
  name: string;
  region: string;
  region_type?: string;
  area?: string;
  area_type?: string;
  address?: string;
  label: string;
};

export async function searchCities(q: string, limit = 30): Promise<City[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) params.set('q', q.trim());
  return apiFetch<City[]>(`/api/v1/cities?${params}`);
}
