-- ============================================================
-- Миграция 007: Исправление monthly_stats — исключение первичных расходов
-- 
-- ПРОБЛЕМА:
-- При создании машины первичные расходы (Страховка, Шины, Прочее) записываются 
-- в car_records с notes = 'Первичная подготовка к запуску авто ...'.
-- VIEW monthly_stats не фильтровал эти записи, поэтому они попадали 
-- в "Расходы за месяц" на дашборде.
-- 
-- РЕШЕНИЕ:
-- Добавлен фильтр r.notes NOT LIKE 'Первичная подготовка%' 
-- для исключения первичных расходов из всех агрегированных полей.
-- 
-- ВЛИЯНИЕ:
-- - total_other: исключаем Прочее из первичной подготовки
-- - total_expense: сумма расходов теперь НЕ включает первичные расходы
-- - total_profit: прибыль считается корректно (без первичных расходов)
-- ============================================================

CREATE OR REPLACE VIEW monthly_stats AS
SELECT r.car_id,
    c.name AS car_name,
    c.color_tag,
    date_trunc('month'::text, r.record_date::timestamp with time zone) AS month,
    count(*) FILTER (WHERE r.record_type <> 'buyout'::text) AS records_count,
    count(*) FILTER (WHERE r.rental_amount > 0::numeric AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text]))) AS rented_days,
    count(*) FILTER (WHERE r.rental_amount = 0::numeric AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text]))) AS idle_days,
    COALESCE(sum(r.rental_amount) FILTER (WHERE r.record_type <> ALL (ARRAY['buyout'::text, 'buyout_payment'::text])), 0::numeric) + COALESCE(sum(
        CASE
            WHEN r.record_type = 'buyout_payment'::text AND r.buyout_data IS NOT NULL THEN r.rental_amount * (((r.buyout_data ->> 'profitPercent'::text)::numeric) / (100::numeric + ((r.buyout_data ->> 'profitPercent'::text)::numeric)))
            WHEN r.record_type = 'buyout_payment'::text THEN 0::numeric
            ELSE 0::numeric
        END), 0::numeric) AS total_rental,
    COALESCE(sum(r.service_cost) FILTER (WHERE r.notes NOT LIKE 'Первичная подготовка%'), 0::numeric) AS total_service,
    COALESCE(sum(r.other_cost) FILTER (WHERE r.notes NOT LIKE 'Первичная подготовка%' AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) OR ec.name IS NULL), 0::numeric) AS total_other,
    COALESCE(sum(r.service_cost) FILTER (WHERE r.notes NOT LIKE 'Первичная подготовка%'), 0::numeric) + COALESCE(sum(r.other_cost) FILTER (WHERE r.notes NOT LIKE 'Первичная подготовка%' AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) OR ec.name IS NULL), 0::numeric) AS total_expense,
    COALESCE(sum(r.rental_amount) FILTER (WHERE r.record_type <> ALL (ARRAY['buyout'::text, 'buyout_payment'::text])), 0::numeric) + COALESCE(sum(
        CASE
            WHEN r.record_type = 'buyout_payment'::text AND r.buyout_data IS NOT NULL THEN r.rental_amount * (((r.buyout_data ->> 'profitPercent'::text)::numeric) / (100::numeric + ((r.buyout_data ->> 'profitPercent'::text)::numeric)))
            WHEN r.record_type = 'buyout_payment'::text THEN 0::numeric
            ELSE 0::numeric
        END), 0::numeric) - COALESCE(sum(r.service_cost) FILTER (WHERE r.notes NOT LIKE 'Первичная подготовка%'), 0::numeric) - COALESCE(sum(r.other_cost) FILTER (WHERE r.notes NOT LIKE 'Первичная подготовка%' AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) OR ec.name IS NULL), 0::numeric) AS total_profit,
    round(count(*) FILTER (WHERE r.rental_amount > 0::numeric AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])))::numeric / NULLIF(count(*) FILTER (WHERE r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])), 0)::numeric * 100::numeric, 1) AS occupancy_percent
   FROM car_records r
     JOIN cars c ON c.id = r.car_id
     LEFT JOIN expense_categories ec ON ec.id = r.expense_category_id
  GROUP BY r.car_id, c.name, c.color_tag, (date_trunc('month'::text, r.record_date::timestamp with time zone));