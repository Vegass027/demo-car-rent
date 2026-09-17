-- Добавляем категорию "Другое" для операционных расходов
-- (не путать с "Прочее" — та используется для первичной подготовки)
INSERT INTO expense_categories (name, icon, color, is_system)
VALUES ('Другое', '📌', '#9CA3AF', true)
ON CONFLICT DO NOTHING;
