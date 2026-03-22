-- Таблица статистики режима спасения (аналог articles_stats / tests_stats).
-- Выполните в Supabase SQL Editor или через миграцию.

create table if not exists public.rescue_stats (
  id uuid primary key default gen_random_uuid(),
  "clientId" text not null,
  "rescueId" text not null,
  "startedAt" timestamptz not null,
  "completedAt" timestamptz null,
  "passed" boolean null,
  "data" jsonb null,
  constraint rescue_stats_client_rescue_unique unique ("clientId", "rescueId")
);

create index if not exists rescue_stats_rescue_id_idx on public.rescue_stats ("rescueId");
create index if not exists rescue_stats_client_id_idx on public.rescue_stats ("clientId");

alter table public.rescue_stats enable row level security;

-- Политики под ваш проект (пример: чтение/запись для anon с ключом — скорректируйте под auth):
-- create policy "Allow all for service" on public.rescue_stats for all using (true) with check (true);

comment on table public.rescue_stats is 'Статистика прохождения rescue: старт по «Начать», завершение с passed или выход без прохождения (passed = false)';
