-- Добавляем поле purchase_date для корректного расчёта занятости и ROI
ALTER TABLE public.cars ADD COLUMN purchase_date date;