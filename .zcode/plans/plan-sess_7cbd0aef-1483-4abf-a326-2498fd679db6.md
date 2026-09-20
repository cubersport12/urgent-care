# Сертификаты: генерация из шаблона + выдача из конструктора

Шаблон: `backend/data/cert_origin.png` («СЕРТИФИКАТ», место под ФИО над линией под «ВЫДАН:», внизу колонки «Дата выдачи:», «№ сертификата:», слева рамка «Проверка сертификата / QR»). Позиции рисую как доли от реального размера (замерю PIL'ом на старте реализации).

## 1. Зависимости и ассеты
- `pyproject.toml`: + `pillow` и `qrcode` (QR обязателен, стандартная либа; PIL нужен для композиции) → `pip install` в venv, пины зафиксировать.
- **Шрифт с кириллицей**: бандлю DejaVuSans.ttf/DejaVuSans-Bold.ttf в `backend/data/fonts/` (достану из пакета matplotlib либо pip-пакета с шрифтами; лицензия разрешает). Код ищет: bundled → `/usr/share/fonts/truetype/dejavu` (докер) → `C:/Windows/Fonts/arial.ttf` (локальный фолбэк).
- **Dockerfile**: добавить `COPY data ./data` (builder+runtime) — иначе в контейнере нет шаблона и шрифтов; **deploy.sh**: + `backend/data` в scp. (Изменения вношу, не деплою.)

## 2. БД (миграция 019, raw-SQL стиль)
- `CREATE SEQUENCE IF NOT EXISTS certificates_number_seq`;
- таблица `certificates`: `id UUID PK`, `number INTEGER NOT NULL UNIQUE DEFAULT nextval(...)`, `user_id FK users ON DELETE CASCADE` + индекс, `full_name VARCHAR(200)` (снимок напечатанного имени), `file_path VARCHAR(512)` (ключ S3), `issued_at TIMESTAMPTZ DEFAULT now()`, `created_at`.
- Модель `app/models/certificate.py` (+ регистрация в `models/__init__`, `db/base.py`, `alembic/env.py`).

## 3. Генерация (`app/services/certificates.py`)
- Вход: user, displayName?. Печатное имя = displayName → `user.full_name` → email (у многих full_name пустой).
- Номер: из секвенса; на канвасе формат `TD-<год>-<NNNNNN>`.
- PIL: ФИО — тёмно-синим, центр, над линией под «ВЫДАН:»; дата `ДД.ММ.ГГГГ` и номер — по центру своих колонок под подписями; QR — кодирует публичный URL проверки `{API_PUBLIC_BASE_URL}/api/v1/certificates/{number}`, вставляется в готовую рамку слева.
- Результат: PNG → S3 `public/certificates/{number:06d}.png` (`upload_bytes`, как media) → строка в БД.

## 4. Роутер `app/api/v1/certificates.py` (+ регистрация в `api/v1/__init__`)
- `POST /certificates` (admin) `{userId, displayName?}` → `CertificateOut{number, userId, fullName, filePath, issuedAt}`.
- `GET /certificates` (admin) — список выданных.
- `GET /certificates/{number}` — **публичный** (QR-проверка): `{number, fullName, issuedAt, valid: true}`, 404 если нет. Просмотр самого PNG — существующий `GET /media/{key}` (он авторизован, конструктору хватает).
- Схемы `app/schemas/certificates.py` (CamelModel).

## 5. Конструктор
- Кнопка на тулбаре рядом с «Нормативные документы» (`folders-explorer`, mattooltip «Выдача сертификатов») → новый `certificates-editor` по образцу legal-docs: выпадайка пользователей (`usersListUsers` — админский `GET /users` уже есть), поле «Имя на сертификате» (автоподстановка из выбранного пользователя, пусто у многих), кнопка «Выдать сертификат» → снек с № и кнопкой «Открыть» (PNG через `/media/...` в новой вкладке). Реген SDK конструктора.

## 6. Проверки
- **ONE runnable check**: `scripts/check_certificates.py` — in-process выдача для probe-пользователя: номер из секвенса, строка в БД, PNG-байты не пустые и валидные (signature PNG), повторная выдача даёт следующий номер. S3 — реальный, если MinIO поднят; иначе в скрипте подменяю upload_bytes захватом байтов (потолок помечу).
- `alembic upgrade head` (018→019), весь pytest.
- Конструктор: `ng build`; мобильный не трогаем (фича только в конструкторе, т.к. «на данном этапе»).

Деплой — только по явной просьбе (для прода: backend + data/ + миграция 019).