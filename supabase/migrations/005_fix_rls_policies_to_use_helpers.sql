-- ============================================
-- MIGRATION: 005_fix_rls_policies_to_use_helpers
-- Description: Обновляет RLS политики на использование auth_user_id() и auth_role()
--              которые читают из request.jwt.claims (устанавливается PostgREST при валидации JWT)
-- ============================================

-- Cars
DROP POLICY IF EXISTS "cars_select_all" ON public.cars;
DROP POLICY IF EXISTS "cars_select_authenticated" ON public.cars;
DROP POLICY IF EXISTS "cars_insert_authenticated" ON public.cars;
DROP POLICY IF EXISTS "cars_update_authenticated" ON public.cars;
DROP POLICY IF EXISTS "cars_delete_owner_only" ON public.cars;

CREATE POLICY "cars_select_authenticated" ON public.cars
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "cars_insert_authenticated" ON public.cars
  FOR INSERT WITH CHECK (auth_user_id() IS NOT NULL);

CREATE POLICY "cars_update_authenticated" ON public.cars
  FOR UPDATE USING (auth_user_id() IS NOT NULL);

CREATE POLICY "cars_delete_owner_only" ON public.cars
  FOR DELETE USING (auth_role() = 'owner');

-- Car Records
DROP POLICY IF EXISTS "car_records_select_all" ON public.car_records;
DROP POLICY IF EXISTS "car_records_select_authenticated" ON public.car_records;
DROP POLICY IF EXISTS "car_records_insert_authenticated" ON public.car_records;
DROP POLICY IF EXISTS "car_records_update_authenticated" ON public.car_records;
DROP POLICY IF EXISTS "car_records_delete_owner_only" ON public.car_records;

CREATE POLICY "car_records_select_authenticated" ON public.car_records
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "car_records_insert_authenticated" ON public.car_records
  FOR INSERT WITH CHECK (auth_user_id() IS NOT NULL);

CREATE POLICY "car_records_update_authenticated" ON public.car_records
  FOR UPDATE USING (auth_user_id() IS NOT NULL);

CREATE POLICY "car_records_delete_owner_only" ON public.car_records
  FOR DELETE USING (auth_role() = 'owner');

-- Expense Categories
DROP POLICY IF EXISTS "expense_categories_select_all" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_select_authenticated" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert_authenticated" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_update_owner_only" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_delete_owner_only" ON public.expense_categories;

CREATE POLICY "expense_categories_select_authenticated" ON public.expense_categories
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "expense_categories_insert_authenticated" ON public.expense_categories
  FOR INSERT WITH CHECK (auth_user_id() IS NOT NULL);

CREATE POLICY "expense_categories_update_owner_only" ON public.expense_categories
  FOR UPDATE USING (auth_role() = 'owner');

CREATE POLICY "expense_categories_delete_owner_only" ON public.expense_categories
  FOR DELETE USING (auth_role() = 'owner');

-- Salary Withdrawals
DROP POLICY IF EXISTS "salary_withdrawals_select_all" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "salary_withdrawals_select_authenticated" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "salary_withdrawals_insert_owner_only" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "salary_withdrawals_update_owner_only" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "salary_withdrawals_delete_owner_only" ON public.salary_withdrawals;

CREATE POLICY "salary_withdrawals_select_authenticated" ON public.salary_withdrawals
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "salary_withdrawals_insert_owner_only" ON public.salary_withdrawals
  FOR INSERT WITH CHECK (auth_role() = 'owner');

CREATE POLICY "salary_withdrawals_update_owner_only" ON public.salary_withdrawals
  FOR UPDATE USING (auth_role() = 'owner');

CREATE POLICY "salary_withdrawals_delete_owner_only" ON public.salary_withdrawals
  FOR DELETE USING (auth_role() = 'owner');

-- Service Events
DROP POLICY IF EXISTS "service_events_select_all" ON public.service_events;
DROP POLICY IF EXISTS "service_events_select_authenticated" ON public.service_events;
DROP POLICY IF EXISTS "service_events_insert_authenticated" ON public.service_events;
DROP POLICY IF EXISTS "service_events_update_authenticated" ON public.service_events;
DROP POLICY IF EXISTS "service_events_delete_authenticated" ON public.service_events;

CREATE POLICY "service_events_select_authenticated" ON public.service_events
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "service_events_insert_authenticated" ON public.service_events
  FOR INSERT WITH CHECK (auth_user_id() IS NOT NULL);

CREATE POLICY "service_events_update_authenticated" ON public.service_events
  FOR UPDATE USING (auth_user_id() IS NOT NULL);

CREATE POLICY "service_events_delete_authenticated" ON public.service_events
  FOR DELETE USING (auth_user_id() IS NOT NULL);

-- Company Settings
DROP POLICY IF EXISTS "company_settings_select_all" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_select_authenticated" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_update_owner_only" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_insert_owner_only" ON public.company_settings;

CREATE POLICY "company_settings_select_authenticated" ON public.company_settings
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "company_settings_update_owner_only" ON public.company_settings
  FOR UPDATE USING (auth_role() = 'owner');

CREATE POLICY "company_settings_insert_owner_only" ON public.company_settings
  FOR INSERT WITH CHECK (auth_role() = 'owner');

-- Clients
DROP POLICY IF EXISTS "clients_select_all" ON public.clients;
DROP POLICY IF EXISTS "clients_select_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_update_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_owner_only" ON public.clients;

CREATE POLICY "clients_select_authenticated" ON public.clients
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "clients_insert_authenticated" ON public.clients
  FOR INSERT WITH CHECK (auth_user_id() IS NOT NULL);

CREATE POLICY "clients_update_authenticated" ON public.clients
  FOR UPDATE USING (auth_user_id() IS NOT NULL);

CREATE POLICY "clients_delete_owner_only" ON public.clients
  FOR DELETE USING (auth_role() = 'owner');

-- Users
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_owner_only" ON public.users;

CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_user_id() = id);

CREATE POLICY "users_insert_owner_only" ON public.users
  FOR INSERT WITH CHECK (auth_role() = 'owner');
