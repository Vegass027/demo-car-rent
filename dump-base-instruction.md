## Анализ инструкции по переносу БД Supabase для проекта car-rent

### ✅ Что правильно в инструкции

1. **Подход с `supabase db dump`** — верный выбор для вашего проекта
2. **Direct connection (порт 5432)** — правильная рекомендация, не pooler
3. **Логин через `supabase login`** — актуальный метод

### ⚠️ Что уточнить для вашего проекта

**Структура вашей БД (из [`database/base-table.sql`](database/base-table.sql:1)):**
- 6 таблиц: `users`, `cars`, `expense_categories`, `car_records`, `salary_withdrawals`, `service_events`
- 2 VIEW: `monthly_stats`, `cash_flow`
- 3 триггера для `updated_at`
- 2 функции для бронирований из [`database/booking-system.sql`](database/booking-system.sql:1)

**Нюансы при переносе:**

1. **INSERT в `expense_categories`** — в схеме есть начальные данные (строки 77-84). При импорте возможен конфликт дублирования. Решение: использовать `ON CONFLICT DO NOTHING` или импортировать схему без данных, потом данные отдельно.

2. **Пароли пользователей** — хранятся как хэши bcrypt (поле `password` в `users`). Перенесутся корректно.

3. **RLS политики** — если включены, проверьте после импорта через Advisors в dashboard.

### 🚀 Команды для вашего проекта

```bash
# 1. Установка CLI (macOS)
brew install supabase/tap/supabase

# 2. Логин
supabase login

# 3. В папке проекта
cd /Users/dmitriy/Downloads/car-rent
supabase init  # создаст supabase/config.toml

# 4. Подключение к старому проекту
supabase link --project-ref ВАШ_OLD_REF

# 5. Дамп (схема + данные public схемы)
supabase db dump --linked --file dump.sql

# 6. Импорт в новый проект
psql "postgresql://postgres:[ПАРОЛЬ]@db.[NEW_REF].supabase.co:5432/postgres" -f dump.sql

# 7. Обновить .env
# VITE_SUPABASE_URL=https://NEW_REF.supabase.co
# VITE_SUPABASE_ANON_KEY=новый_ключ
```

### 📊 Альтернатива для малого объёма данных

Если данных мало — выполните SQL-файлы из `database/` через SQL Editor в dashboard нового проекта:
1. [`database/base-table.sql`](database/base-table.sql:1)
2. [`database/booking-system.sql`](database/booking-system.sql:1)
3. [`database/photo-upload.sql`](database/photo-upload.sql:1)

Это перенесёт схему. Данные можно экспортировать через CSV в dashboard.

### ⚡ Проверка после импорта

```sql
-- Проверить количество записей
SELECT 'cars' as tbl, COUNT(*) FROM cars
UNION ALL SELECT 'records', COUNT(*) FROM car_records
UNION ALL SELECT 'users', COUNT(*) FROM users;

-- Проверить VIEW
SELECT * FROM monthly_stats LIMIT 5;
SELECT * FROM cash_flow;
```

Инструкция корректная, подходит для вашего проекта.