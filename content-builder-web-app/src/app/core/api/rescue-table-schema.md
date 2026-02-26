# Структура таблицы Rescue (БД)

Таблица хранит элементы режима спасения (визуальная новелла с параметрами по таймеру). Данные сцен и параметров хранятся в колонке `data` (JSONB).

## SQL (Supabase / PostgreSQL)

```sql
-- Таблица rescue
create table if not exists rescue (
  id uuid primary key default gen_random_uuid(),
  "order" integer,
  name text not null,
  parent_id uuid references rescue(id) on delete cascade,
  created_at timestamptz not null default now(),
  description text not null default '',
  data jsonb default '{}'
);

-- Индексы для выборки по parent_id
create index if not exists idx_rescue_parent_id on rescue(parent_id);

-- Комментарии
comment on table rescue is 'Режим спасения: визуальная новелла с общими параметрами по таймеру';
comment on column rescue.data is 'JSON: { parameters?: RescueTimerParameter[], scenes?: RescueScene[] }';
```

## Структура JSON в колонке `data`

```ts
{
  "parameters": [
    {
      "id": "string (uuid)",
      "name": "string",
      "delta": "number",
      "startValue": "number"
    }
  ],
  "scenes": [
    {
      "id": "string (uuid)",
      "order": "number | null",
      "background": "string (URL или id фона)",
      "text": "string",
      "choices": [
        {
          "id": "string (uuid)",
          "text": "string",
          "parameterChanges": [
            { "parameterId": "string", "value": "number" }
          ],
          "nextSceneId": "string | null"
        }
      ]
    }
  ]
}
```

- **parameters** — общие параметры, изменяемые по таймеру: `id`, `name`, `delta` (изменение за тик), `startValue`.
- **scenes** — сцены: `background`, `text`, массив **choices**.
- **choices** — каждый выбор: `text`, `parameterChanges` (какие параметры на какое значение менять), `nextSceneId` (id следующей сцены; при выборе А — сцена А, при выборе Б — сцена Б).

Типы в коде: `@/core/utils/types.ts` (`RescueTimerParameterVm`, `RescueSceneVm`, `RescueSceneChoiceVm`, `RescueChoiceParameterChangeVm`).
