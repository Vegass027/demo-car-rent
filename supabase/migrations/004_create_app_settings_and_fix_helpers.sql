-- ============================================
-- MIGRATION: 004_create_app_settings_and_fix_helpers
-- Description: Создаёт таблицу app_settings, пересоздаёт helper-функции и user_login/verify_token
-- Note: Эта миграция уже применена к БД напрямую через MCP
-- ============================================

-- Создаём таблицу настроек приложения
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Вставляем JWT secret
INSERT INTO public.app_settings (key, value) 
VALUES ('jwt_secret', '17PwckS+BZ70tKDzi6TEwNlJJy/YBKB6SCR4Bg2EWRbG2wZhslpLSQpEhaYQF4Y1R0E7D4D/VwUnHTHizXBDAg==')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- RLS на таблицу настроек
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_all" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings_update_owner_only" ON public.app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth_user_id() AND role = 'owner'
    )
  );

-- Пересоздаём auth_user_id()
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claims JSONB;
  v_user_id TEXT;
BEGIN
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  IF v_claims IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_user_id := v_claims->>'user_id';
  IF v_user_id IS NULL THEN
    v_user_id := v_claims->>'sub';
  END IF;
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN v_user_id::uuid;
END;
$$;

-- Пересоздаём auth_role()
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claims JSONB;
  v_role TEXT;
BEGIN
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'anon';
  END;
  
  IF v_claims IS NULL THEN
    RETURN 'anon';
  END IF;
  
  v_role := v_claims->>'role';
  
  IF v_role IS NULL THEN
    RETURN 'anon';
  END IF;
  
  RETURN v_role;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_role() TO anon;

-- Пересоздаём user_login с чтением секрета из таблицы app_settings
CREATE OR REPLACE FUNCTION public.user_login(p_username text, p_password text)
RETURNS TABLE(id uuid, username text, full_name text, role text, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user RECORD;
  v_token TEXT;
  v_secret TEXT;
  v_payload JSONB;
BEGIN
  SELECT u.id, u.username, u.full_name, u.role
  INTO v_user
  FROM public.users u
  WHERE u.username = p_username
    AND u.password = crypt(p_password, u.password)
    AND u.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Читаем JWT secret из таблицы настроек
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'jwt_secret';
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'JWT secret not configured';
  END IF;

  -- Формируем payload JWT
  v_payload := jsonb_build_object(
    'sub', v_user.id::text,
    'user_id', v_user.id::text,
    'role', v_user.role,
    'username', v_user.username,
    'iss', 'car-rent-crm',
    'iat', EXTRACT(EPOCH FROM now())::bigint,
    'exp', EXTRACT(EPOCH FROM (now() + INTERVAL '7 days'))::bigint
  );

  -- Генерируем JWT токен
  v_token := extensions.sign(v_payload, v_secret, 'HS256');

  RETURN QUERY SELECT
    v_user.id,
    v_user.username,
    v_user.full_name,
    v_user.role,
    v_token;
END;
$$;

-- Пересоздаём verify_token
CREATE OR REPLACE FUNCTION public.verify_token(p_token text)
RETURNS TABLE(id uuid, username text, full_name text, role text, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_secret TEXT;
  v_payload JSONB;
  v_user_id UUID;
  v_user RECORD;
  v_new_token TEXT;
BEGIN
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'jwt_secret';
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'JWT secret not configured';
  END IF;

  BEGIN
    v_payload := extensions.verify(p_token, v_secret, 'HS256');
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF (v_payload->>'exp')::bigint < EXTRACT(EPOCH FROM now())::bigint THEN
    RETURN;
  END IF;

  v_user_id := (v_payload->>'user_id')::UUID;
  IF v_user_id IS NULL THEN
    v_user_id := (v_payload->>'sub')::UUID;
  END IF;
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT u.id, u.username, u.full_name, u.role
  INTO v_user
  FROM public.users u
  WHERE u.id = v_user_id AND u.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
    'sub', v_user.id::text,
    'user_id', v_user.id::text,
    'role', v_user.role,
    'username', v_user.username,
    'iss', 'car-rent-crm',
    'iat', EXTRACT(EPOCH FROM now())::bigint,
    'exp', EXTRACT(EPOCH FROM (now() + INTERVAL '7 days'))::bigint
  );

  v_new_token := extensions.sign(v_payload, v_secret, 'HS256');

  RETURN QUERY SELECT
    v_user.id,
    v_user.username,
    v_user.full_name,
    v_user.role,
    v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_login TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_token TO PUBLIC;
GRANT SELECT ON public.app_settings TO PUBLIC;
