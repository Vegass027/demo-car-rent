-- 008_fix_buyout_profit_calculation
-- Исправляет расчёт прибыли от выкупа:
-- - Для monthly_stats: показывать ТОЛЬКО чистую прибыль (30% от платежа)
-- - Для recoupment/окупаемости: полная сумма (100%) - считается отдельно

DROP VIEW IF EXISTS monthly_stats;

CREATE OR REPLACE VIEW monthly_stats AS
WITH recoup_tracking AS (
    SELECT 
        r.car_id,
        date_trunc('month', r.record_date::timestamp) AS month,
        SUM(
            CASE 
                WHEN r.record_type = 'buyout_payment'::text AND r.buyout_data IS NOT NULL 
                THEN r.rental_amount  -- Полная сумма платежа идёт на окупаемость
                WHEN r.record_type IN ('normal', 'booking') THEN r.rental_amount
                ELSE 0
            END
        ) AS recoup_amount
    FROM car_records r
    WHERE r.rental_amount > 0
    GROUP BY r.car_id, date_trunc('month', r.record_date::timestamp)
)
SELECT 
    r.car_id,
    c.name AS car_name,
    c.color_tag,
    date_trunc('month'::text, r.record_date::timestamp with time zone) AS month,
    count(*) FILTER (WHERE r.record_type <> 'buyout'::text) AS records_count,
    count(*) FILTER (WHERE r.rental_amount > 0::numeric AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text]))) AS rented_days,
    count(*) FILTER (WHERE r.rental_amount = 0::numeric AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text]))) AS idle_days,
    
    -- TOTAL_RENTAL: Для выкупа показываем ТОЛЬКО чистую прибыль (30%), для обычной аренды - полную сумму
    COALESCE(sum(r.rental_amount) FILTER (WHERE r.record_type NOT IN ('buyout'::text, 'buyout_payment'::text)), 0::numeric) 
    + COALESCE(sum(
        CASE
            WHEN r.record_type = 'buyout_payment'::text AND r.buyout_data IS NOT NULL 
            THEN r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text)::numeric) / 100::numeric  -- 30% = чистая прибыль
            WHEN r.record_type = 'buyout_payment'::text THEN 0::numeric
            ELSE 0::numeric
        END), 0::numeric) AS total_rental,
    
    -- SERVICE: только не-подготовка
    COALESCE(sum(r.service_cost) FILTER (WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text), 0::numeric) AS total_service,
    
    -- OTHER: исключаем страховку и шины
    COALESCE(sum(r.other_cost) FILTER (
        WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text 
        AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) 
        OR ec.name IS NULL
    ), 0::numeric) AS total_other,
    
    -- TOTAL_EXPENSE = service + other (без подготовки, страховки, шин)
    COALESCE(sum(r.service_cost) FILTER (WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text), 0::numeric) 
    + COALESCE(sum(r.other_cost) FILTER (
        WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text 
        AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) 
        OR ec.name IS NULL
    ), 0::numeric) AS total_expense,
    
    -- TOTAL_PROFIT = total_rental - total_expense
    COALESCE(sum(r.rental_amount) FILTER (WHERE r.record_type NOT IN ('buyout'::text, 'buyout_payment'::text)), 0::numeric) 
    + COALESCE(sum(
        CASE
            WHEN r.record_type = 'buyout_payment'::text AND r.buyout_data IS NOT NULL 
            THEN r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text)::numeric) / 100::numeric
            WHEN r.record_type = 'buyout_payment'::text THEN 0::numeric
            ELSE 0::numeric
        END), 0::numeric)
    - COALESCE(sum(r.service_cost) FILTER (WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text), 0::numeric) 
    - COALESCE(sum(r.other_cost) FILTER (
        WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text 
        AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) 
        OR ec.name IS NULL
    ), 0::numeric) AS total_profit,
    
    -- OCCUPANCY_PERCENT
    round(
        count(*) FILTER (WHERE r.rental_amount > 0::numeric AND (r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])))::numeric 
        / NULLIF(count(*) FILTER (WHERE r.record_type = ANY (ARRAY['normal'::text, 'booking'::text])), 0)::numeric * 100::numeric, 1
    ) AS occupancy_percent,
    
    -- RECOUP_AMOUNT: полная сумма для окупаемости (100% платежа)
    COALESCE(rt.recoup_amount, 0::numeric) AS recoup_amount
    
FROM car_records r
JOIN cars c ON c.id = r.car_id
LEFT JOIN expense_categories ec ON ec.id = r.expense_category_id
LEFT JOIN recoup_tracking rt ON rt.car_id = r.car_id 
    AND date_trunc('month', rt.month) = date_trunc('month', r.record_date::timestamp)
GROUP BY r.car_id, c.name, c.color_tag, (date_trunc('month'::text, r.record_date::timestamp with time zone)), rt.recoup_amount;