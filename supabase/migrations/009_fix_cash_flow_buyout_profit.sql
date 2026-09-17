-- 009_fix_cash_flow_buyout_profit
-- Исправляет cash_flow для соответствия monthly_stats:
-- - buyout_payment: теперь только ЧИСТАЯ прибыль (30%)

DROP VIEW IF EXISTS cash_flow;

CREATE OR REPLACE VIEW cash_flow AS
SELECT 
    -- TOTAL_INCOME: Для выкупа показываем ТОЛЬКО чистую прибыль (30%), для обычной аренды - полную сумму
    COALESCE(sum(r.rental_amount) FILTER (WHERE r.record_type NOT IN ('buyout'::text, 'buyout_payment'::text)), 0::numeric) 
    + COALESCE(sum(
        CASE
            WHEN r.record_type = 'buyout_payment'::text AND r.buyout_data IS NOT NULL 
            THEN r.rental_amount * ((r.buyout_data ->> 'profitPercent'::text)::numeric) / 100::numeric  -- 30% = чистая прибыль
            WHEN r.record_type = 'buyout_payment'::text THEN 0::numeric
            ELSE 0::numeric
        END), 0::numeric) AS total_income,
    
    -- TOTAL_EXPENSE: все расходы кроме подготовки, страховки, шин
    COALESCE(sum(r.service_cost) FILTER (WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text), 0::numeric) 
    + COALESCE(sum(r.other_cost) FILTER (
        WHERE COALESCE(r.notes, ''::text) !~~ 'Первичная подготовка%'::text 
        AND (ec.name <> ALL (ARRAY['Страховка'::text, 'Шины'::text])) 
        OR ec.name IS NULL
    ), 0::numeric) AS total_expense,
    
    -- TOTAL_SALARY: выводы зарплаты
    COALESCE((SELECT sum(amount) FROM salary_withdrawals), 0::numeric) AS total_salary,
    
    -- BALANCE = доход - расходы - зарплата
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
    ), 0::numeric)
    - COALESCE((SELECT sum(amount) FROM salary_withdrawals), 0::numeric) AS balance
    
FROM car_records r
LEFT JOIN expense_categories ec ON ec.id = r.expense_category_id;