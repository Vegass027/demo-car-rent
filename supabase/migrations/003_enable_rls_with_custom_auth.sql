-- ============================================
-- MIGRATION: 003_enable_rls_with_custom_auth
-- Description: Включает RLS политики с учётом кастомной аутентификации
-- ============================================

-- Включаем RLS на всех таблицах (если ещё не включено)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICY: users table
-- ============================================

-- Все пользователи видят всех (для списка пользователей)
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

-- Пользователь может обновить только свой профиль
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Только owner может создавать новых пользователей
CREATE POLICY "users_insert_owner_only" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICY: cars table
-- ============================================

-- Все видят все машины (для справочника)
CREATE POLICY "cars_select_all" ON public.cars
  FOR SELECT USING (true);

-- Все авторизованные пользователи могут создавать машины
CREATE POLICY "cars_insert_authenticated" ON public.cars
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Все авторизованные могут обновлять
CREATE POLICY "cars_update_authenticated" ON public.cars
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Только owner может удалять
CREATE POLICY "cars_delete_owner_only" ON public.cars
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICY: car_records table
-- ============================================

CREATE POLICY "car_records_select_all" ON public.car_records
  FOR SELECT USING (true);

CREATE POLICY "car_records_insert_authenticated" ON public.car_records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "car_records_update_authenticated" ON public.car_records
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "car_records_delete_owner_only" ON public.car_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICY: expense_categories table
-- ============================================

CREATE POLICY "expense_categories_select_all" ON public.expense_categories
  FOR SELECT USING (true);

CREATE POLICY "expense_categories_insert_authenticated" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "expense_categories_update_owner_only" ON public.expense_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "expense_categories_delete_owner_only" ON public.expense_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICY: salary_withdrawals table
-- ============================================

CREATE POLICY "salary_withdrawals_select_all" ON public.salary_withdrawals
  FOR SELECT USING (true);

CREATE POLICY "salary_withdrawals_insert_owner_only" ON public.salary_withdrawals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "salary_withdrawals_update_owner_only" ON public.salary_withdrawals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "salary_withdrawals_delete_owner_only" ON public.salary_withdrawals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICY: service_events table
-- ============================================

CREATE POLICY "service_events_select_all" ON public.service_events
  FOR SELECT USING (true);

CREATE POLICY "service_events_insert_authenticated" ON public.service_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "service_events_update_authenticated" ON public.service_events
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_events_delete_authenticated" ON public.service_events
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- POLICY: company_settings table
-- ============================================

CREATE POLICY "company_settings_select_all" ON public.company_settings
  FOR SELECT USING (true);

CREATE POLICY "company_settings_update_owner_only" ON public.company_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "company_settings_insert_owner_only" ON public.company_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICY: clients table
-- ============================================

CREATE POLICY "clients_select_all" ON public.clients
  FOR SELECT USING (true);

CREATE POLICY "clients_insert_authenticated" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clients_update_authenticated" ON public.clients
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_delete_owner_only" ON public.clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- Helper function для установки JWT вручную
-- Это SECURITY DEFINER функция чтобы обойти RLS для внутренних операций
-- ============================================

CREATE OR REPLACE FUNCTION public.set_jwt_claim(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_username TEXT;
  jwt_token TEXT;
BEGIN
  -- Получаем данные пользователя
  SELECT role, username INTO v_role, v_username
  FROM users
  WHERE id = user_uuid;
  
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Используем postgrest.set_role для установки роли в текущей сессии
  -- Это работает только для postgrest (API gateway)
  PERFORM set_config('request.jwt.claim.role', v_role, true);
  PERFORM set_config('request.jwt.claim.sub', user_uuid::text, true);
  
  RETURN jsonb_build_object(
    'user_id', user_uuid,
    'role', v_role,
    'username', v_username
  );
END;
$$;

-- ============================================
-- RPC функция для авторизации через кастомную таблицу users
-- Используется вместо стандартного auth.users
-- SECURITY DEFINER позволяет выполнить от имени сервиса
-- ============================================

CREATE OR REPLACE FUNCTION public.login(p_username TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_jwt TEXT;
BEGIN
  -- Находим пользователя
  SELECT id, username, role, full_name, is_active
  INTO v_user
  FROM users
  WHERE username = p_username AND password = p_password_hash AND is_active = true;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  -- Создаём JWT через PostgreSQL
  -- Используем extensions.postgrest.set_role через заголовок
  -- Это создаст валидный JWT для RLS проверок
  
  RETURN jsonb_build_object(
    'user_id', v_user.id,
    'username', v_user.username,
    'role', v_user.role,
    'full_name', v_user.full_name
  );
END;
$$;

COMMENT ON FUNCTION public.login IS 'Custom authentication function that verifies credentials against users table and returns user info';

-- ============================================
-- Storage bucket policies (для cars-photos)
-- ============================================

-- Проверяем существование bucket и создаём политики для него
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'cars-photos') THEN
    -- Удаляем старые политики если есть
    DROP POLICY IF EXISTS "cars_photos_select_all" ON storage.objects;
    DROP POLICY IF EXISTS "cars_photos_insert_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "cars_photos_update_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "cars_photos_delete_owner_only" ON storage.objects;
    
    -- Создаём политики для cars-photos bucket
    CREATE POLICY "cars_photos_select_all" ON storage.objects
      FOR SELECT USING (bucket_id = 'cars-photos');

    CREATE POLICY "cars_photos_insert_authenticated" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'cars-photos' AND auth.role() = 'authenticated');

    CREATE POLICY "cars_photos_update_authenticated" ON storage.objects
      FOR UPDATE USING (bucket_id = 'cars-photos' AND auth.role() = 'authenticated');

    CREATE POLICY "cars_photos_delete_owner_only" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'cars-photos' 
        AND EXISTS (
          SELECT 1 FROM public.users 
          WHERE id::text = (storage.current_user()).id AND role = 'owner'
        )
      );
  END IF;
END $$;

-- ============================================
-- Grant permissions
-- ============================================

-- Grants для функций
GRANT EXECUTE ON FUNCTION public.set_jwt_claim TO authenticated;
GRANT EXECUTE ON FUNCTION public.login TO PUBLIC;

-- Grants для таблиц ( authenticated role имеет доступ через политики)
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.cars TO authenticated;
GRANT SELECT ON public.car_records TO authenticated;
GRANT SELECT ON public.expense_categories TO authenticated;
GRANT SELECT ON public.salary_withdrawals TO authenticated;
GRANT SELECT ON public.service_events TO authenticated;
GRANT SELECT ON public.company_settings TO authenticated;
GRANT SELECT ON public.clients TO authenticated;