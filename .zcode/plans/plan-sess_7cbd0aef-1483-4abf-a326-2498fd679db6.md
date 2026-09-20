# Email-уведомления: подтверждение регистрации, вход по коду, поддержка

## Факт: модуль отправки уже есть

`backend/app/utils/email.py` — `send_email(to, subject, body)` на stdlib smtplib (STARTTLS, no-op при пустом SMTP_HOST), креды reg.ru (help@trouble-dent.ru) в `backend/.env`. Поддержка уже шлёт копию письма (`_email_copy` в `app/api/v1/support.py`), но получает её заглушка ADMIN_EMAIL. Строить модуль не надо — проверяем доставку, настраиваем получателя, чиним два дефекта (блокировка event loop до 30с; 500 в forgot-password при сбое SMTP).

## Шаги

1. **Тест SMTP**: письмо с `cubersport123455@yandex.ru` через venv (прямая просьба из комментария в .env). При отказе reg.ru на 587/STARTTLS — ветка SMTP_SSL (465).
2. **email.py**: `send_email_safe` (try/except + log) + перевод forgot-password и `_email_copy` на BackgroundTasks (Starlette сам гоняет sync-таски в threadpool; без новых зависимостей).
3. **Миграция 017** (raw SQL стиль репо): `users.email_verified BOOLEAN DEFAULT false` + `UPDATE users SET email_verified = TRUE` (дедушки), таблица `login_codes` (code_hash sha256, expires_at, attempts, used_at) + индекс. Модель `LoginCode` — регистрация в `app/models/__init__.py`, `app/db/base.py`, `alembic/env.py`.
4. **HMAC email-токен** в `core/security.py`: `make_email_token` / `read_email_token` (uid:email:exp + подпись jwt_secret, b64url). Без таблицы — верификация идемпотентна. Конфиг: `email_verification_url` (default как password_reset_url), `email_verification_ttl_hours=48`; в локальном `.env` — localhost URL.
5. **Эндпоинты auth**: register без сессии → письмо со ссылкой (фон), ответ 201 `verification_email_sent`; login/json → 403 "Email not verified" до подтверждения; `POST /auth/verify-email {token}` → 204/400; `POST /auth/resend-verification {email}` → всегда 204, кулдаун 60с (in-memory dict + `ponytail:` коммент: потолок 1 воркер).
6. **Вход по коду** (код доказывает владение почтой → успех ставит `email_verified=True`): `POST /auth/login/code/request {email}` → всегда 204, issue 6-значного кода (TTL 10 мин, гасит прежние, sha256 в БД) + письмо; `POST /auth/login/code/verify {email, code, device_name?}` → max 5 попыток, `hmac.compare_digest`, успех → `_issue_session` → `SessionCreated`. Репо `login_code.py` по паттерну password_reset.
7. **Клиент (mobile-app)**: SDK-реген без сервера (`export_openapi.py` + `npm run generate-api`); `auth-api.ts`: register → void, + verifyEmail/resendVerification/requestLoginCode/loginWithCode; register.tsx → Alert «Проверьте почту» → login; новый `(auth)/verify-email.tsx` (auto-submit по ?token, клон reset-password); login.tsx — переключатель пароль/код из письма + кнопка «Отправить письмо повторно» на 403. Content-builder не трогаем (нет UI регистрации, админы дедушки).
8. **SUPPORT_EMAIL=help@trouble-dent.ru** в `backend/.env` (решено) и в `deploy/remote/bootstrap-env.sh`. Прод-VPS: вписать SMTP-креды в `/opt/urgent-care/backend/.env` при деплое (вручную, после кода).
9. **Достижения** — ничего сейчас; точка хука: `notify_unlocks()` в `app/services/achievement_notify.py`.
10. **Проверки**: `backend/tests/test_email_token.py` (HMAC roundtrip/истёкший/подделанный + формат кода); `alembic upgrade head`; e2e curl локально (register → 403 → verify → 200; код-вход; support-копия). Мобильный tsc с фильтром предсуществующих ошибок.