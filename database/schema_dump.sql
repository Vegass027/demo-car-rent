--
-- PostgreSQL database dump
--

\restrict KOJfkD1KwbgRAVmkLGRG7xPCHedkH35E12ipau9sdsmV2tTKWyxSTKbqz5MubOl

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: add_to_preparation_cost(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_to_preparation_cost(p_car_id uuid, p_amount numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE cars 
  SET preparation_cost = COALESCE(preparation_cost, 0) + p_amount
  WHERE id = p_car_id;
END;
$$;


--
-- Name: auth_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_role() RETURNS text
    LANGUAGE plpgsql STABLE
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
  
  -- Сначала проверяем app_role (кастомная роль: owner/manager)
  v_role := v_claims->>'app_role';
  
  -- Fallback на role для обратной совместимости
  IF v_role IS NULL THEN
    v_role := v_claims->>'role';
  END IF;
  
  IF v_role IS NULL THEN
    RETURN 'anon';
  END IF;
  
  RETURN v_role;
END;
$$;


--
-- Name: auth_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_user_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
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


--
-- Name: check_booking_overlap(uuid, date, date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_booking_overlap(p_car_id uuid, p_start_date date, p_end_date date, p_exclude_record_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Возвращаем true если есть пересечение
  RETURN EXISTS (
    SELECT 1 FROM car_records
    WHERE car_id = p_car_id
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
      AND (p_exclude_record_id IS NULL OR id != p_exclude_record_id)
      AND start_date <= p_end_date
      AND end_date >= p_start_date
  );
END;
$$;


--
-- Name: find_duplicate_client(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_duplicate_client(p_last_name text, p_first_name text, p_phone text DEFAULT NULL::text, p_passport_series text DEFAULT NULL::text, p_passport_number text DEFAULT NULL::text) RETURNS TABLE(id uuid, full_name text, phone text, similarity_score real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.full_name,
        c.phone,
        CASE 
            WHEN c.last_name ILIKE p_last_name 
                 AND c.first_name ILIKE p_first_name
                 AND c.phone = p_phone 
                 AND p_phone IS NOT NULL 
                 AND p_phone != '' 
            THEN 1.0
            WHEN c.last_name ILIKE p_last_name 
                 AND c.first_name ILIKE p_first_NAME
            THEN 0.9
            WHEN c.passport_series = p_passport_series 
                 AND c.passport_number = p_passport_number
                 AND p_passport_series IS NOT NULL 
                 AND p_passport_number IS NOT NULL
            THEN 1.0
            ELSE 0.7
        END AS similarity_score
    FROM public.clients c
    WHERE 
        (c.last_name ILIKE p_last_name AND c.first_name ILIKE p_first_name)
        OR (p_phone IS NOT NULL AND p_phone != '' AND c.phone = p_phone)
        OR (p_passport_series IS NOT NULL AND p_passport_number IS NOT NULL 
            AND c.passport_series = p_passport_series 
            AND c.passport_number = p_passport_number)
    ORDER BY similarity_score DESC
    LIMIT 5;
END;
$$;


--
-- Name: get_car_booked_dates(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_car_booked_dates(p_car_id uuid, p_start_date date, p_end_date date) RETURNS TABLE(date date, record_id uuid, renter_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d::DATE AS date,
    cr.id AS record_id,
    cr.renter_name
  FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d
  JOIN car_records cr ON 
    cr.car_id = p_car_id AND
    cr.start_date IS NOT NULL AND
    cr.end_date IS NOT NULL AND
    d::DATE >= cr.start_date AND
    d::DATE <= cr.end_date;
END;
$$;


--
-- Name: search_clients(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_clients(search_query text) RETURNS TABLE(id uuid, last_name text, first_name text, middle_name text, full_name text, phone text, birth_date date, passport_series text, passport_number text, passport_issued_by text, passport_issue_date date, registration_address text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, similarity_score real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.last_name,
        c.first_name,
        c.middle_name,
        c.full_name,
        c.phone,
        c.birth_date,
        c.passport_series,
        c.passport_number,
        c.passport_issued_by,
        c.passport_issue_date,
        c.registration_address,
        c.notes,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN c.last_name ILIKE search_query || '%' THEN 1.0
            WHEN c.first_name ILIKE search_query || '%' THEN 0.9
            WHEN c.middle_name ILIKE search_query || '%' THEN 0.8
            WHEN c.full_name ILIKE '%' || search_query || '%' THEN 0.7
            WHEN c.phone ILIKE '%' || search_query || '%' THEN 0.6
            ELSE 0.5
        END AS similarity_score
    FROM public.clients c
    WHERE 
        c.last_name ILIKE '%' || search_query || '%'
        OR c.first_name ILIKE '%' || search_query || '%'
        OR c.middle_name ILIKE '%' || search_query || '%'
        OR c.full_name ILIKE '%' || search_query || '%'
        OR c.phone ILIKE '%' || search_query || '%'
    ORDER BY similarity_score DESC, c.last_name ASC
    LIMIT 20;
END;
$$;


--
-- Name: set_record_date_from_range(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_record_date_from_range() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Если указан диапазон, record_date = start_date
  IF NEW.start_date IS NOT NULL THEN
    NEW.record_date := NEW.start_date;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_login(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_login(p_username text, p_password text) RETURNS TABLE(id uuid, username text, full_name text, role text, token text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'extensions, pg_catalog'
    AS $$
DECLARE
  v_user RECORD;
  v_token TEXT;
  v_secret TEXT;
  v_payload JSON;
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

  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'jwt_secret';
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'JWT secret not configured';
  END IF;

  v_payload := jsonb_build_object(
    'sub', v_user.id::text,
    'user_id', v_user.id::text,
    'role', v_user.role,
    'username', v_user.username,
    'iss', 'car-rent-crm',
    'iat', EXTRACT(EPOCH FROM now())::bigint,
    'exp', EXTRACT(EPOCH FROM (now() + INTERVAL '7 days'))::bigint
  )::json;

  v_token := sign(v_payload, v_secret, 'HS256');

  RETURN QUERY SELECT
    v_user.id,
    v_user.username,
    v_user.full_name,
    v_user.role,
    v_token;
END;
$$;


--
-- Name: verify_token(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_token(p_token text) RETURNS TABLE(id uuid, username text, full_name text, role text, token text)
    LANGUAGE plpgsql SECURITY DEFINER
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: car_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    record_date date NOT NULL,
    rental_amount numeric(12,2) DEFAULT 0 NOT NULL,
    service_cost numeric(12,2) DEFAULT 0 NOT NULL,
    other_cost numeric(12,2) DEFAULT 0 NOT NULL,
    expense_category_id uuid,
    renter_name text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    start_date date,
    end_date date,
    renter_phone text,
    deposit integer DEFAULT 0,
    client_id uuid,
    record_type text DEFAULT 'normal'::text NOT NULL,
    buyout_data jsonb
);


--
-- Name: COLUMN car_records.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.car_records.start_date IS 'Дата начала аренды (для бронирований)';


--
-- Name: COLUMN car_records.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.car_records.end_date IS 'Дата окончания аренды (для бронирований)';


--
-- Name: COLUMN car_records.renter_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.car_records.renter_phone IS 'Телефон арендатора';


--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    license_plate text NOT NULL,
    brand text,
    model text,
    year integer,
    vin text,
    purchase_date date,
    purchase_price numeric(12,2) DEFAULT 0,
    preparation_cost numeric(12,2) DEFAULT 0,
    status text DEFAULT 'free'::text NOT NULL,
    color_tag text DEFAULT '#3B82F6'::text,
    photo_url text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    daily_price integer DEFAULT 0,
    color text,
    CONSTRAINT cars_status_check CHECK ((status = ANY (ARRAY['rented'::text, 'free'::text, 'service'::text, 'inactive'::text, 'buyout'::text, 'bought'::text])))
);


--
-- Name: COLUMN cars.daily_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.daily_price IS 'Цена аренды за сутки (в рублях)';


--
-- Name: COLUMN cars.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.color IS 'Цвет автомобиля (для договора)';


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon text,
    color text DEFAULT '#6B7280'::text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: salary_withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric(12,2) NOT NULL,
    withdrawal_date date DEFAULT CURRENT_DATE NOT NULL,
    recipient_name text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    month date,
    percent integer DEFAULT 50,
    gross_income numeric(12,2) DEFAULT 0,
    net_profit numeric(12,2) DEFAULT 0,
    car_id uuid,
    car_name text,
    CONSTRAINT salary_withdrawals_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: TABLE salary_withdrawals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.salary_withdrawals IS 'Выплаты зарплаты/дивидендов по месяцам';


--
-- Name: COLUMN salary_withdrawals.month; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salary_withdrawals.month IS 'Месяц, за который производится выплата (первый день месяца)';


--
-- Name: COLUMN salary_withdrawals.percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salary_withdrawals.percent IS 'Процент от чистой прибыли (1-100)';


--
-- Name: COLUMN salary_withdrawals.gross_income; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salary_withdrawals.gross_income IS 'Валовый доход за месяц (сумма аренды)';


--
-- Name: COLUMN salary_withdrawals.net_profit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salary_withdrawals.net_profit IS 'Чистая прибыль за месяц (доход - расходы, без страховки и шин)';


--
-- Name: COLUMN salary_withdrawals.car_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salary_withdrawals.car_id IS 'ID машины для привязки выплаты. NULL = выплата по всем машинам.';


--
-- Name: cash_flow; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cash_flow AS
 SELECT (COALESCE(sum(r.rental_amount) FILTER (WHERE (r.record_type <> ALL (ARRAY['buyout'::text, 'buyout_payment'::text]))), (0)::numeric) + COALESCE(sum(
        CASE
            WHEN ((r.record_type = 'buyout_payment'::text) AND (r.buyout_data IS NOT NULL)) THEN ((r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text))::numeric) / ((100)::numeric + ((r.buyout_data ->> 'profitPercent'::text))::numeric))
            WHEN (r.record_type = 'buyout_payment'::text) THEN (0)::numeric
            ELSE (0)::numeric
        END), (0)::numeric)) AS total_income,
    (COALESCE(sum(r.service_cost) FILTER (WHERE (COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text)), (0)::numeric) + COALESCE(sum(r.other_cost) FILTER (WHERE ((COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text) AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])))), (0)::numeric)) AS total_expense,
    COALESCE(( SELECT sum(salary_withdrawals.amount) AS sum
           FROM public.salary_withdrawals), (0)::numeric) AS total_salary,
    ((((COALESCE(sum(r.rental_amount) FILTER (WHERE (r.record_type <> ALL (ARRAY['buyout'::text, 'buyout_payment'::text]))), (0)::numeric) + COALESCE(sum(
        CASE
            WHEN ((r.record_type = 'buyout_payment'::text) AND (r.buyout_data IS NOT NULL)) THEN ((r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text))::numeric) / ((100)::numeric + ((r.buyout_data ->> 'profitPercent'::text))::numeric))
            WHEN (r.record_type = 'buyout_payment'::text) THEN (0)::numeric
            ELSE (0)::numeric
        END), (0)::numeric)) - COALESCE(sum(r.service_cost) FILTER (WHERE (COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text)), (0)::numeric)) - COALESCE(sum(r.other_cost) FILTER (WHERE ((COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text) AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])))), (0)::numeric)) - COALESCE(( SELECT sum(salary_withdrawals.amount) AS sum
           FROM public.salary_withdrawals), (0)::numeric)) AS balance
   FROM (public.car_records r
     LEFT JOIN public.expense_categories ec ON ((ec.id = r.expense_category_id)));


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    last_name text NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    full_name text GENERATED ALWAYS AS (TRIM(BOTH ' '::text FROM ((((COALESCE(last_name, ''::text) || ' '::text) || COALESCE(first_name, ''::text)) || ' '::text) || COALESCE(middle_name, ''::text)))) STORED,
    phone text,
    birth_date date,
    passport_series text,
    passport_number text,
    passport_issued_by text,
    passport_issue_date date,
    registration_address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    driver_license_series text,
    driver_license_number text
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text DEFAULT 'ООО «Крым Кар Рентал»'::text,
    legal_address text,
    postal_address text,
    inn text,
    kpp text,
    bank_name text,
    checking_account text,
    correspondent_account text,
    bik text,
    representative_name text DEFAULT 'Драгунов Олег Валерьевич'::text,
    representative_position text DEFAULT 'Генеральный директор'::text,
    representative_basis text DEFAULT 'Устава'::text,
    owner_full_name text,
    owner_passport_series text,
    owner_passport_number text,
    owner_passport_issued_by text,
    owner_passport_issue_date text,
    owner_registration_address text,
    owner_postal_address text,
    owner_phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_birth_date date
);


--
-- Name: TABLE company_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.company_settings IS 'Настройки компании для генерации договоров аренды';


--
-- Name: COLUMN company_settings.company_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.company_name IS 'Название компании (ООО)';


--
-- Name: COLUMN company_settings.legal_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.legal_address IS 'Юридический адрес';


--
-- Name: COLUMN company_settings.postal_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.postal_address IS 'Почтовый адрес';


--
-- Name: COLUMN company_settings.inn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.inn IS 'ИНН';


--
-- Name: COLUMN company_settings.kpp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.kpp IS 'КПП';


--
-- Name: COLUMN company_settings.bank_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.bank_name IS 'Название банка';


--
-- Name: COLUMN company_settings.checking_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.checking_account IS 'Расчётный счёт';


--
-- Name: COLUMN company_settings.correspondent_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.correspondent_account IS 'Корреспондентский счёт';


--
-- Name: COLUMN company_settings.bik; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.bik IS 'БИК';


--
-- Name: COLUMN company_settings.representative_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.representative_name IS 'ФИО представителя';


--
-- Name: COLUMN company_settings.representative_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.representative_position IS 'Должность представителя';


--
-- Name: COLUMN company_settings.representative_basis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.representative_basis IS 'На основании (Устава, доверенности и т.д.)';


--
-- Name: COLUMN company_settings.owner_full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_full_name IS 'ФИО собственника (физлицо)';


--
-- Name: COLUMN company_settings.owner_passport_series; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_passport_series IS 'Серия паспорта собственника';


--
-- Name: COLUMN company_settings.owner_passport_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_passport_number IS 'Номер паспорта собственника';


--
-- Name: COLUMN company_settings.owner_passport_issued_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_passport_issued_by IS 'Кем выдан паспорт собственника';


--
-- Name: COLUMN company_settings.owner_passport_issue_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_passport_issue_date IS 'Дата выдачи паспорта собственника';


--
-- Name: COLUMN company_settings.owner_registration_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_registration_address IS 'Адрес регистрации собственника';


--
-- Name: COLUMN company_settings.owner_postal_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_postal_address IS 'Почтовый адрес собственника';


--
-- Name: COLUMN company_settings.owner_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_settings.owner_phone IS 'Телефон собственника';


--
-- Name: monthly_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.monthly_stats AS
 WITH recoup_tracking AS (
         SELECT r_1.car_id,
            date_trunc('month'::text, (r_1.record_date)::timestamp without time zone) AS month,
            sum(
                CASE
                    WHEN ((r_1.record_type = 'buyout_payment'::text) AND (r_1.buyout_data IS NOT NULL)) THEN r_1.rental_amount
                    WHEN (r_1.record_type = ANY (ARRAY['normal'::text, 'booking'::text])) THEN r_1.rental_amount
                    ELSE (0)::numeric
                END) AS recoup_amount
           FROM public.car_records r_1
          WHERE (r_1.rental_amount > (0)::numeric)
          GROUP BY r_1.car_id, (date_trunc('month'::text, (r_1.record_date)::timestamp without time zone))
        )
 SELECT r.car_id,
    c.name AS car_name,
    c.color_tag,
    date_trunc('month'::text, (r.record_date)::timestamp with time zone) AS month,
    count(*) FILTER (WHERE (r.record_type <> 'buyout'::text)) AS records_count,
    count(*) FILTER (WHERE ((r.rental_amount > (0)::numeric) AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])))) AS rented_days,
    count(*) FILTER (WHERE ((r.rental_amount = (0)::numeric) AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])))) AS idle_days,
    (COALESCE(sum(r.rental_amount) FILTER (WHERE (r.record_type <> ALL (ARRAY['buyout'::text, 'buyout_payment'::text]))), (0)::numeric) + COALESCE(sum(
        CASE
            WHEN ((r.record_type = 'buyout_payment'::text) AND (r.buyout_data IS NOT NULL)) THEN ((r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text))::numeric) / ((100)::numeric + ((r.buyout_data ->> 'profitPercent'::text))::numeric))
            ELSE (0)::numeric
        END), (0)::numeric)) AS total_rental,
    COALESCE(sum(r.service_cost) FILTER (WHERE ((r.notes IS NULL) OR (r.notes !~~ 'Первичная подготовка%'::text))), (0)::numeric) AS total_service,
    COALESCE(sum(r.other_cost) FILTER (WHERE (((r.notes IS NULL) OR (r.notes !~~ 'Первичная подготовка%'::text)) AND ((ec.name IS NULL) OR (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text]))))), (0)::numeric) AS total_other,
    (COALESCE(sum(r.service_cost) FILTER (WHERE ((r.notes IS NULL) OR (r.notes !~~ 'Первичная подготовка%'::text))), (0)::numeric) + COALESCE(sum(r.other_cost) FILTER (WHERE (((r.notes IS NULL) OR (r.notes !~~ 'Первичная подготовка%'::text)) AND ((ec.name IS NULL) OR (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text]))))), (0)::numeric)) AS total_expense,
    (((COALESCE(sum(r.rental_amount) FILTER (WHERE (r.record_type <> ALL (ARRAY['buyout'::text, 'buyout_payment'::text]))), (0)::numeric) + COALESCE(sum(
        CASE
            WHEN ((r.record_type = 'buyout_payment'::text) AND (r.buyout_data IS NOT NULL)) THEN ((r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text))::numeric) / ((100)::numeric + ((r.buyout_data ->> 'profitPercent'::text))::numeric))
            ELSE (0)::numeric
        END), (0)::numeric)) - COALESCE(sum(r.service_cost) FILTER (WHERE ((r.notes IS NULL) OR (r.notes !~~ 'Первичная подготовка%'::text))), (0)::numeric)) - COALESCE(sum(r.other_cost) FILTER (WHERE (((r.notes IS NULL) OR (r.notes !~~ 'Первичная подготовка%'::text)) AND ((ec.name IS NULL) OR (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text]))))), (0)::numeric)) AS total_profit,
    round((((count(*) FILTER (WHERE ((r.rental_amount > (0)::numeric) AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])))))::numeric / (NULLIF(count(*) FILTER (WHERE (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text]))), 0))::numeric) * (100)::numeric), 1) AS occupancy_percent,
    COALESCE(rt.recoup_amount, (0)::numeric) AS recoup_amount
   FROM (((public.car_records r
     JOIN public.cars c ON ((c.id = r.car_id)))
     LEFT JOIN public.expense_categories ec ON ((ec.id = r.expense_category_id)))
     LEFT JOIN recoup_tracking rt ON (((rt.car_id = r.car_id) AND (date_trunc('month'::text, rt.month) = date_trunc('month'::text, (r.record_date)::timestamp without time zone)))))
  GROUP BY r.car_id, c.name, c.color_tag, (date_trunc('month'::text, (r.record_date)::timestamp with time zone)), rt.recoup_amount;


--
-- Name: service_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    category_id uuid,
    service_type text NOT NULL,
    planned_date date NOT NULL,
    completed_date date,
    cost numeric(12,2) DEFAULT 0,
    linked_record_id uuid,
    status text DEFAULT 'planned'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_events_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'completed'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text,
    role text DEFAULT 'manager'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text])))
);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: car_records car_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_records
    ADD CONSTRAINT car_records_pkey PRIMARY KEY (id);


--
-- Name: cars cars_license_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_license_plate_key UNIQUE (license_plate);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: salary_withdrawals salary_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_withdrawals
    ADD CONSTRAINT salary_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: service_events service_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_events
    ADD CONSTRAINT service_events_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_car_records_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_records_client_id ON public.car_records USING btree (client_id);


--
-- Name: idx_car_records_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_records_date_range ON public.car_records USING btree (car_id, start_date, end_date) WHERE ((start_date IS NOT NULL) AND (end_date IS NOT NULL));


--
-- Name: idx_car_records_record_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_records_record_type ON public.car_records USING btree (record_type);


--
-- Name: idx_cars_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_is_active ON public.cars USING btree (is_active);


--
-- Name: idx_cars_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_status ON public.cars USING btree (status);


--
-- Name: idx_clients_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_first_name ON public.clients USING btree (first_name);


--
-- Name: idx_clients_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_full_name ON public.clients USING btree (full_name);


--
-- Name: idx_clients_last_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_last_name ON public.clients USING btree (last_name);


--
-- Name: idx_clients_middle_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_middle_name ON public.clients USING btree (middle_name);


--
-- Name: idx_clients_name_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_name_phone ON public.clients USING btree (last_name, first_name, phone);


--
-- Name: idx_clients_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_phone ON public.clients USING btree (phone);


--
-- Name: idx_records_car_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_records_car_date ON public.car_records USING btree (car_id, record_date DESC);


--
-- Name: idx_records_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_records_car_id ON public.car_records USING btree (car_id);


--
-- Name: idx_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_records_date ON public.car_records USING btree (record_date DESC);


--
-- Name: idx_records_year_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_records_year_month ON public.car_records USING btree (EXTRACT(year FROM record_date), EXTRACT(month FROM record_date));


--
-- Name: idx_salary_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_date ON public.salary_withdrawals USING btree (withdrawal_date DESC);


--
-- Name: idx_salary_withdrawals_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_withdrawals_car_id ON public.salary_withdrawals USING btree (car_id) WHERE (car_id IS NOT NULL);


--
-- Name: idx_salary_withdrawals_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_withdrawals_month ON public.salary_withdrawals USING btree (month DESC);


--
-- Name: idx_service_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_car_id ON public.service_events USING btree (car_id);


--
-- Name: idx_service_planned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_planned ON public.service_events USING btree (planned_date);


--
-- Name: idx_service_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_status ON public.service_events USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: cars trg_cars_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cars_updated_at BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: clients trg_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: car_records trg_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_records_updated_at BEFORE UPDATE ON public.car_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: service_events trg_service_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_service_updated_at BEFORE UPDATE ON public.service_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: car_records trg_set_record_date_from_range; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_record_date_from_range BEFORE INSERT OR UPDATE ON public.car_records FOR EACH ROW EXECUTE FUNCTION public.set_record_date_from_range();


--
-- Name: company_settings update_company_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: car_records car_records_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_records
    ADD CONSTRAINT car_records_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: car_records car_records_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_records
    ADD CONSTRAINT car_records_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: car_records car_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_records
    ADD CONSTRAINT car_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: car_records car_records_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_records
    ADD CONSTRAINT car_records_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES public.expense_categories(id);


--
-- Name: salary_withdrawals salary_withdrawals_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_withdrawals
    ADD CONSTRAINT salary_withdrawals_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE SET NULL;


--
-- Name: salary_withdrawals salary_withdrawals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_withdrawals
    ADD CONSTRAINT salary_withdrawals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: service_events service_events_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_events
    ADD CONSTRAINT service_events_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: service_events service_events_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_events
    ADD CONSTRAINT service_events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: service_events service_events_linked_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_events
    ADD CONSTRAINT service_events_linked_record_id_fkey FOREIGN KEY (linked_record_id) REFERENCES public.car_records(id);


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_select_all ON public.app_settings FOR SELECT USING (true);


--
-- Name: app_settings app_settings_update_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_update_owner_only ON public.app_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = public.auth_user_id()) AND (users.role = 'owner'::text)))));


--
-- Name: car_records authenticated users can delete car_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can delete car_records" ON public.car_records FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: cars authenticated users can delete cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can delete cars" ON public.cars FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: car_records authenticated users can insert car_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can insert car_records" ON public.car_records FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: cars authenticated users can insert cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can insert cars" ON public.cars FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: car_records authenticated users can read car_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can read car_records" ON public.car_records FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cars authenticated users can read cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can read cars" ON public.cars FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: car_records authenticated users can update car_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can update car_records" ON public.car_records FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: cars authenticated users can update cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated users can update cars" ON public.cars FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: car_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.car_records ENABLE ROW LEVEL SECURITY;

--
-- Name: car_records car_records_delete_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_records_delete_owner_only ON public.car_records FOR DELETE USING ((public.auth_role() = 'owner'::text));


--
-- Name: car_records car_records_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_records_insert_authenticated ON public.car_records FOR INSERT WITH CHECK ((public.auth_user_id() IS NOT NULL));


--
-- Name: car_records car_records_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_records_select_authenticated ON public.car_records FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: car_records car_records_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_records_update_authenticated ON public.car_records FOR UPDATE USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: cars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

--
-- Name: cars cars_delete_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_delete_owner_only ON public.cars FOR DELETE USING ((public.auth_role() = 'owner'::text));


--
-- Name: cars cars_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_insert_authenticated ON public.cars FOR INSERT WITH CHECK ((public.auth_user_id() IS NOT NULL));


--
-- Name: cars cars_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_select_authenticated ON public.cars FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: cars cars_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_update_authenticated ON public.cars FOR UPDATE USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: clients clients_delete_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_delete_owner_only ON public.clients FOR DELETE USING ((public.auth_role() = 'owner'::text));


--
-- Name: clients clients_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_insert_authenticated ON public.clients FOR INSERT WITH CHECK ((public.auth_user_id() IS NOT NULL));


--
-- Name: clients clients_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_select_authenticated ON public.clients FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: clients clients_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_update_authenticated ON public.clients FOR UPDATE USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings company_settings_insert_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_settings_insert_owner_only ON public.company_settings FOR INSERT WITH CHECK ((public.auth_role() = 'owner'::text));


--
-- Name: company_settings company_settings_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_settings_select_authenticated ON public.company_settings FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: company_settings company_settings_update_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_settings_update_owner_only ON public.company_settings FOR UPDATE USING ((public.auth_role() = 'owner'::text));


--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories expense_categories_delete_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_categories_delete_owner_only ON public.expense_categories FOR DELETE USING ((public.auth_role() = 'owner'::text));


--
-- Name: expense_categories expense_categories_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_categories_insert_authenticated ON public.expense_categories FOR INSERT WITH CHECK ((public.auth_user_id() IS NOT NULL));


--
-- Name: expense_categories expense_categories_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_categories_select_authenticated ON public.expense_categories FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: expense_categories expense_categories_update_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_categories_update_owner_only ON public.expense_categories FOR UPDATE USING ((public.auth_role() = 'owner'::text));


--
-- Name: salary_withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salary_withdrawals ENABLE ROW LEVEL SECURITY;

--
-- Name: salary_withdrawals salary_withdrawals_delete_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_withdrawals_delete_authenticated ON public.salary_withdrawals FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: salary_withdrawals salary_withdrawals_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_withdrawals_insert_authenticated ON public.salary_withdrawals FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: salary_withdrawals salary_withdrawals_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_withdrawals_select_authenticated ON public.salary_withdrawals FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: salary_withdrawals salary_withdrawals_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_withdrawals_update_authenticated ON public.salary_withdrawals FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: service_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;

--
-- Name: service_events service_events_delete_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_events_delete_authenticated ON public.service_events FOR DELETE USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: service_events service_events_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_events_insert_authenticated ON public.service_events FOR INSERT WITH CHECK ((public.auth_user_id() IS NOT NULL));


--
-- Name: service_events service_events_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_events_select_authenticated ON public.service_events FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: service_events service_events_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_events_update_authenticated ON public.service_events FOR UPDATE USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_insert_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_owner_only ON public.users FOR INSERT WITH CHECK ((public.auth_role() = 'owner'::text));


--
-- Name: users users_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_authenticated ON public.users FOR SELECT USING ((public.auth_user_id() IS NOT NULL));


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE USING ((public.auth_user_id() = id));


--
-- PostgreSQL database dump complete
--

\unrestrict KOJfkD1KwbgRAVmkLGRG7xPCHedkH35E12ipau9sdsmV2tTKWyxSTKbqz5MubOl

