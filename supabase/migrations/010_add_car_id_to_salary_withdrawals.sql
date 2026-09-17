-- ============================================================
-- 010_add_car_id_to_salary_withdrawals
-- Добавляет car_id в salary_withdrawals для привязки выплат к машинам
-- NULL = выплата по всем машинам
-- ============================================================

-- Добавляем колонку car_id (nullable)
ALTER TABLE salary_withdrawals
ADD COLUMN IF NOT EXISTS car_id UUID REFERENCES cars(id) ON DELETE SET NULL;

-- Добавляем комментарий
COMMENT ON COLUMN salary_withdrawals.car_id IS 'ID машины для привязки выплаты. NULL = выплата по всем машинам.';

-- Добавляем индекс для быстрого поиска по машине и месяцу
CREATE INDEX IF NOT EXISTS idx_salary_withdrawals_car_id ON salary_withdrawals(car_id) WHERE car_id IS NOT NULL;

-- Обновляем RLS политику для нового поля (если нужно)
-- Политика уже позволяет владельцу видеть все записи, так что просто убедимся что всё работает