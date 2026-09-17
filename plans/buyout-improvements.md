# План доработок: Логика выкупа

> Создано: 2026-05-20
> Статус: На согласовании

---

## P0 — Критические (баги и безопасность данных)

### 1. Защита от дубля договора на одну машину

**Проблема:** Можно создать 2+ активных договора выкупа на одну и ту же машину.

**Решение:** В `RecordModal.tsx` перед созданием договора — запросить наличие активного `buyout` на этот `carId`. Если есть — показать предупреждение и заблокировать создание.

**Файлы:**
- `src/api/records.ts` — добавить функцию `getActiveBuyoutByCarId(carId: string)`
- `src/components/features/RecordModal.tsx` — вызов проверки перед submit, блокировка кнопки

---

### 2. Статус машины при создании выкупа

**Проблема:** При оформлении выкупа машина остаётся в текущем статусе (`free`, `rented` и тд). Не видно что она в выкупе.

**Решение:** Добавить статус `buyout` в `CarStatus`. При создании договора — ставить `status: 'buyout'`.

**Файлы:**
- `src/types/index.ts` — `CarStatus = 'rented' | 'free' | 'service' | 'inactive' | 'buyout'`
- `src/constants/index.ts` — добавить `buyout` в `CAR_STATUS_LABELS`, `CAR_STATUS_COLORS`, `CAR_STATUS_CONFIG`, `TIMELINE_DAY_CONFIG`
- `src/components/features/RecordModal.tsx` — после создания записи вызывать `updateCarStatus(carId, 'buyout')`
- `src/components/ui/StatusBadge.tsx` — добавить отображение нового статуса

---

### 3. Статус машины при закрытии выкупа

**Проблема:** 
- При `closed_cancelled` — машина возвращается в `free` (уже работает)
- При `closed_completed` — машина остаётся `buyout` навсегда

**Решение:** Добавить статус `bought` (выкуплена). При `closed_completed` — ставить `status: 'bought'`.

**Файлы:**
- `src/types/index.ts` — `CarStatus = '...' | 'buyout' | 'bought'`
- `src/constants/index.ts` — добавить `bought` в словари
- `src/pages/Finance.tsx` — в `handleClose()` при `closed_completed` вызывать `updateCarStatus(carId, 'bought')`
- `src/components/ui/StatusBadge.tsx` — добавить отображение

---

## P1 — Серьёзные (гибкость и контроль)

### 4. Удаление платежей по выкупу

**Проблема:** Нельзя удалить ошибочный платёж. В истории платежей нет кнопки удаления.

**Решение:** Добавить кнопку удаления рядом с каждым платежом в `BuyoutContractCard`. Удаление с confirm.

**Файлы:**
- `src/api/records.ts` — добавить `deleteBuyoutPayment(paymentId: string)`
- `src/hooks/useRecords.ts` — добавить `useDeleteBuyoutPayment()`
- `src/pages/Finance.tsx` — в блоке истории платежей добавить кнопку 🗑 с confirm

---

### 5. Просрочка платежей

**Проблема:** Система не показывает просрочку. Владелец не видит что клиент не платит.

**Решение:** Рассчитывать ожидаемое количество платежей на основе `startDate` + `paymentDay` + текущей даты. Сравнивать с фактическим `totalPaid`. Показывать бейдж просрочки.

**Логика:**
```
monthsPassed = кол-во месяцев с startDate по сейчас
expectedPaid = monthsPassed × monthlyPayment
debt = expectedPaid - totalPaid
if debt > 0 → показать "Просрочка: X ₽"
```

**Файлы:**
- `src/pages/Finance.tsx` — в `BuyoutContractCard` добавить расчёт и отображение просрочки
- `src/utils/calc.ts` — добавить `calcBuyoutDebt()`

---

### 6. Платежи выкупа в общей кассе

**Проблема:** Платежи `buyout_payment` исключены из журнала, кассы, статистики. Владелец не видит эти деньги в общем балансе.

**Решение:** Включить `buyout_payment` в `cash_flow` view и в расчёт кассы. В журнале показывать с пометкой `[Выкуп]`.

**Файлы:**
- `src/api/records.ts` — убрать исключение `buyout_payment` из `getRecordsByMonth()` (или добавить отдельный параметр)
- `src/api/finance.ts` — убедиться что `buyout_payment` учитывается в `cashFlow`
- `src/pages/Journal.tsx` — показывать записи `buyout_payment` с бейджем `[Выкуп]`
- БД: проверить что view `cash_flow` включает `buyout_payment`

---

## P2 — Улучшения UX

### 7. Редактирование параметров договора

**Проблема:** Нельзя изменить `monthlyPayment`, `termMonths`, `buyoutPrice` после создания. Только даты.

**Решение:** Добавить режим редактирования параметров в карточку договора (аналогично редактированию дат). Сохранять через `updateBuyoutContractParams()`.

**Файлы:**
- `src/api/records.ts` — добавить `updateBuyoutContractParams(recordId, params)`
- `src/hooks/useRecords.ts` — добавить `useUpdateBuyoutContractParams()`
- `src/pages/Finance.tsx` — UI редактирования в `BuyoutContractCard`

---

### 8. График платежей (помесячный)

**Проблема:** Нет визуального понимания какие месяцы оплачены, какие нет.

**Решение:** Добавить мини-таймлайн как в аренде — помесячный. Зелёный = оплачен, красный = просрочен, серый = будущий.

**Файлы:**
- `src/pages/Finance.tsx` — новый компонент `BuyoutPaymentTimeline` внутри `BuyoutContractCard`
- `src/utils/calc.ts` — функция расчёта статуса каждого месяца

---

### 9. Учёт залога при закрытии

**Проблема:** При расторжении неясно что с залогом. При завершении — залог не переходит в зачёт.

**Решение:** При закрытии показывать модалку с вариантами:
- `closed_cancelled`: «Вернуть залог: Да/Нет/Частично»
- `closed_completed`: «Залог зачтён в выкупную цену»

**Файлы:**
- `src/pages/Finance.tsx` — модалка при закрытии с опциями по залогу
- `src/types/index.ts` — расширить `BuyoutData` полями `depositReturned`, `depositReturnedAmount`

---

## Порядок реализации

```
P0.1 → Защита от дубля договора
P0.2 → Новый статус "buyout" при создании
P0.3 → Новый статус "bought" при завершении
P1.4 → Удаление платежей
P1.5 → Просрочка платежей
P1.6 → Платежи в кассе
P2.7 → Редактирование параметров
P2.8 → График платежей
P2.9 → Учёт залога
```

---

## Новые статусы машин — итоговая схема

| Статус | Когда | Цвет | Лейбл |
|---|---|---|---|
| `free` | Свободна | Серый | Свободна |
| `rented` | В аренде | Зелёный | Сдана |
| `service` | На ТО | Оранжевый | На ТО |
| `buyout` | Активный договор выкупа | Синий/Фиолетовый | Выкуп |
| `bought` | Выкуплена клиентом | Бирюзовый | Выкуплена |
| `inactive` | Неактивна | Красный | Неактивна |
