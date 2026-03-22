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
comment on column rescue.data is 'JSON: { parameters?, scenes?, defaultBackground?, completion? }';
```

## Структура JSON в колонке `data`

```ts
{
  "defaultBackground": "string (URL или id файла фона по умолчанию, optional)",
  "parameters": [
    {
      "id": "string (uuid)",
      "name": "string",
      "delta": "number",
      "startValue": "number",
      "severities": [
        { "min": "number (optional)", "max": "number (optional)", "severity": "'normal' | 'low' | 'medium' | 'high' (optional)", "description": "string (optional)" }
      ]
    }
  ],
  "scenes": [
    {
      "id": "string (uuid)",
      "order": "number | null",
      "background": "string (URL или id фона)",
      "text": "string",
      "hidden": "boolean | null",
      "isReviewed": "boolean | null (сцена проверена на ошибки)",
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
  ],
  "completion": {
    "success": "RescueCompletionCondition (optional)",
    "failure": "RescueCompletionCondition (optional)"
  }
}
```

**completion** (опционально) — условия завершения (`AppRescueItemCompletionVm`):

- **success** / **failure** — деревья условий одного вида:
  - **compare** — `{ "type": "compare", "parameterId": "string", "operator": "eq" | "neq" | "gt" | "gte" | "lt" | "lte", "value": number }` (значение параметра по `parameterId` сравнивается с `value`);
  - **group** — `{ "type": "group", "logicalOperator": "and" | "or", "conditions": [ ... ] }` (вложенные compare и/или group).

Пример успеха: параметр `1` ∈ (5, 50), параметр `2` ∈ (50, 100), параметр `3` = 30 — корневая группа `and` из трёх элементов: две вложенные группы `and` по двум compare для пар. 1 и 2, и один compare для пар. 3.

- **defaultBackground** (опционально) — фон по умолчанию для режима спасения: строка URL или id файла, по смыслу как `scenes[].background`.
- **parameters** — общие параметры, изменяемые по таймеру: `id`, `name`, `delta` (изменение за тик), `startValue`, опционально **severities** (уровни серьёзности: диапазон `min`–`max` и метка `severity`).
- **scenes** — сцены: `background`, `text`, массив **choices**.
- **choices** — каждый выбор: `text`, `parameterChanges` (какие параметры на какое значение менять), `nextSceneId` (id следующей сцены; при выборе А — сцена А, при выборе Б — сцена Б).

Типы в коде: `@/core/utils/types.ts` (`RescueTimerParameterVm`, `RescueSceneVm`, `RescueSceneChoiceVm`, `RescueChoiceParameterChangeVm`, `AppRescueItemCompletionVm`, `RescueCompletionConditionVm`).
