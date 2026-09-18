// ============================================================
// API: ЗАПИСИ АРЕНДЫ И РАСХОДОВ
// Все запросы к таблице car_records
// snake_case из БД → camelCase в приложении
// ============================================================

import { getClient } from '@/lib/api-client'
import { formatDateISO } from '@/utils/format'
import { PREPARATION_CATEGORY_NAMES, PREPARATION_NOTES } from '@/constants'
import { getExpenseCategoryByName } from '@/api/categories'
import { addToPreparationCost } from '@/api/cars'
import type { CarRecord, CarRecordWithCar, RecordFormData, TimelineDay, DayType, BuyoutData, BuyoutStatus, Client } from '@/types'

// Маппинг полей из snake_case в camelCase
function mapRecordFromDb(row: Record<string, unknown>): CarRecord {
  return {
    id: row.id as string,
    carId: row.car_id as string,
    recordDate: row.record_date as string,
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    rentalAmount: Number(row.rental_amount) || 0,
    serviceCost: Number(row.service_cost) || 0,
    otherCost: Number(row.other_cost) || 0,
    deposit: Number(row.deposit) || 0,
    expenseCategoryId: row.expense_category_id as string | null,
    clientId: row.client_id as string | null,
    renterName: row.renter_name as string | null,
    renterPhone: row.renter_phone as string | null,
    notes: row.notes as string | null,
    recordType: (row.record_type as CarRecord['recordType']) || 'normal',
    buyoutData: (row.buyout_data as BuyoutData | null) || null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Маппинг записи с данными машины
function mapRecordWithCarFromDb(row: Record<string, unknown>): CarRecordWithCar {
  const record = mapRecordFromDb(row)
  const car = row.cars as Record<string, unknown> | null
  const category = row.expense_categories as Record<string, unknown> | null

  return {
    ...record,
    car: car ? {
      id: car.id as string,
      name: car.name as string,
      licensePlate: car.license_plate as string,
      colorTag: car.color_tag as string,
    } : {
      id: record.carId,
      name: 'Неизвестно',
      licensePlate: '',
      colorTag: '#6B7280',
    },
    expenseCategory: category ? {
      id: category.id as string,
      name: category.name as string,
      icon: category.icon as string | null,
      color: category.color as string,
      isSystem: category.is_system as boolean,
      createdAt: category.created_at as string,
    } : null,
  }
}

// Маппинг в snake_case для БД
function mapRecordToDb(record: RecordFormData): Record<string, unknown> {
  return {
    car_id: record.carId,
    record_date: record.recordDate,
    start_date: record.startDate || null,
    end_date: record.endDate || null,
    rental_amount: record.rentalAmount || 0,
    service_cost: record.serviceCost || 0,
    other_cost: record.otherCost || 0,
    deposit: record.deposit || 0,
    expense_category_id: record.expenseCategoryId || null,
    client_id: record.clientId || null,
    renter_name: record.renterName || null,
    renter_phone: record.renterPhone || null,
    notes: record.notes || null,
    record_type: record.recordType || 'normal',
    buyout_data: record.buyoutData || null,
  }
}

// Получить записи за месяц для конкретной машины (ВСЕ типы, включая buyout_payment)
// buyout (договор выкупа) исключается — он не является доходом/расходом
// buyout_payment (платежи) включаются — они дают 30% прибыли
// Используется для расчёта прибыли в карточке авто
export async function getAllRecordsByCarForStats(carId: string, year: number, month: number): Promise<CarRecord[]> {
  const monthStart = formatDateISO(year, month, 1)
  const monthEnd = formatDateISO(year, month, new Date(year, month, 0).getDate())

  const { data, error } = await getClient()
    .from('car_records')
    .select('*')
    .eq('car_id', carId)
    .gte('record_date', monthStart)
    .lte('record_date', monthEnd)
    .not('record_type', 'in', '("buyout")')
    .order('record_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(mapRecordFromDb)
}

// Получить записи за месяц для конкретной машины (без договоров выкупа и платежей)
// Используется для журнала и отображения
export async function getRecordsByCar(carId: string, year: number, month: number): Promise<CarRecord[]> {
  const monthStart = formatDateISO(year, month, 1)
  const monthEnd = formatDateISO(year, month, new Date(year, month, 0).getDate())

  const { data, error } = await getClient()
    .from('car_records')
    .select('*')
    .eq('car_id', carId)
    .gte('record_date', monthStart)
    .lte('record_date', monthEnd)
    .not('record_type', 'in', '("buyout","buyout_payment")')
    .order('record_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(mapRecordFromDb)
}

// Получить все записи за месяц (для журнала)
export async function getRecordsByMonth(year: number, month: number): Promise<CarRecordWithCar[]> {
  const monthStart = formatDateISO(year, month, 1)
  const monthEnd = formatDateISO(year, month, new Date(year, month, 0).getDate())

  const { data, error } = await getClient()
    .from('car_records')
    .select(`
      *,
      cars (id, name, license_plate, color_tag),
      expense_categories (id, name, icon, color, is_system, created_at)
    `)
    .gte('record_date', monthStart)
    .lte('record_date', monthEnd)
    .order('record_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(mapRecordWithCarFromDb)
}

// Получить последние N записей (для дашборда)
export async function getRecentRecords(limit: number = 10): Promise<CarRecordWithCar[]> {
  const { data, error } = await getClient()
    .from('car_records')
    .select(`
      *,
      cars (id, name, license_plate, color_tag),
      expense_categories (id, name, icon, color, is_system, created_at)
    `)
    .order('record_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data || []).map(mapRecordWithCarFromDb)
}

// Получить таймлайн занятости для машины
export async function getCarTimeline(carId: string, year: number, month: number): Promise<TimelineDay[]> {
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart = formatDateISO(year, month, 1)
  const monthEnd = formatDateISO(year, month, daysInMonth)

  // Запрашиваем записи с диапазонами дат
  const { data, error } = await getClient()
    .from('car_records')
    .select('record_date, start_date, end_date, rental_amount, service_cost, other_cost, record_type, buyout_data')
    .eq('car_id', carId)
    // Записи, которые попадают в месяц (по record_date ИЛИ по диапазону)
    .or(`record_date.gte.${monthStart},record_date.lte.${monthEnd},and(start_date.lte.${monthEnd},end_date.gte.${monthStart})`)

  if (error) throw new Error(error.message)

  // Создаём мапу по датам с учётом диапазонов
  const recordsByDate: Record<string, { rental: number; expense: number }> = {}
  
  for (const record of data || []) {
    // Договоры выкупа и платежи по выкупу не отображаются в таймлайне
    if (record.record_type === 'buyout' || record.record_type === 'buyout_payment') continue

    const rentalAmount = Number(record.rental_amount) || 0
    const expenseAmount = (Number(record.service_cost) || 0) + (Number(record.other_cost) || 0)
    
    // Если есть диапазон дат — распределяем по всем дням диапазона
    if (record.start_date && record.end_date) {
      const startDate = new Date(record.start_date as string + 'T12:00:00')
      const endDate = new Date(record.end_date as string + 'T12:00:00')
      
      // Считаем количество дней в диапазоне
      const daysCount = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const rentalPerDay = rentalAmount / daysCount
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateISO(d.getFullYear(), d.getMonth() + 1, d.getDate())
        // Только если дата в текущем месяце
        if (dateStr >= monthStart && dateStr <= monthEnd) {
          if (!recordsByDate[dateStr]) {
            recordsByDate[dateStr] = { rental: 0, expense: 0 }
          }
          recordsByDate[dateStr].rental += rentalPerDay
          // Расходы записываем только на первый день диапазона
          if (dateStr === record.start_date) {
            recordsByDate[dateStr].expense += expenseAmount
          }
        }
      }
    } else if (record.record_date) {
      // Одиночная запись
      const date = record.record_date as string
      if (!recordsByDate[date]) {
        recordsByDate[date] = { rental: 0, expense: 0 }
      }
      recordsByDate[date].rental += rentalAmount
      recordsByDate[date].expense += expenseAmount
    }
  }

  // Формируем массив всех дней месяца
  const timeline: TimelineDay[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const record = recordsByDate[date]
    
    let type: DayType = 'empty'
    if (record) {
      if (record.rental > 0) {
        // Если есть аренда - всегда считаем как "сдан", даже если есть расход
        type = 'rented'
      } else if (record.expense > 0) {
        type = 'expense'
      } else {
        type = 'idle'
      }
    }

    timeline.push({
      date,
      type,
      rentalAmount: record?.rental || 0,
      expenseAmount: record?.expense || 0,
    })
  }

  return timeline
}

// Получить запись по ID
export async function getRecordById(id: string): Promise<CarRecord | null> {
  const { data, error } = await getClient()
    .from('car_records')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data ? mapRecordFromDb(data) : null
}

// Создать новую запись (insert без перезаписи существующих)
// Используется для операционных расходов (НЕ первичная подготовка)
export async function createRecord(record: RecordFormData, userId?: string): Promise<CarRecord> {
  const dbRecord: Record<string, unknown> = {
    ...mapRecordToDb(record),
    created_by: userId || null,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .insert(dbRecord)
    .select()
    .single()

  if (error) throw new Error(error.message)
  
  return mapRecordFromDb(data)
}

// Обновить существующую запись по ID
export async function updateRecord(id: string, record: RecordFormData, userId?: string): Promise<CarRecord> {
  const dbRecord: Record<string, unknown> = {
    ...mapRecordToDb(record),
    created_by: userId || null,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .update(dbRecord)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}

// Создать или обновить запись (upsert по car_id + record_date)
// ВАЖНО: Использовать только для аренды, где нужна одна запись на день!
// Для расходов используйте createRecord чтобы не перезаписывать существующие
export async function upsertRecord(record: RecordFormData, userId?: string): Promise<CarRecord> {
  const dbRecord: Record<string, unknown> = {
    ...mapRecordToDb(record),
    created_by: userId || null,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .upsert(dbRecord, {
      onConflict: 'car_id,record_date',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}

// Удалить запись
export async function deleteRecord(id: string): Promise<void> {
  const { error } = await getClient()
    .from('car_records')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// Удалить расход с обновлением preparation_cost (если Страховка или Шины)
export async function deleteExpenseRecord(id: string): Promise<void> {
  // Сначала получаем запись, чтобы узнать категорию и сумму
  const record = await getRecordById(id)
  if (!record) throw new Error('Запись не найдена')

  // Удаляем запись
  await deleteRecord(id)

  // Если категория = Страховка или Шины → вычесть из preparation_cost
  if (record.expenseCategoryId && record.otherCost > 0) {
    const insuranceCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[0])
    const tiresCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[1])

    if (
      (insuranceCategory && record.expenseCategoryId === insuranceCategory.id) ||
      (tiresCategory && record.expenseCategoryId === tiresCategory.id)
    ) {
      // Вычитаем из preparation_cost (отрицательное число)
      await addToPreparationCost(record.carId, -record.otherCost)
    }
  }
}

// Удалить бронирование (просто удаляет запись, без обновления preparation_cost)
export async function deleteBookingRecord(id: string): Promise<void> {
  await deleteRecord(id)
}

// Получить занятые даты для машины (для блокировки в календаре)
export async function getBookedDates(carId: string, year: number, month: number): Promise<Set<string>> {
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // Добавляем запас в несколько дней с обеих сторон
  const searchStartDate = new Date(year, month - 1, 1 - 7) // 7 дней до начала месяца
  const searchEndDate = new Date(year, month - 1, daysInMonth + 7) // 7 дней после конца месяца
  
  const searchStart = formatDateISO(searchStartDate.getFullYear(), searchStartDate.getMonth() + 1, searchStartDate.getDate())
  const searchEnd = formatDateISO(searchEndDate.getFullYear(), searchEndDate.getMonth() + 1, searchEndDate.getDate())

  const { data, error } = await getClient()
    .from('car_records')
    .select('start_date, end_date, record_date, record_type, buyout_data')
    .eq('car_id', carId)
    .not('rental_amount', 'eq', 0) // Только записи с арендой
    .or(`start_date.gte.${searchStart},record_date.gte.${searchStart}`)
    .or(`end_date.lte.${searchEnd},record_date.lte.${searchEnd}`)

  if (error) {
    console.error('Ошибка получения занятых дат:', error)
    return new Set()
  }

  const bookedDates = new Set<string>()
  
  for (const record of data || []) {
    // Договоры выкупа и платежи по выкупу не блокируют даты в календаре
    if (record.record_type === 'buyout' || record.record_type === 'buyout_payment') continue
    // Если есть диапазон — добавляем все даты диапазона
    if (record.start_date && record.end_date) {
      // Парсим даты как локальные (добавляем время чтобы избежать UTC-сдвига)
      const startDate = new Date(record.start_date as string + 'T12:00:00')
      const endDate = new Date(record.end_date as string + 'T12:00:00')
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Форматируем без UTC-сдвига
        bookedDates.add(formatDateISO(d.getFullYear(), d.getMonth() + 1, d.getDate()))
      }
    } else if (record.record_date) {
      // Одиночная дата
      bookedDates.add(record.record_date as string)
    }
  }

  return bookedDates
}

// Получить историю расходов по машине (с категориями)
export async function getExpenseRecordsByCar(carId: string): Promise<CarRecordWithCar[]> {
  const { data, error } = await getClient()
    .from('car_records')
    .select(`
      *,
      cars (id, name, license_plate, color_tag),
      expense_categories (id, name, icon, color, is_system, created_at)
    `)
    .eq('car_id', carId)
    .or('service_cost.gt.0,other_cost.gt.0')
    .order('record_date', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data || []).map(mapRecordWithCarFromDb)
}

// Создать запись расхода на первичную подготовку
// Записи получают notes = PREPARATION_NOTES и плюсуются к preparation_cost
export async function createPreparationRecord(
  carId: string,
  category: 'insurance' | 'tires' | 'other',
  amount: number,
  comment?: string
): Promise<CarRecord> {
  const { PREPARATION_CATEGORY_NAMES, PREPARATION_NOTES } = await import('@/constants')
  const { getExpenseCategoryByName } = await import('@/api/categories')

  const categoryName = category === 'insurance'
    ? PREPARATION_CATEGORY_NAMES[0]
    : category === 'tires'
      ? PREPARATION_CATEGORY_NAMES[1]
      : PREPARATION_CATEGORY_NAMES[2]

  const expenseCategory = await getExpenseCategoryByName(categoryName)
  if (!expenseCategory) throw new Error(`Категория "${categoryName}" не найдена`)

  const notes = comment
    ? `${PREPARATION_NOTES} ${comment}`
    : PREPARATION_NOTES

  const { data, error } = await getClient()
    .from('car_records')
    .insert({
      car_id: carId,
      record_date: new Date().toISOString().split('T')[0],
      rental_amount: 0,
      service_cost: 0,
      other_cost: amount,
      expense_category_id: expenseCategory.id,
      notes,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Добавляем к preparation_cost машины
  await addToPreparationCost(carId, amount)

  return mapRecordFromDb(data)
}

// Удалить запись первичной подготовки с обновлением preparation_cost
export async function deletePreparationRecord(id: string): Promise<void> {
  const record = await getRecordById(id)
  if (!record) throw new Error('Запись не найдена')

  await deleteRecord(id)

  // Вычитаем из preparation_cost
  const amount = record.otherCost || record.serviceCost || 0
  if (amount > 0) {
    await addToPreparationCost(record.carId, -amount)
  }
}

// Получить записи первичной подготовки по машине
export async function getPreparationRecordsByCar(carId: string): Promise<CarRecordWithCar[]> {
  const { PREPARATION_NOTES } = await import('@/constants')

  const { data, error } = await getClient()
    .from('car_records')
    .select(`
      *,
      cars (id, name, license_plate, color_tag),
      expense_categories (id, name, icon, color, is_system, created_at)
    `)
    .eq('car_id', carId)
    .like('notes', `${PREPARATION_NOTES}%`)
    .order('record_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(mapRecordWithCarFromDb)
}

// Тип для расходов по категориям
export interface ExpenseByCategory {
  categoryId: string | null
  categoryName: string
  categoryColor: string
  categoryIcon: string | null
  totalAmount: number
  percent: number
}

// Получить расходы по категориям (для PieChart/BarChart)
// Исключает записи первичной подготовки (notes начинается с PREPARATION_NOTES)
export async function getExpensesByCategory(options?: {
  carId?: string | null      // null или undefined = все машины
  year?: number              // если не указан — всё время
  month?: number             // если не указан — весь год или всё время
}): Promise<ExpenseByCategory[]> {
  let query = getClient()
    .from('car_records')
    .select(`
      service_cost,
      other_cost,
      expense_category_id,
      record_date,
      notes,
      expense_categories (id, name, icon, color)
    `)

  // Фильтр по машине
  if (options?.carId) {
    query = query.eq('car_id', options.carId)
  }

  // Фильтр по периоду
  if (options?.year && options?.month) {
    const monthStart = formatDateISO(options.year, options.month, 1)
    const monthEnd = formatDateISO(options.year, options.month, new Date(options.year, options.month, 0).getDate())
    query = query.gte('record_date', monthStart).lte('record_date', monthEnd)
  } else if (options?.year) {
    const yearStart = `${options.year}-01-01`
    const yearEnd = `${options.year + 1}-01-01`
    query = query.gte('record_date', yearStart).lt('record_date', yearEnd)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  // Агрегируем по категориям, исключая записи первичной подготовки
  const categoryTotals: Record<string, {
    name: string
    color: string
    icon: string | null
    amount: number
  }> = {}

  let totalExpense = 0

  for (const record of data || []) {
    // Пропускаем записи первичной подготовки
    const recordNotes = record.notes as string | null
    if (recordNotes && recordNotes.startsWith(PREPARATION_NOTES)) continue

    const serviceCost = Number(record.service_cost) || 0
    const otherCost = Number(record.other_cost) || 0
    const expense = serviceCost + otherCost

    if (expense === 0) continue

    totalExpense += expense

    const category = record.expense_categories as unknown as Record<string, unknown> | null
    const categoryId = category?.id as string || 'uncategorized'
    const categoryName = category?.name as string || 'Без категории'
    const categoryColor = category?.color as string || '#6B7280'
    const categoryIcon = category?.icon as string | null

    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = {
        name: categoryName,
        color: categoryColor,
        icon: categoryIcon,
        amount: 0,
      }
    }
    categoryTotals[categoryId].amount += expense
  }

  // Преобразуем в массив и считаем проценты
  const result: ExpenseByCategory[] = Object.entries(categoryTotals)
    .map(([categoryId, data]) => ({
      categoryId: categoryId === 'uncategorized' ? null : categoryId,
      categoryName: data.name,
      categoryColor: data.color,
      categoryIcon: data.icon,
      totalAmount: data.amount,
      percent: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  return result
}

// ============================================================
// ВЫКУП: договоры и платежи
// ============================================================

// Договор выкупа с данными машины, платежами и клиентом
export interface BuyoutContractWithDetails {
  record: CarRecordWithCar
  payments: CarRecord[]
  totalPaid: number
  paymentsCount: number
  client: Client | null
}

// Получить все активные договоры выкупа с платежами
export async function getBuyoutContracts(): Promise<BuyoutContractWithDetails[]> {
  // Получаем все buyout-договоры с join к клиентам
  const { data: contracts, error: contractsError } = await getClient()
    .from('car_records')
    .select(`
      *,
      cars (id, name, license_plate, color_tag),
      expense_categories (id, name, icon, color, is_system, created_at),
      clients (id, last_name, first_name, middle_name, full_name, phone, birth_date, passport_series, passport_number, passport_issued_by, passport_issue_date, registration_address, driver_license_series, driver_license_number, notes, created_at, updated_at)
    `)
    .eq('record_type', 'buyout')
    .order('record_date', { ascending: false })

  if (contractsError) throw new Error(contractsError.message)

  // Получаем все buyout_payment записи
  const { data: payments, error: paymentsError } = await getClient()
    .from('car_records')
    .select('*')
    .eq('record_type', 'buyout_payment')
    .order('record_date', { ascending: false })

  if (paymentsError) throw new Error(paymentsError.message)

  // Группируем платежи по buyoutRecordId
  const paymentsByContract: Record<string, CarRecord[]> = {}
  for (const p of payments || []) {
    const mapped = mapRecordFromDb(p)
    const contractId = mapped.buyoutData?.buyoutRecordId
    if (contractId) {
      if (!paymentsByContract[contractId]) {
        paymentsByContract[contractId] = []
      }
      paymentsByContract[contractId].push(mapped)
    }
  }

  // Собираем результат
  return (contracts || []).map(contractRow => {
    const record = mapRecordWithCarFromDb(contractRow)
    const contractPayments = paymentsByContract[record.id] || []
    const totalPaid = contractPayments.reduce((sum, p) => sum + p.rentalAmount, 0)

    // Маппим клиента из join-данных
    const clientRow = contractRow.clients as Record<string, unknown> | null
    const client: Client | null = clientRow ? {
      id: clientRow.id as string,
      lastName: clientRow.last_name as string || '',
      firstName: clientRow.first_name as string || '',
      middleName: clientRow.middle_name as string | null,
      fullName: clientRow.full_name as string,
      phone: clientRow.phone as string | null,
      birthDate: clientRow.birth_date as string | null,
      passportSeries: clientRow.passport_series as string | null,
      passportNumber: clientRow.passport_number as string | null,
      passportIssuedBy: clientRow.passport_issued_by as string | null,
      passportIssueDate: clientRow.passport_issue_date as string | null,
      registrationAddress: clientRow.registration_address as string | null,
      driverLicenseSeries: clientRow.driver_license_series as string | null,
      driverLicenseNumber: clientRow.driver_license_number as string | null,
      notes: clientRow.notes as string | null,
      createdAt: clientRow.created_at as string,
      updatedAt: clientRow.updated_at as string,
    } : null

    return {
      record,
      payments: contractPayments,
      totalPaid,
      paymentsCount: contractPayments.length,
      client,
    }
  })
}

// Внести платёж по договору выкупа
export async function createBuyoutPayment(params: {
  buyoutRecordId: string
  carId: string
  amount: number
  paymentDate: string
  notes?: string
}): Promise<CarRecord> {
  // Получаем основной договор чтобы взять данные
  const contract = await getRecordById(params.buyoutRecordId)
  if (!contract) throw new Error('Договор выкупа не найден')

  const dbRecord: Record<string, unknown> = {
    car_id: params.carId,
    client_id: contract.clientId || null,
    record_date: params.paymentDate,
    rental_amount: params.amount,
    service_cost: 0,
    other_cost: 0,
    deposit: 0,
    record_type: 'buyout_payment',
    buyout_data: {
      buyoutRecordId: params.buyoutRecordId,
      profitPercent: contract.buyoutData?.profitPercent || 0,
    },
    notes: params.notes || `Платёж по выкупу`,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .insert(dbRecord)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}

// Обновить статус договора выкупа (завершить / закрыть досрочно)
export async function updateBuyoutContractStatus(
  recordId: string,
  status: BuyoutStatus
): Promise<CarRecord> {
  const current = await getRecordById(recordId)
  if (!current) throw new Error('Договор не найден')
  if (!current.buyoutData) throw new Error('Данные выкупа не найдены')

  const updatedBuyoutData: BuyoutData = {
    ...current.buyoutData,
    status,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .update({ buyout_data: updatedBuyoutData })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}

// Обновить даты договора выкупа
export async function updateBuyoutContractDates(
  recordId: string,
  startDate: string,
  endDate: string
): Promise<CarRecord> {
  const { data, error } = await getClient()
    .from('car_records')
    .update({
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}

// Проверить, есть ли активный договор выкупа на машину
export async function getActiveBuyoutByCarId(carId: string): Promise<CarRecord | null> {
  const { data, error } = await getClient()
    .from('car_records')
    .select('*')
    .eq('car_id', carId)
    .eq('record_type', 'buyout')
    .in('buyout_data->>status', ['active', null])
    .limit(1)

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return null
  return mapRecordFromDb(data[0])
}

// Удалить платёж по выкупу
export async function deleteBuyoutPayment(paymentId: string): Promise<void> {
  const { error } = await getClient()
    .from('car_records')
    .delete()
    .eq('id', paymentId)
    .eq('record_type', 'buyout_payment')

  if (error) throw new Error(error.message)
}

// Обновить данные о залоге в договоре выкупа
export async function updateBuyoutContractDeposit(
  recordId: string,
  depositReturned: boolean,
  depositReturnedAmount: number
): Promise<CarRecord> {
  const current = await getRecordById(recordId)
  if (!current) throw new Error('Договор не найден')
  if (!current.buyoutData) throw new Error('Данные выкупа не найдены')

  const updatedBuyoutData: BuyoutData = {
    ...current.buyoutData,
    depositReturned,
    depositReturnedAmount,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .update({ buyout_data: updatedBuyoutData })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}

// Обновить параметры договора выкупа (срок, стоимость авто, % прибыли)
export async function updateBuyoutContractParams(
  recordId: string,
  params: {
    termMonths: number
    monthlyPayment: number
    buyoutPrice: number
    carPrice?: number
    profitPercent?: number
    startDate: string
    endDate: string
  }
): Promise<CarRecord> {
  const current = await getRecordById(recordId)
  if (!current) throw new Error('Договор не найден')
  if (!current.buyoutData) throw new Error('Данные выкупа не найдены')

  const updatedBuyoutData: BuyoutData = {
    ...current.buyoutData,
    termMonths: params.termMonths,
    monthlyPayment: params.monthlyPayment,
    buyoutPrice: params.buyoutPrice,
    carPrice: params.carPrice ?? current.buyoutData.carPrice ?? 0,
    profitPercent: params.profitPercent ?? current.buyoutData.profitPercent ?? 0,
  }

  const { data, error } = await getClient()
    .from('car_records')
    .update({
      buyout_data: updatedBuyoutData,
      rental_amount: params.monthlyPayment,
      start_date: params.startDate,
      end_date: params.endDate,
    })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRecordFromDb(data)
}
